import { Link } from "react-router-dom";
import { DISTRICTS, ALL_QUESTS } from "../data/village";
import { useProgress } from "../lib/progress";
import Rafiq from "../components/Rafiq";

const STATUS = {
  done: { label: "Libérée", cls: "pill pill-done" },
  todo: { label: "À faire", cls: "pill pill-todo" },
  locked: { label: "Verrouillée", cls: "pill pill-locked" },
} as const;
const JALONS = ["Mobilisation", "Expérimentation", "Intégration"];

export default function Carte() {
  const p = useProgress();
  const next = ALL_QUESTS.find((q) => p.status(q.id) === "todo");
  return (
    <div className="stack-lg">
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow">Votre village · démarche NIRD</p>
          <h1>Face aux géants du numérique, votre école tient bon.</h1>
          <p className="lead">Chaque bâtiment est une quête de deux minutes : reconditionner un PC, passer à Linux, protéger les données des élèves. Libérez les trois quartiers pour intégrer la démarche NIRD.</p>
          <div className="row-wrap">
            {next
              ? <Link className="btn" to={`/quete/${next.id}`}>{p.done.length ? "Continuer : " : "Commencer : "}{next.name}</Link>
              : <Link className="btn" to="/podium">Village libéré ! Voir le podium</Link>}
            {p.done.length > 0 && <button type="button" className="btn-outline" onClick={p.reset}>Recommencer</button>}
          </div>
        </div>
        <div className="panel progress-card">
          <div className="between"><span className="strong">Libération du village</span><span className="big-num">{p.total} %</span></div>
          <ol className="jalons" aria-label="Jalons de la démarche">
            {JALONS.map((j, i) => (
              <li key={j} className={i + 1 < p.milestone ? "jalon jalon-done" : i + 1 === p.milestone ? "jalon jalon-now" : "jalon"}
                aria-current={i + 1 === p.milestone ? "step" : undefined}>{i + 1}. {j}{i + 1 < p.milestone ? " ✓" : ""}</li>
            ))}
          </ol>
          {DISTRICTS.map((d) => (
            <div key={d.id} className="stack-xs">
              <div className="between small"><span className="strong">{d.name}</span><span className="muted">{p.pillar(d.id)} %</span></div>
              <div role="progressbar" aria-label={d.name} aria-valuenow={p.pillar(d.id)} aria-valuemin={0} aria-valuemax={100} className="bar">
                <div style={{ width: `${p.pillar(d.id)}%`, background: d.color }} />
              </div>
            </div>
          ))}
          <p className="small muted">{p.points} points</p>
        </div>
      </section>

      <section className="split" aria-labelledby="carte-titre">
        <div className="split-main stack">
          <div className="between wrap-row">
            <h2 id="carte-titre">La carte du village</h2>
            <span className="muted small">{p.done.length} quêtes libérées sur {ALL_QUESTS.length}</span>
          </div>
          <div className="districts">
            {DISTRICTS.map((d) => (
              <div key={d.id} className="district" style={{ background: d.tint, borderColor: d.border }}>
                <div className="between"><h3>{d.name}</h3><span className="strong" style={{ color: d.color }}>{p.pillar(d.id)} %</span></div>
                <p className="small muted">{d.tagline}</p>
                <ul className="quest-list">
                  {d.quests.map((q) => {
                    const s = p.status(q.id);
                    const inner = (<><span className={`dot dot-${s}`} aria-hidden="true" /><span className="quest-name">{q.name}</span><span className={STATUS[s].cls}>{STATUS[s].label}</span></>);
                    return (
                      <li key={q.id}>
                        {s === "locked"
                          ? <span className="quest quest-locked" aria-disabled="true" title="Terminez d'abord la quête précédente">{inner}</span>
                          : <Link className="quest" to={`/quete/${q.id}`}>{inner}</Link>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <Rafiq />
      </section>
    </div>
  );
}
