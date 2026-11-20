import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { grade, runChecks, type Check } from "../lib/security";

// Badge bouclier du pied de page : protections reçues avec la page, vérifiées en direct.
export default function SecurityBadge() {
  const { pathname } = useLocation();
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => { runChecks(pathname).then((c) => alive && setChecks(c)).catch(() => {}); }, 800);
    return () => { alive = false; clearTimeout(t); };
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!checks) return null;
  const ok = checks.filter((c) => c.ok).length;
  const g = grade(checks);
  return (
    <div className="eco">
      <button ref={btn} type="button" className="eco-badge" aria-expanded={open} aria-controls="sec-panel" onClick={() => setOpen((o) => !o)}>
        <span className="sec-shield sec-shield-sm" data-grade={g[0]} aria-hidden="true">{g}</span>
        <span>Sécurité {g} · {ok}/{checks.length} protections</span>
      </button>
      {open && (
        <section id="sec-panel" className="eco-panel" role="dialog" aria-labelledby="sec-titre">
          <div className="eco-head">
            <h2 id="sec-titre">Protections de cette page</h2>
            <button type="button" className="a11y-close" aria-label="Fermer" onClick={() => { setOpen(false); btn.current?.focus(); }}>×</button>
          </div>
          <div className="eco-score">
            <span className="sec-shield" data-grade={g[0]}>{g}</span>
            <div><p className="eco-num">{ok} / {checks.length} protections</p><p className="eco-sub">Vérifié à l'instant sur les en-têtes reçus</p></div>
          </div>
          <ul className="sec-list">
            {checks.map((c) => (
              <li key={c.id}><span>{c.label}</span><strong className={c.ok ? "ok" : "error"}>{c.ok ? "✓ OK" : "✗ Absent"}</strong></li>
            ))}
          </ul>
          <div className="eco-links">
            <Link to="/securite" className="eco-btn" onClick={() => setOpen(false)}>Déclaration de sécurité</Link>
            <a href={`https://developer.mozilla.org/fr/observatory/analyze?host=${location.hostname}`} className="eco-btn eco-btn-outline">Mesure officielle</a>
          </div>
        </section>
      )}
    </div>
  );
}
