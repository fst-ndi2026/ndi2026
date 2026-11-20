// Stockage : PostgreSQL si DATABASE_URL est défini, sinon mémoire (démo sans base).
import pg from "pg";

const url = process.env.DATABASE_URL;
const pool = url ? new pg.Pool({ connectionString: url }) : null;

const memory = [
  { id: 1, title: "Bienvenue", body: "Premier élément de démonstration" },
];

// Villages de démonstration pour que le podium ne soit jamais vide.
const scores = new Map([
  ["Lycée Carnot", 820], ["Collège Les Dunes", 760], ["École Jean Moulin", 640],
  ["Lycée Victor Hugo", 380], ["Collège Ibn Khaldoun", 290],
]);

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
      "INSERT INTO items (title, body) VALUES ($1, $2) RETURNING id, title, body", [title, body]);
    return rows[0];
  },
  async topScores(limit = 10) {
    if (!pool) {
      return [...scores.entries()].map(([village, points]) => ({ village, points }))
        .sort((a, b) => b.points - a.points).slice(0, limit);
    }
    const { rows } = await pool.query(
      "SELECT village, points FROM scores ORDER BY points DESC LIMIT $1", [limit]);
    return rows;
  },
  async saveScore({ village, points }) {
    if (!pool) {
      scores.set(village, Math.max(points, scores.get(village) ?? 0));
      return { village, points: scores.get(village) };
    }
    const { rows } = await pool.query(
      `INSERT INTO scores (village, points) VALUES ($1, $2)
       ON CONFLICT (village) DO UPDATE SET points = GREATEST(scores.points, EXCLUDED.points), updated_at = now()
       RETURNING village, points`, [village, points]);
    return rows[0];
  },
};
