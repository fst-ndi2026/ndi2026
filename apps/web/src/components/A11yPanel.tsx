import { useEffect, useRef, useState } from "react";
import { useA11y, PROFILES, type Theme } from "../lib/a11y";

// Bouton flottant + panneau « Paramètres d'affichage » (modèle : AccessConfig, Orange Confort+).
const THEMES: { id: Theme; label: string; bg: string; fg: string; ring?: string }[] = [
  { id: "defaut", label: "Défaut", bg: "var(--bg-default, #0f172a)", fg: "var(--text-default, #f8fafc)" },
  { id: "clair", label: "Clair", bg: "#FFFFFF", fg: "#1E2A22", ring: "#C9C6B8" },
  { id: "sombre", label: "Sombre", bg: "#1B1F1D", fg: "#F1EFE8" },
  { id: "contraste", label: "Contraste", bg: "#000000", fg: "#FFE14D", ring: "#FFE14D" },
  { id: "sepia", label: "Sépia", bg: "#F6EBD9", fg: "#3B2A16" },
];

export default function A11yPanel() {
  const { prefs, set, applyProfile, reset, activeProfile } = useA11y();
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>("button, input")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); btn.current?.focus(); }
      if (e.key === "Tab" && panel.current) {
        const f = [...panel.current.querySelectorAll<HTMLElement>("button, input")].filter((x) => !x.hasAttribute("disabled"));
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => { setOpen(false); btn.current?.focus(); };

  return (
    <>
      <button ref={btn} type="button" className="a11y-fab" aria-label="Paramètres d'affichage" aria-expanded={open} aria-controls="a11y-panel" onClick={() => setOpen((o) => !o)}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="4.5" r="1.8" /><path d="M5 8.5 L12 10 L19 8.5" /><path d="M12 10 V15 L8.5 21" /><path d="M12 15 L15.5 21" /></svg>
      </button>
      {open && (
        <div ref={panel} id="a11y-panel" role="dialog" aria-modal="false" aria-labelledby="a11y-title" className="a11y-panel">
          <div className="a11y-head">
            <h2 id="a11y-title">Paramètres d'affichage</h2>
            <button type="button" className="a11y-close" aria-label="Fermer" onClick={close}>×</button>
          </div>

          <p className="a11y-label" id="profils">Profils rapides</p>
          <div className="a11y-profiles" role="group" aria-labelledby="profils">
            {PROFILES.map((p) => (
              <button key={p.id} type="button" aria-pressed={activeProfile === p.id} className="a11y-tile" onClick={() => applyProfile(p.id)}>
                <span className="a11y-tile-title">{p.label}</span><span className="a11y-tile-hint">{p.hint}</span>
              </button>
            ))}
          </div>

          <div className="a11y-section">
            <div className="a11y-row"><label htmlFor="a11y-size">Taille du texte</label><span>{Math.round(prefs.scale * 100)} %</span></div>
            <div className="a11y-row"><span aria-hidden="true" className="a11y-aa-s">Aa</span>
              <input id="a11y-size" type="range" min={100} max={200} step={25} value={prefs.scale * 100}
                aria-valuetext={`${Math.round(prefs.scale * 100)} %`} onChange={(e) => set({ scale: Number(e.target.value) / 100 })} />
              <span aria-hidden="true" className="a11y-aa-l">Aa</span></div>
          </div>

          <div className="a11y-section">
            <p className="a11y-label" id="police">Police</p>
            <div className="a11y-seg" role="group" aria-labelledby="police">
              <button type="button" aria-pressed={prefs.font === "standard"} onClick={() => set({ font: "standard" })}>Standard</button>
              <button type="button" aria-pressed={prefs.font === "lisible"} onClick={() => set({ font: "lisible" })} className="a11y-font-lisible">Lisible</button>
            </div>
          </div>

          <div className="a11y-section">
            <p className="a11y-label" id="theme">Thème</p>
            <div className="a11y-themes" role="group" aria-labelledby="theme">
              {THEMES.map((t) => (
                <button key={t.id} type="button" aria-pressed={prefs.theme === t.id} className="a11y-theme" onClick={() => set({ theme: t.id })}>
                  <span className="a11y-swatch" style={{ background: t.bg, color: t.fg, borderColor: t.ring ?? t.bg }} aria-hidden="true">Aa</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="a11y-section">
            <label className="a11y-switch"><span>Interlignage et espacement augmentés</span>
              <input type="checkbox" role="switch" checked={prefs.spacing} onChange={(e) => set({ spacing: e.target.checked })} /></label>
            <label className="a11y-switch"><span>Arrêter les animations</span>
              <input type="checkbox" role="switch" checked={prefs.calm} onChange={(e) => set({ calm: e.target.checked })} /></label>
          </div>

          <button type="button" className="a11y-reset" onClick={reset}>Réinitialiser</button>
          <p className="a11y-note">Vos réglages restent sur cet appareil, sans compte.</p>
        </div>
      )}
    </>
  );
}
