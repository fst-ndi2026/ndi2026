import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useKonami } from "../lib/useKonami";
import { initRetro } from "../lib/retro";

// Déclencheurs du jeu caché ; le jeu lui-même n'est téléchargé qu'à la découverte (0 Ko sinon).
const Arcade = lazy(() => import("./arcade/Arcade"));
export const openArcade = () => window.dispatchEvent(new Event("arcade:open"));
const editable = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

export default function ArcadeLauncher() {
  const [open, setOpen] = useState(false);
  const [konami, resetKonami] = useKonami();
  const back = useRef<HTMLElement | null>(null);

  const show = () => { back.current = document.activeElement as HTMLElement; setOpen(true); };
  useEffect(() => { initRetro(); }, []);
  useEffect(() => { if (konami) { resetKonami(); show(); } }, [konami, resetKonami]);

  useEffect(() => {
    let typed = "";
    const clicks: number[] = [];
    const onKey = (e: KeyboardEvent) => {
      if (editable(e.target) || e.key.length !== 1) return;
      typed = (typed + e.key.toLowerCase()).slice(-5);
      if (typed === "snake") { typed = ""; show(); }
    };
    const onClick = (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest("h1")) return;
      const now = Date.now();
      clicks.push(now);
      while (clicks.length && now - clicks[0] > 2000) clicks.shift();
      if (clicks.length >= 5) { clicks.length = 0; show(); }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClick);
    window.addEventListener("arcade:open", show);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("click", onClick); window.removeEventListener("arcade:open", show); };
  }, []);

  return (
    <>
      <button type="button" className="arc-pixel" aria-label="Pixel mystère" onClick={show}><span /></button>
      {open && (
        <Suspense fallback={null}>
          <Arcade onClose={() => { setOpen(false); back.current?.focus?.(); }} />
        </Suspense>
      )}
    </>
  );
}
