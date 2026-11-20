import { useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useProgress } from "../lib/progress";

type Row = { village: string; points: number };
const MEDALS = ["#B8860B", "#6B7570", "#A0522D"];

export default function Podium() {
  const p = useProgress();
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [name, setName] = useState(p.village);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () => api<Row[]>("/api/scores").then((r) => { setRows(r); setStatus("ready"); }).catch(() => setStatus("error"));
  useEffect(() => {
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, 10_000);
    return () => clearInterval(t);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^[\p{L}\p{N} '’.-]{2,40}$/u.test(name.trim())) { setMsg({ ok: false, text: "Choisissez un pseudonyme de 2 à 40 lettres ou chiffres." }); return; }
    try {
      await api("/api/scores", { method: "POST", body: JSON.stringify({ village: name.trim(), points: p.points }) });
      p.setVillage(name.trim());
      setMsg({ ok: true, text: "Votre village est dans le classement." });
      load();
    } catch { setMsg({ ok: false, text: "Envoi impossible pour le moment. Réessayez." }); }
  }

  const top3 = rows.slice(0, 3);
  const order = [1, 0, 2].filter((i) => top3[i]);
  return (
    <div className="stack-lg">
      <div className="between wrap-row">
        <div>
          <p className="eyebrow">Podium des villages</p>
          <h1>Qui résiste le mieux ?</h1>
        </div>
        <span className="row small" role="status"><span className="dot dot-done" aria-hidden="true" />Mis à jour toutes les 10 secondes</span>
      </div>
      {status === "loading" && <p aria-busy="true">Chargement du classement…</p>}
      {status === "error" && <div role="alert"><p className="error">Classement indisponible.</p><button type="button" className="btn-outline" onClick={load}>Réessayer</button></div>}
      {status === "ready" && (
        <>
          <ol className="podium" aria-label="Trois premiers villages">
            {order.map((i) => (
              <li key={top3[i].village} className="podium-step" style={{ minHeight: [200, 170, 150][i] }}>
                <span className="medal" style={{ background: MEDALS[i] }}>{i + 1}</span>
                <span className="strong">{top3[i].village}</span>
                <span className="big-num">{top3[i].points} pts</span>
              </li>
            ))}
          </ol>
          <div className="panel table-wrap">
            <table className="rank">
              <caption>Classement complet</caption>
              <thead><tr><th scope="col">Rang</th><th scope="col">Village</th><th scope="col" className="num">Points</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.village} className={r.village === p.village ? "me" : undefined}>
                    <td>{i + 1}</td><th scope="row">{r.village}{r.village === p.village && <span className="sr-only"> (votre village)</span>}</th><td className="num">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <form onSubmit={submit} className="panel stack" noValidate>
        <h2 className="h3">Inscrire votre village ({p.points} points)</h2>
        <div>
          <label htmlFor="village">Pseudonyme du village</label>
          <input id="village" value={name} onChange={(e) => { setName(e.target.value); setMsg(null); }} maxLength={40} placeholder="Collège des Dunes" aria-describedby="village-aide" />
          <p id="village-aide" className="small muted">Pas de nom réel ni de donnée personnelle.</p>
        </div>
        <button type="submit" className="btn">Envoyer mon score</button>
        {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "ok" : "error"}>{msg.text}</p>}
      </form>
    </div>
  );
}
