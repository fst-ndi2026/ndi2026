import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ALL_QUESTS, POINTS_PER_STEP } from "../data/village";
import { useProgress } from "../lib/progress";

export default function Quete() {
  const { id } = useParams();
  const quest = ALL_QUESTS.find((q) => q.id === id);
  const p = useProgress();
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  if (!quest) return <section className="stack"><h1>Quête introuvable</h1><Link to="/">Retour à la carte</Link></section>;
  if (p.status(quest.id) === "locked")
    return <section className="stack"><h1>{quest.name}</h1><p>Cette quête se débloque après la précédente du quartier.</p><Link className="btn" to="/">Retour à la carte</Link></section>;

  const s = quest.steps[step];
  const choice = picked !== null ? s.choices[picked] : null;
  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (s.choices[i].ok) setScore((x) => x + POINTS_PER_STEP);
  };
  const nextStep = () => {
    if (step + 1 < quest.steps.length) { setStep(step + 1); setPicked(null); return; }
    p.complete(quest.id, score);
    setFinished(true);
  };

  return (
    <div className="quest-page stack-lg">
      <div className="between wrap-row">
        <Link to="/" className="back">← Retour à la carte</Link>
        <span className="badge" style={{ background: quest.district.tint, color: "#1E2A22" }}>Quartier {quest.district.name}</span>
      </div>
      <div className="stack-xs">
        <p className="eyebrow">Quête · {quest.minutes} minutes</p>
        <h1>{quest.name}</h1>
        <p className="lead">{quest.intro}</p>
      </div>
      {!finished ? (
        <>
          <div className="row">
            <div role="progressbar" aria-label="Avancement de la quête" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={quest.steps.length} className="bar grow">
              <div style={{ width: `${((step + 1) / quest.steps.length) * 100}%`, background: "#23704A" }} />
            </div>
            <span className="small muted">Étape {step + 1} sur {quest.steps.length}</span>
          </div>
          <section className="panel stack" aria-labelledby="situation">
            <h2 id="situation" className="h3">{s.situation}</h2>
            <fieldset className="choices">
              <legend className="strong">{s.question}</legend>
              {s.choices.map((c, i) => (
                <button key={i} type="button" onClick={() => pick(i)} aria-pressed={picked === i}
                  className={picked === i ? (c.ok ? "choice choice-ok" : "choice choice-ko") : picked !== null && c.ok ? "choice choice-hint" : "choice"}
                  disabled={picked !== null && picked !== i && !c.ok}>{c.label}</button>
              ))}
            </fieldset>
            {choice && (
              <div role="status" className={choice.ok ? "feedback feedback-ok" : "feedback feedback-ko"}>
                <p className="strong">{choice.ok ? "Bien joué." : "Pas tout à fait."}</p>
                <p>{choice.ok ? s.good : s.bad}</p>
              </div>
            )}
            <div className="between wrap-row">
              <span className="small muted">Bonne réponse : +{POINTS_PER_STEP} points pour le quartier {quest.district.name}</span>
              <button type="button" className="btn" onClick={nextStep} disabled={picked === null}>
                {step + 1 < quest.steps.length ? "Étape suivante" : "Terminer la quête"}
              </button>
            </div>
          </section>
        </>
      ) : (
        <section className="panel stack" role="status">
          <h2>Quête libérée !</h2>
          <p>Vous gagnez <strong>{score} points</strong>. Le quartier {quest.district.name} progresse.</p>
          <div className="row-wrap"><Link className="btn" to="/">Retour à la carte</Link><Link className="btn-outline" to="/podium">Voir le podium</Link></div>
        </section>
      )}
    </div>
  );
}
