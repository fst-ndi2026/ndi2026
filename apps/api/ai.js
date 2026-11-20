// Rafiq côté serveur : répond à partir des fiches du site (RAG), avec Claude si une clé
// est configurée, sinon par recherche hors ligne. L'application reste utilisable sans clé.
import { search, offlineAnswer, isArabic, kb } from "../../shared/rafiq/search.js";
import { systemPrompt, context } from "../../shared/rafiq/prompt.js";
export { systemPrompt };

const cache = new Map();
export const aiConfigured = () => Boolean(process.env.AI_API_KEY && process.env.AI_MODEL);

export async function ask(question, persona = "serieux") {
  const off = offlineAnswer(question, persona);
  if (!aiConfigured()) return { ...off, source: "offline" };
  const lang = isArabic(question) ? "ar" : "fr";
  const hits = search(question, 3);
  const key = `${persona}|${question}`;
  if (cache.has(key)) return cache.get(key);
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.AI_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.AI_MODEL, max_tokens: 400, system: systemPrompt(persona, lang),
        messages: [{ role: "user", content: `${context(hits.length ? hits : search("rafiq"), lang)}\n\nQuestion : ${question}` }],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) throw new Error(String(r.status));
    const data = await r.json();
    const text = data.content?.find((c) => c.type === "text")?.text?.trim();
    if (!text) throw new Error("vide");
    const out = { answer: text, refs: hits.slice(0, 2).map((h) => h.doc.id), lang, found: hits.length > 0, source: "llm" };
    if (cache.size > 200) cache.clear();
    cache.set(key, out);
    return out;
  } catch {
    return { ...off, source: "offline" };
  }
}

export const kbSize = () => kb.length;
