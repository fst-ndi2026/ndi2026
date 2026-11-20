// Budget de poids : échoue si le front construit dépasse la limite (compressé gzip).
// Usage : npm run build && npm run budget   (limite : variable BUDGET_KB, 150 par défaut)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const dir = "apps/web/dist";
const limit = Number(process.env.BUDGET_KB ?? 150);
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    statSync(p).isDirectory() ? walk(p) : files.push(p);
  }
})(dir);
let total = 0;
for (const f of files.filter((f) => /\.(js|css|html|svg|json)$/.test(f))) {
  const kb = gzipSync(readFileSync(f)).length / 1024;
  total += kb;
  console.log(`${kb.toFixed(1).padStart(7)} Ko  ${f}`);
}
console.log(`Total compressé : ${total.toFixed(1)} Ko (budget ${limit} Ko)`);
if (total > limit) { console.error("Budget de poids dépassé."); process.exit(1); }
