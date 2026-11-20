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
import { ask } from "./ai.js";
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
  res.status(db === "ok" ? 200 : 503).json({ ok: db === "ok", store: store.mode, db });
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

const askSchema = z.object({ question: z.string().trim().min(1).max(500) });
app.post("/api/ask", async (req, res) => {
  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  res.json(await ask(parsed.data.question));
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
