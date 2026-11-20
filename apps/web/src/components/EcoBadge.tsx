import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { estimate, measure, gradeStyle, GRADES, type EcoResult } from "../lib/eco";
import { useSobre } from "../lib/sobre";

// Badge du pied de page : estimation EcoIndex de la page, et panneau de détail.
export default function EcoBadge() {
  const { pathname } = useLocation();
  const { sobre, setSobre } = useSobre();
  const [r, setR] = useState<EcoResult | null>(null);
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const run = () => setR(estimate(measure()));
    const t = setTimeout(run, 600);
    if (document.readyState !== "complete") window.addEventListener("load", run, { once: true });
    return () => clearTimeout(t);
  }, [pathname, sobre]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!r) return null;
  const g = gradeStyle(r.grade);
  return (
    <div className="eco">
      <button ref={btn} type="button" className="eco-badge" aria-expanded={open} aria-controls="eco-panel" onClick={() => setOpen((o) => !o)}>
        <span className="eco-grade" style={{ background: g.bg, color: g.fg }} aria-hidden="true">{r.grade}</span>
        <span>EcoIndex estimé {r.score} · {r.kb} Ko · {r.requests} requêtes</span>
      </button>
      {open && (
        <section id="eco-panel" className="eco-panel" role="dialog" aria-labelledby="eco-titre">
          <div className="eco-head">
            <h2 id="eco-titre">Empreinte de cette page</h2>
            <button type="button" className="a11y-close" aria-label="Fermer" onClick={() => { setOpen(false); btn.current?.focus(); }}>×</button>
          </div>
          <div className="eco-score">
            <span className="eco-big" style={{ background: g.bg, color: g.fg }}>{r.grade}</span>
            <div><p className="eco-num">{r.score} / 100</p><p className="eco-sub">Estimation inspirée d'EcoIndex</p></div>
          </div>
          <ol className="eco-scale" aria-label="Échelle de A (sobre) à G (lourd)">
            {GRADES.map((x) => (
              <li key={x.grade} style={{ background: x.bg, color: x.fg }} aria-current={x.grade === r.grade ? "true" : undefined}
                className={x.grade === r.grade ? "eco-current" : undefined}>{x.grade}</li>
            ))}
          </ol>
          <dl className="eco-metrics">
            <div><dt>Éléments</dt><dd>{r.dom}</dd></div>
            <div><dt>Requêtes</dt><dd>{r.requests}</dd></div>
            <div><dt>Poids</dt><dd>{r.kb} Ko</dd></div>
          </dl>
          <p className="eco-note">≈ {r.co2.toLocaleString("fr-FR")} g éq. CO₂ et {r.water.toLocaleString("fr-FR")} cl d'eau par visite (ordre de grandeur).</p>
          <label className="a11y-switch eco-switch">
            <span>Mode sobre<span className="eco-hint">Médias sur demande, sans animations, fond sombre</span></span>
            <input type="checkbox" role="switch" checked={sobre} onChange={(e) => setSobre(e.target.checked)} />
          </label>
          <div className="eco-links">
            <Link to="/sobriete" className="eco-btn" onClick={() => setOpen(false)}>Déclaration d'écoconception</Link>
            <a href="https://www.ecoindex.fr/" className="eco-btn eco-btn-outline">Mesure officielle</a>
          </div>
        </section>
      )}
    </div>
  );
}
