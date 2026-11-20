// Recherche dans les fiches de Rafiq (français et arabe), sans réseau ni modèle.
import KB from "./kb.json" with { type: "json" };
import { PERSONAS } from "./personas.js";

export const kb = KB;
const STOP = new Set(("le la les un une des de du d l et ou a au aux en pour par sur dans est ce cette ces qui que quoi quel quelle " +
  "comment pourquoi nos vos mon ma mes ton ta tes son sa ses il elle on nous vous je tu y ne pas plus se s qu c site " +
  "في من على الى إلى عن ما ماذا هل هو هي هذا هذه كيف لماذا أن ان او أو مع كل التي الذي").split(" "));

// Normalisation : minuscules, sans accents ; en arabe sans voyelles, alif/ya/ta marbuta unifiés, sans « ال ».
export function normalize(s) {
  return s.toLowerCase().replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627").replace(/\u0649/g, "\u064A").replace(/\u0629/g, "\u0647")
    .replace(/\u0624/g, "\u0648").replace(/\u0626/g, "\u064A")
    .normalize("NFD").replace(/[\u0300-\u036f\u064B-\u065F\u0640]/g, "");
}
export function tokens(s) {
  return (normalize(s).match(/[a-z0-9]+|[\u0621-\u064A]+/g) ?? [])
    .map((w) => (/^[ء-ي]/.test(w) && w.startsWith("ال") && w.length > 4 ? w.slice(2) : w))
    .filter((w) => w.length > 1 && !STOP.has(w));
}
export const isArabic = (s) => /[؀-ۿ]/.test(s);

const docs = KB.map((d) => ({
  d,
  title: new Set(tokens(`${d.titre.fr} ${d.titre.ar}`)),
  body: tokens(`${d.texte.fr} ${d.texte.ar} ${d.mots}`),
}));
const N = docs.length;
const df = new Map();
for (const x of docs) for (const w of new Set(x.body)) df.set(w, (df.get(w) ?? 0) + 1);
const avg = docs.reduce((a, x) => a + x.body.length, 0) / N;

// Score BM25 + bonus pour les mots du titre ; correspondance aussi par préfixe (inscrire / inscription).
export function search(question, k = 3) {
  const q = [...new Set(tokens(question))];
  return docs.map((x) => {
    let s = 0;
    for (const w of q) {
      const matches = x.body.filter((t) => t === w || (w.length >= 5 && t.length >= 5 && (t.startsWith(w.slice(0, 5)) || w.startsWith(t.slice(0, 5)))));
      if (matches.length) {
        const idf = Math.log(1 + (N - (df.get(w) ?? 1) + 0.5) / ((df.get(w) ?? 1) + 0.5));
        const tf = matches.length;
        s += idf * (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * x.body.length / avg));
      }
      if (x.title.has(w)) s += 1;
    }
    return { doc: x.d, score: s };
  }).filter((r) => r.score > 0.6).sort((a, b) => b.score - a.score).slice(0, k);
}

// Réponse hors ligne : la meilleure fiche, dans la langue de la question, avec le ton choisi.
export function offlineAnswer(question, persona = "serieux") {
  const lang = isArabic(question) ? "ar" : "fr";
  const hits = search(question, 3);
  const p = PERSONAS[persona] ?? PERSONAS.serieux;
  if (!hits.length) {
    return {
      answer: lang === "ar" ? "لم أجد الإجابة في بطاقات الموقع. جرّب صياغة أخرى أو أحد الأسئلة المقترحة." : "Je n'ai pas trouvé la réponse dans les fiches du site. Essayez une autre formulation ou une question proposée.",
      refs: [], lang, found: false,
    };
  }
  return { answer: p.prefix[lang] + hits[0].doc.texte[lang], refs: hits.slice(0, 2).map((h) => h.doc.id), lang, found: true };
}

export const SUGGESTIONS = {
  fr: ["C'est quoi le sujet ?", "Comment s'inscrire ?", "Mon mot de passe est-il envoyé ?", "Le site est-il écologique ?"],
  ar: ["ما هو موضوع التطبيق؟", "كيف أسجّل؟", "هل الموقع آمن؟", "هل الموقع صديق للبيئة؟"],
};
