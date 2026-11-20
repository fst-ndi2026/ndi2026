import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { z } from "zod";
import { store } from "./store.js";
import { ask, aiConfigured, kbSize } from "./ai.js";
import { PERSONA_IDS } from "../../shared/rafiq/personas.js";
import { estimatePassword } from "../../shared/password.js";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1); // derrière le proxy de Vercel / Render
app.use(helmet());
if (process.env.WEB_ORIGIN) app.use(cors({ origin: process.env.WEB_ORIGIN }));
app.use(express.json({ limit: "100kb" }));
app.use("/api", rateLimit({ windowMs: 60_000, limit: 120 }));

app.get("/api/health", async (_req, res) => {
  const db = await store.ping().then(() => "ok", () => "error");
  res.status(db === "ok" ? 200 : 503).json({ ok: db === "ok", store: store.mode, db, ai: aiConfigured() });
});

app.get("/api/items", async (_req, res, next) => {
  try { res.json(await store.list()); } catch (e) { next(e); }
});

const itemSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().max(2000).default(""),
});
app.post("/api/items", async (req, res, next) => {
  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  try { res.status(201).json(await store.create(parsed.data)); } catch (e) { next(e); }
});

// Inscription : mot de passe haché avec scrypt (sel aléatoire), jamais renvoyé.
const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  github: z.string().trim().regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/).optional().or(z.literal("")),
  filiere: z.string().trim().max(80).default(""),
  password: z.string().min(8).max(128).refine((p) => estimatePassword(p).accepted),
  acceptTerms: z.literal(true),
});
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}
app.post("/api/register", rateLimit({ windowMs: 60_000, limit: 10 }), async (req, res, next) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input", fields: parsed.error.issues.map((i) => i.path[0]) });
  }
  const { fullName, email, github, filiere, password } = parsed.data;
  try {
    if (await store.findUserByEmail(email)) return res.status(409).json({ error: "email_taken" });
    const user = await store.createUser({
      fullName, email, github: github || null, filiere, passwordHash: hashPassword(password),
    });
    res.status(201).json(user);
  } catch (e) {
    if (e?.code === "23505") return res.status(409).json({ error: "email_taken" });
    next(e);
  }
});

// Rafiq : question + personnalité ; les questions sans réponse sont gardées (sans identité) pour enrichir les fiches.
const askSchema = z.object({
  question: z.string().trim().min(1).max(500),
  persona: z.enum(PERSONA_IDS).default("serieux"),
});
app.post("/api/ask", rateLimit({ windowMs: 60_000, limit: 20 }), async (req, res, next) => {
  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  try {
    const out = await ask(parsed.data.question, parsed.data.persona);
    if (!out.found) await store.logUnanswered(parsed.data.question).catch(() => {});
    res.json(out);
  } catch (e) { next(e); }
});
// Formulaire augmenté : un schéma par mission, anti-spam invisible (pot de miel + délai minimum), débit limité.
const base = { name: z.string().trim().min(2).max(100), email: z.string().trim().toLowerCase().email().max(254), website: z.string().max(0).optional(), elapsed: z.number().min(3000) };
const demandeSchema = z.discriminatedUnion("mission", [
  z.object({ mission: z.literal("contact"), ...base, message: z.string().trim().min(5).max(2000) }),
  z.object({ mission: z.literal("don"), ...base, amount: z.number().min(1).max(10000), frequency: z.enum(["once", "monthly"]) }),
  z.object({ mission: z.literal("benevole"), ...base, phone: z.string().trim().regex(/^\+?\d{8,15}$/).optional().or(z.literal("")),
    skills: z.array(z.string().max(40)).min(1).max(5) }),
  z.object({ mission: z.literal("info"), ...base, topic: z.string().trim().min(2).max(60) }),
]);
app.post("/api/demandes", rateLimit({ windowMs: 60_000, limit: 5 }), async (req, res, next) => {
  const parsed = demandeSchema.safeParse(req.body);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path[0]);
    if (fields.includes("website") || fields.includes("elapsed")) return res.status(422).json({ error: "spam" });
    return res.status(400).json({ error: "invalid_input", fields });
  }
  const { mission, website: _w, elapsed: _e, ...data } = parsed.data;
  try {
    const { id, count } = await store.addDemande(mission, data);
    const year = new Date().getFullYear();
    res.status(201).json({ ref: `FST-${year}-${String(id).padStart(4, "0")}`, count, year });
  } catch (e) { next(e); }
});

// Jeu caché : meilleurs scores (3 lettres, aucune donnée personnelle).
const scoreSchema = z.object({ name: z.string().regex(/^[A-Z]{3}$/), score: z.number().int().min(0).max(100000) });
app.get("/api/scores", async (_req, res, next) => {
  try { res.json(await store.topScores(10)); } catch (e) { next(e); }
});
app.post("/api/scores", rateLimit({ windowMs: 60_000, limit: 10 }), async (req, res, next) => {
  const parsed = scoreSchema.safeParse({ ...req.body, name: String(req.body?.name ?? "").toUpperCase() });
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  try { await store.addScore(parsed.data); res.status(201).json(await store.topScores(10)); } catch (e) { next(e); }
});
app.get("/api/rafiq/stats", async (_req, res, next) => {
  try { res.json({ fiches: kbSize(), sansReponse: await store.countUnanswered(), ai: aiConfigured() }); } catch (e) { next(e); }
});

// Compteurs publics (agrégés, sans donnée personnelle) pour le village 3D.
app.get("/api/village", async (_req, res, next) => {
  try {
    const [demandes, sansReponse] = await Promise.all([store.countDemandes(), store.countUnanswered()]);
    res.set("cache-control", "no-store").json({ demandes, sansReponse, fiches: kbSize() });
  } catch (e) { next(e); }
});

app.use("/api", (_req, res) => res.status(404).json({ error: "not_found" }));

// Plan B : un seul service qui sert aussi le front (après npm run build).
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "../web/dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.use((_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.use((err, _req, res, _next) => {
  console.error(err?.name ?? "Error", err?.message ?? ""); // jamais le corps de la requête
  res.status(500).json({ error: "server_error" });
});

export default app;
