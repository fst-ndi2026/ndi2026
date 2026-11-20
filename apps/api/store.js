// Stockage : PostgreSQL si DATABASE_URL est défini, sinon mémoire (démo sans base).
import pg from "pg";

const url = process.env.DATABASE_URL;
const pool = url ? new pg.Pool({ connectionString: url }) : null;

const memory = [
  { id: 1, title: "Bienvenue", body: "Premier élément de démonstration" },
  { id: 2, title: "Nuit de l'Info 2026", body: "Template de l'équipe FST" },
];

export const store = {
  mode: pool ? "postgres" : "memory",
  async list() {
    if (!pool) return memory;
    const { rows } = await pool.query("SELECT id, title, body FROM items ORDER BY id");
    return rows;
  },
  async create({ title, body }) {
    if (!pool) {
      const item = { id: memory.length + 1, title, body };
      memory.push(item);
      return item;
    }
    const { rows } = await pool.query(
      "INSERT INTO items (title, body) VALUES ($1, $2) RETURNING id, title, body",
      [title, body]
    );
    return rows[0];
  },
};
