import { useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";

type Answer = { answer: string; source: "llm" | "fallback" };

export default function Assistant() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [a, setA] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    try { setA(await api<Answer>("/api/ask", { method: "POST", body: JSON.stringify({ question: q }) })); }
    catch { setA({ answer: t("loadError"), source: "fallback" }); }
    finally { setBusy(false); }
  }

  return (
    <section className="stack">
      <h1>{t("assistant")}</h1>
      <form onSubmit={submit} className="card stack">
        <label htmlFor="q">{t("question")}</label>
        <input id="q" value={q} onChange={(e) => setQ(e.target.value)} maxLength={500} required />
        <button type="submit" disabled={busy}>{busy ? t("loading") : t("ask")}</button>
      </form>
      <div aria-live="polite">
        {a && (
          <div className="card">
            <p>{a.answer}</p>
            <p className="muted"><small>{a.source === "llm" ? t("aiLabel") : t("fallbackLabel")}</small></p>
          </div>
        )}
      </div>
    </section>
  );
}
