// Stockage : PostgreSQL si DATABASE_URL est défini, sinon mémoire (démo sans base).
import pg from "pg";

const url = process.env.DATABASE_URL;
const pool = url ? new pg.Pool({ connectionString: url }) : null;

const memory = [
  { id: 1, title: "Bienvenue", body: "Premier élément de démonstration" },
  { id: 2, title: "Nuit de l'Info 2026", body: "Template de l'équipe FST" },
];

const memoryUsers = [];

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
  async findUserByEmail(email) {
    if (!pool) return memoryUsers.find((u) => u.email === email) ?? null;
    const { rows } = await pool.query("SELECT id, email FROM users WHERE email = $1", [email]);
    return rows[0] ?? null;
  },
  async createUser({ fullName, email, github, filiere, passwordHash }) {
    if (!pool) {
      const user = { id: memoryUsers.length + 1, fullName, email, github, filiere, passwordHash };
      memoryUsers.push(user);
      return { id: user.id, fullName, email, github, filiere };
    }
    const { rows } = await pool.query(
      `INSERT INTO users (full_name, email, github, filiere, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name AS "fullName", email, github, filiere`,
      [fullName, email, github, filiere, passwordHash]
    );
    return rows[0];
  },
};
