// Budget de poids (gzip). Deux limites :
//  - INITIAL : ce que charge toute visite (index.html + fichiers qu'il référence) → BUDGET_KB (150 par défaut)
//  - À LA DEMANDE : chaque morceau chargé plus tard (jeu, 3D…) → LAZY_KB par morceau (200 par défaut)
// Usage : npm run build && npm run budget
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";

const dir = "apps/web/dist";
const limit = Number(process.env.BUDGET_KB ?? 150);
const lazyLimit = Number(process.env.LAZY_KB ?? 200);
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    statSync(p).isDirectory() ? walk(p) : files.push(p);
  }
})(dir);
const html = readFileSync(join(dir, "index.html"), "utf8");
const initialRefs = new Set([...html.matchAll(/(?:src|href)="\/?([^"]+\.(?:js|css))"/g)].map((m) => m[1]));
const kb = (f) => gzipSync(readFileSync(f)).length / 1024;
let initial = 0, lazy = 0, failed = false;
for (const f of files.filter((f) => /\.(js|css|html|svg|json)$/.test(f))) {
  const rel = relative(dir, f).replaceAll("\\", "/");
  const size = kb(f);
  const isInitial = rel === "index.html" || initialRefs.has(rel) || !/\.(js|css)$/.test(rel);
  if (isInitial) initial += size; else lazy += size;
  const over = !isInitial && size > lazyLimit;
  if (over) failed = true;
  console.log(`${size.toFixed(1).padStart(7)} Ko  ${isInitial ? "initial " : "demande "} ${rel}${over ? "  ← dépasse " + lazyLimit + " Ko" : ""}`);
}
console.log(`Chargé à chaque visite : ${initial.toFixed(1)} Ko (budget ${limit} Ko)`);
console.log(`Chargé seulement à la demande : ${lazy.toFixed(1)} Ko (au plus ${lazyLimit} Ko par morceau)`);
if (initial > limit) { console.error("Budget de poids initial dépassé."); failed = true; }
if (failed) process.exit(1);
