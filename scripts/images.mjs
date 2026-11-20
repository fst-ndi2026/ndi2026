// Convertit les images de apps/web/public/images (png, jpg) en WebP redimensionné.
// Usage : npm run images   (largeur max : variable MAX_W, 1200 par défaut)
import { readdirSync, statSync } from "node:fs";
import { join, parse } from "node:path";
import sharp from "sharp";

const dir = "apps/web/public/images";
const maxW = Number(process.env.MAX_W ?? 1200);
let files = [];
try { files = readdirSync(dir).filter((f) => /\.(png|jpe?g)$/i.test(f)); } catch { console.log(`Dossier ${dir} absent : rien à convertir.`); }
for (const f of files) {
  const src = join(dir, f);
  const out = join(dir, parse(f).name + ".webp");
  await sharp(src).resize({ width: maxW, withoutEnlargement: true }).webp({ quality: 72 }).toFile(out);
  const before = statSync(src).size / 1024, after = statSync(out).size / 1024;
  console.log(`${f} : ${before.toFixed(0)} Ko → ${after.toFixed(0)} Ko (WebP)`);
}
