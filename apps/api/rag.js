// Recherche simple dans la base de connaissances (fonctionne sans réseau ni modèle).
import kb from "./kb.json" with { type: "json" };

const STOP = new Set("le la les un une des de du d l et ou a à au aux en pour par sur dans est ce cette ces qui que quoi quel quelle comment pourquoi nos vos mon ma mes ton ta tes son sa ses il elle on nous vous je tu y ne pas plus se s qu c".split(" "));
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const words = (s) => new Set(norm(s).match(/[a-z0-9]+/g)?.filter((w) => w.length > 2 && !STOP.has(w)) ?? []);

export function search(question, k = 2) {
  const q = words(question);
  return kb
    .map((d) => {
      const t = words(d.titre + " " + d.texte);
      let s = 0;
      for (const w of q) if (t.has(w)) s += 1;
      for (const w of q) if (words(d.titre).has(w)) s += 1;
      return { d, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map((x) => x.d);
}

export { kb };
