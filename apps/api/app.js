import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { store } from "./store.js";
import { ask } from "./ai.js";

const app = express();
app.disable("x-powered-by");
app.use(helmet());
if (process.env.WEB_ORIGIN) app.use(cors({ origin: process.env.WEB_ORIGIN }));
app.use(express.json({ limit: "100kb" }));
app.use("/api", rateLimit({ windowMs: 60_000, limit: 120 }));

app.get("/api/health", (_req, res) => res.json({ ok: true, store: store.mode }));

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
  console.error(err);
  res.status(500).json({ error: "server_error" });
});

export default app;
