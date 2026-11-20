CREATE TABLE IF NOT EXISTS items (
  id         SERIAL PRIMARY KEY,
  title      VARCHAR(120) NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO items (title, body) VALUES
  ('Bienvenue', 'Premier élément de démonstration'),
  ('Nuit de l''Info 2026', 'Template de l''équipe FST');
