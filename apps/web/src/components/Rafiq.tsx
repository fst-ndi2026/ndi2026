import { useState, type FormEvent } from "react";
import { askRafiq, SUGGESTIONS, type Answer } from "../lib/rafiq";

type Msg = { from: "me" | "rafiq"; text: string; meta?: string };

const META: Record<Answer["source"], string> = {
  llm: "Réponse générée par IA à partir du contenu NIRD · à vérifier",
  local: "Réponse tirée de la base du village",
  offline: "Hors connexion · réponse tirée de la base du village",
};

export default function Rafiq() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "rafiq", text: "Bonjour, je suis Rafiq, le guide du village. Posez-moi une question sur la démarche NIRD." },
  ]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function send(question: string) {
    if (!question.trim()) { setErr("Écrivez une question avant d'envoyer."); return; }
    setErr(""); setBusy(true);
    setMsgs((m) => [...m, { from: "me", text: question }]);
    const a = await askRafiq(question);
    setMsgs((m) => [...m, { from: "rafiq", text: a.answer, meta: META[a.source] }]);
    setQ(""); setBusy(false);
  }
  const submit = (e: FormEvent) => { e.preventDefault(); send(q); };

  return (
    <aside className="panel rafiq" aria-labelledby="rafiq-titre">
      <div className="rafiq-head">
        <span className="avatar" aria-hidden="true">R</span>
        <div><h2 id="rafiq-titre">Rafiq, le guide du village</h2><p className="muted small">Répond à partir du contenu NIRD</p></div>
      </div>
      <span className="badge badge-green">Fonctionne aussi hors connexion</span>
      <div className="chat" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={m.from === "me" ? "bubble me" : "bubble"}>
            {m.text}
            {m.meta && <p className="small muted bubble-meta">{m.meta}</p>}
          </div>
        ))}
        {busy && <p className="small muted" aria-busy="true">Rafiq réfléchit…</p>}
      </div>
      <div className="chips">
        {SUGGESTIONS.map((s) => <button key={s} type="button" className="chip" onClick={() => send(s)} disabled={busy}>{s}</button>)}
      </div>
      <form onSubmit={submit} className="ask-row">
        <label htmlFor="rafiq-q" className="sr-only">Votre question</label>
        <input id="rafiq-q" value={q} onChange={(e) => { setQ(e.target.value); setErr(""); }} placeholder="Pourquoi garder nos vieux PC ?" maxLength={500} aria-describedby={err ? "rafiq-err" : undefined} />
        <button type="submit" className="btn-dark" disabled={busy}>Envoyer</button>
      </form>
      {err && <p id="rafiq-err" role="alert" className="error small">{err}</p>}
    </aside>
  );
}
