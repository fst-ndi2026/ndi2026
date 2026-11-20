import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Paramètres d'affichage : taille, police, espacement, thème, animations. Mémorisés si possible.
export type Theme = "defaut" | "clair" | "sombre" | "contraste" | "sepia";
export type Prefs = { scale: number; font: "standard" | "lisible"; spacing: boolean; theme: Theme; calm: boolean };

export const DEFAULTS: Prefs = { scale: 1, font: "standard", spacing: false, theme: "defaut", calm: false };
export const PROFILES: { id: string; label: string; hint: string; prefs: Partial<Prefs> }[] = [
  { id: "malvoyance", label: "Malvoyance", hint: "Texte agrandi, contraste élevé", prefs: { scale: 1.5, theme: "contraste", spacing: true } },
  { id: "dyslexie", label: "Dyslexie", hint: "Police lisible, lignes espacées", prefs: { font: "lisible", spacing: true, scale: 1.25 } },
  { id: "concentration", label: "Concentration", hint: "Sans animations, fond doux", prefs: { calm: true, theme: "sepia" } },
];
const KEY = "a11y-prefs-v2";

function load(): Prefs {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { return DEFAULTS; }
}

type Ctx = { prefs: Prefs; set: (p: Partial<Prefs>) => void; applyProfile: (id: string) => void; reset: () => void; activeProfile: string | null };
const A11yCtx = createContext<Ctx | null>(null);

export function A11yProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(load);
  useEffect(() => {
    const html = document.documentElement;
    html.style.fontSize = `${prefs.scale * 100}%`;
    html.dataset.theme = prefs.theme;
    html.classList.toggle("font-lisible", prefs.font === "lisible");
    html.classList.toggle("spacing", prefs.spacing);
    html.classList.toggle("calm", prefs.calm);
    html.classList.toggle("hc", prefs.theme === "contraste");
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* stockage indisponible */ }
  }, [prefs]);
  const activeProfile = PROFILES.find((p) =>
    (Object.keys(p.prefs) as (keyof Prefs)[]).every((k) => prefs[k] === p.prefs[k]))?.id ?? null;
  return (
    <A11yCtx.Provider value={{
      prefs, activeProfile,
      set: (p) => setPrefs((x) => ({ ...x, ...p })),
      applyProfile: (id) => setPrefs({ ...DEFAULTS, ...PROFILES.find((p) => p.id === id)?.prefs }),
      reset: () => setPrefs(DEFAULTS),
    }}>{children}</A11yCtx.Provider>
  );
}

export function useA11y() {
  const c = useContext(A11yCtx);
  if (!c) throw new Error("useA11y hors de A11yProvider");
  return c;
}
