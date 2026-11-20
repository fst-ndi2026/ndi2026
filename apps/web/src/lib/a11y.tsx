import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Préférences d'accessibilité : taille du texte et contraste élevé (mémorisées si possible).
type Prefs = { scale: number; contrast: boolean };
const KEY = "a11y-prefs";
const SCALES = [1, 1.25, 1.5, 2];

function load(): Prefs {
  try { return { scale: 1, contrast: false, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; }
  catch { return { scale: 1, contrast: false }; }
}

const Ctx = createContext<{ prefs: Prefs; bigger: () => void; smaller: () => void; toggleContrast: () => void } | null>(null);

export function A11yProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(load);
  useEffect(() => {
    const html = document.documentElement;
    html.style.fontSize = `${prefs.scale * 100}%`;
    html.classList.toggle("hc", prefs.contrast);
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* stockage indisponible */ }
  }, [prefs]);
  const step = (d: number) => setPrefs((p) => {
    const i = Math.min(SCALES.length - 1, Math.max(0, SCALES.indexOf(p.scale) + d));
    return { ...p, scale: SCALES[i] };
  });
  return (
    <Ctx.Provider value={{ prefs, bigger: () => step(1), smaller: () => step(-1), toggleContrast: () => setPrefs((p) => ({ ...p, contrast: !p.contrast })) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useA11y() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useA11y hors de A11yProvider");
  return c;
}
