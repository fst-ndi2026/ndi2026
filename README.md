# Équipe FST - Nuit de l'Info 2026

> Template de départ de l'équipe FST (Université de Nouakchott), à adapter au sujet national.

**Démo en ligne** : à compléter · **Dépôt** : à compléter

## Fonctionnalités
- Interface React bilingue français / arabe (RTL)
- API Express : validation (zod), en-têtes de sécurité (helmet), limitation de débit
- Stockage PostgreSQL, ou en mémoire si aucune base n'est configurée
- Assistant avec réponse de secours si l'IA est indisponible
- Page « Défis » : exigences et preuves de chaque défi
- Accessibilité : clavier, focus visible, lien d'évitement, labels, contrastes AA
- Éco-conception : polices système, poids de la page affiché

## Lancer en local (Windows / Linux / macOS)
1. `copy .env.example .env` (Windows) ou `cp .env.example .env`
2. `npm install`
3. Terminal 1 : `npm run dev:api` · Terminal 2 : `npm run dev:web`
4. Ouvrir http://localhost:5173

PostgreSQL (optionnel) : `docker compose up -d db`, puis
`DATABASE_URL=postgres://ndi:ndi_dev_only@localhost:5432/ndi` dans `.env`.

## Mise en ligne en un seul service
`npm install && npm run build && npm start` : l'API sert aussi le front.

## Architecture
- `apps/web` : React + Vite + TypeScript
- `apps/api` : Express (seul point d'entrée des données ; les clés restent côté serveur)
- `db/init` : schéma SQL et données d'exemple

## Défis relevés
Voir la page `/defis` de l'application (`apps/web/src/data/defis.json`).

## Tests
`npm test` (vitest + supertest) · `scripts/smoke.sh https://url-en-ligne`

## Licence
MIT (voir `LICENSE`). Ressources tierces et crédits : page `/credits`.

## Équipe
À compléter (prénoms et rôles).
- Abdellahi : développeur front
