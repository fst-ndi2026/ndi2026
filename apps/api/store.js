// Stockage : PostgreSQL si DATABASE_URL est défini, sinon mémoire (démo sans base).
import pg from "pg";

// Vercel + Neon fournit DATABASE_URL (connexion « pooled », TLS exigé).
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const pool = url ? new pg.Pool({ connectionString: url, max: 3, idleTimeoutMillis: 10_000 }) : null;

// Crée les tables au premier accès (idempotent) : aucune étape manuelle sur une base neuve.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  github VARCHAR(39),
  filiere VARCHAR(80) NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS questions_sans_reponse (
  id SERIAL PRIMARY KEY,
  question VARCHAR(300) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS arcade_scores (
  id SERIAL PRIMARY KEY,
  name CHAR(3) NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS demandes (
  id SERIAL PRIMARY KEY,
  mission VARCHAR(20) NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO items (title, body)
  SELECT * FROM (VALUES ('Bienvenue', 'Premier élément de démonstration'), ('Nuit de l''Info 2026', 'Template de l''équipe FST')) AS v(title, body)
  WHERE NOT EXISTS (SELECT 1 FROM items);
`;
let ready = null;
async function db() {
  ready ??= pool.query(SCHEMA).catch((e) => { ready = null; throw e; });
  await ready;
  return pool;
}

const memory = [
  { id: 1, title: "Bienvenue", body: "Premier élément de démonstration" },
  { id: 2, title: "Nuit de l'Info 2026", body: "Template de l'équipe FST" },
];

const memoryUsers = [];
const memoryUnanswered = [];
const memoryScores = [];
const memoryDemandes = [];
// Retire adresses e-mail et numéros avant de garder une question.
const scrub = (q) => q.replace(/[^\s@]+@[^\s@]+/g, "[e-mail]").replace(/\+?\d[\d\s.-]{6,}\d/g, "[numéro]").slice(0, 300);

export const store = {
  mode: pool ? "postgres" : "memory",
  async ping() {
    if (!pool) return true;
    await (await db()).query("SELECT 1");
    return true;
  },
  async list() {
    if (!pool) return memory;
    const { rows } = await (await db()).query("SELECT id, title, body FROM items ORDER BY id");
    return rows;
  },
  async create({ title, body }) {
    if (!pool) {
      const item = { id: memory.length + 1, title, body };
      memory.push(item);
      return item;
    }
    const { rows } = await (await db()).query(
      "INSERT INTO items (title, body) VALUES ($1, $2) RETURNING id, title, body",
      [title, body]
    );
    return rows[0];
  },
  async addDemande(mission, data) {
    const year = new Date().getFullYear();
    if (!pool) {
      memoryDemandes.push({ mission, data, year });
      return { id: memoryDemandes.length, count: memoryDemandes.filter((d) => d.mission === mission && d.year === year).length };
    }
    const { rows } = await (await db()).query("INSERT INTO demandes (mission, data) VALUES ($1, $2) RETURNING id", [mission, data]);
    const c = await (await db()).query(
      "SELECT count(*)::int AS n FROM demandes WHERE mission = $1 AND date_part('year', created_at) = $2", [mission, year]);
    return { id: rows[0].id, count: c.rows[0].n };
  },
  async topScores(limit = 10) {
    if (!pool) return [...memoryScores].sort((a, b) => b.score - a.score).slice(0, limit);
    const { rows } = await (await db()).query("SELECT name, score FROM arcade_scores ORDER BY score DESC, created_at ASC LIMIT $1", [limit]);
    return rows;
  },
  async addScore({ name, score }) {
    if (!pool) { memoryScores.push({ name, score }); return; }
    await (await db()).query("INSERT INTO arcade_scores (name, score) VALUES ($1, $2)", [name, score]);
  },
  async logUnanswered(question) {
    const q = scrub(question);
    if (!pool) { memoryUnanswered.push(q); return; }
    await (await db()).query("INSERT INTO questions_sans_reponse (question) VALUES ($1)", [q]);
  },
  async countUnanswered() {
    if (!pool) return memoryUnanswered.length;
    const { rows } = await (await db()).query("SELECT count(*)::int AS n FROM questions_sans_reponse");
    return rows[0].n;
  },
  async findUserByEmail(email) {
    if (!pool) return memoryUsers.find((u) => u.email === email) ?? null;
    const { rows } = await (await db()).query("SELECT id, email FROM users WHERE email = $1", [email]);
    return rows[0] ?? null;
  },
  async createUser({ fullName, email, github, filiere, passwordHash }) {
    if (!pool) {
      const user = { id: memoryUsers.length + 1, fullName, email, github, filiere, passwordHash };
      memoryUsers.push(user);
      return { id: user.id, fullName, email, github, filiere };
    }
    const { rows } = await (await db()).query(
      `INSERT INTO users (full_name, email, github, filiere, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name AS "fullName", email, github, filiere`,
      [fullName, email, github, filiere, passwordHash]
    );
    return rows[0];
  },
};
