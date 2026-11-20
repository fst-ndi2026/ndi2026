// Rafiq côté navigateur : trois cerveaux essayés dans l'ordre, une réponse garantie.
// 1. Claude via le serveur (si une clé y est configurée)
// 2. Gemini Nano dans Chrome (Prompt API, sur l'appareil, gratuit)
// 3. Recherche hors ligne dans les fiches (toujours disponible)
import { api } from "./api";
import { offlineAnswer, search, isArabic } from "../../../../shared/rafiq/search.js";
import { systemPrompt, context } from "../../../../shared/rafiq/prompt.js";
import type { Lang, PersonaId } from "../../../../shared/rafiq/index";

export type Source = "llm" | "nano" | "offline";
export type Reply = { answer: string; refs: string[]; lang: Lang; found: boolean; source: Source };
export type NanoState = "available" | "downloadable" | "downloading" | "unavailable" | "absent";

type LM = {
  availability: () => Promise<string>;
  create: (o: unknown) => Promise<{ prompt: (t: string) => Promise<string>; destroy: () => void }>;
};
const lm = () => (globalThis as unknown as { LanguageModel?: LM }).LanguageModel;

export async function nanoState(): Promise<NanoState> {
  const L = lm();
  if (!L) return "absent";
  try { return (await L.availability()) as NanoState; } catch { return "unavailable"; }
}

async function askNano(question: string, persona: PersonaId): Promise<Reply> {
  const lang: Lang = isArabic(question) ? "ar" : "fr";
  const hits = search(question, 3);
  const session = await lm()!.create({ initialPrompts: [{ role: "system", content: systemPrompt(persona, lang) }] });
  try {
    const text = (await session.prompt(`${context(hits.length ? hits : search("rafiq"), lang)}\n\nQuestion : ${question}`)).trim();
    if (!text) throw new Error("vide");
    return { answer: text, refs: hits.slice(0, 2).map((h) => h.doc.id), lang, found: hits.length > 0, source: "nano" };
  } finally { session.destroy(); }
}

export async function askRafiq(question: string, persona: PersonaId = "serieux"): Promise<Reply> {
  let server: Reply | null = null;
  if (typeof navigator === "undefined" || navigator.onLine !== false) {
    try { server = await api<Reply>("/api/ask", { method: "POST", body: JSON.stringify({ question, persona }) }); } catch { server = null; }
  }
  if (server?.source === "llm") return server;
  // Nano seulement s'il est déjà téléchargé : on ne déclenche jamais un téléchargement de plusieurs Go.
  if ((await nanoState()) === "available") {
    try { return await askNano(question, persona); } catch { /* cerveau suivant */ }
  }
  if (server) return server;
  return { ...offlineAnswer(question, persona), source: "offline" };
}

export type Stats = { fiches: number; sansReponse: number; ai: boolean };
export const rafiqStats = () => api<Stats>("/api/rafiq/stats");
