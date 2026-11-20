import kb from "../../../api/kb.json";
import { api } from "./api";

// Rafiq côté navigateur : tente l'API, et répond localement si le réseau est absent (IA low-cost).
const STOP = new Set("le la les un une des de du d l et ou a à au aux en pour par sur dans est ce cette ces qui que quoi quel quelle comment pourquoi nos vos mon ma mes ton ta tes son sa ses il elle on nous vous je tu y ne pas plus se s qu c".split(" "));
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const words = (s: string) => new Set((norm(s).match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 2 && !STOP.has(w)));

export type Answer = { answer: string; source: "llm" | "local" | "offline"; refs: string[] };

export function localSearch(question: string): Answer {
  const q = words(question);
  const best = kb
    .map((d) => { const t = words(d.titre + " " + d.texte); let s = 0; const ti = words(d.titre); q.forEach((w) => { if (t.has(w)) s++; if (ti.has(w)) s++; }); return { d, s }; })
    .filter((x) => x.s > 0).sort((a, b) => b.s - a.s)[0];
  return best
    ? { answer: best.d.texte, source: "offline", refs: [best.d.titre] }
    : { answer: "Je n'ai pas trouvé la réponse hors connexion. Essayez « Pourquoi Linux ? ».", source: "offline", refs: [] };
}

export async function askRafiq(question: string): Promise<Answer> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return localSearch(question);
  try { return await api<Answer>("/api/ask", { method: "POST", body: JSON.stringify({ question }) }); }
  catch { return localSearch(question); }
}

export const SUGGESTIONS = ["C'est quoi NIRD ?", "Pourquoi Linux ?", "Comment rejoindre NIRD ?", "Reconditionner un PC"];
