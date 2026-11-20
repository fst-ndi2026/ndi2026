import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Mode sobre : médias sur demande, sans animations, fond sombre. Mémorisé si possible.
const KEY = "mode-sobre";
const Ctx = createContext<{ sobre: boolean; setSobre: (v: boolean) => void }>({ sobre: false, setSobre: () => {} });

function initial() {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

export function SobreProvider({ children }: { children: ReactNode }) {
  const [sobre, setSobre] = useState(initial);
  useEffect(() => {
    document.documentElement.classList.toggle("sobre", sobre);
    try { localStorage.setItem(KEY, sobre ? "1" : "0"); } catch { /* stockage indisponible */ }
  }, [sobre]);
  return <Ctx.Provider value={{ sobre, setSobre }}>{children}</Ctx.Provider>;
}
export const useSobre = () => useContext(Ctx);
