CREATE TABLE IF NOT EXISTS items (
  id         SERIAL PRIMARY KEY,
  title      VARCHAR(120) NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO items (title, body) VALUES
  ('Bienvenue', 'Premier élément de démonstration'),
  ('Nuit de l''Info 2026', 'Template de l''équipe FST');

CREATE TABLE IF NOT EXISTS scores (
  village    VARCHAR(40) PRIMARY KEY,
  points     INTEGER NOT NULL CHECK (points BETWEEN 0 AND 10000),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scores_points ON scores (points DESC);
