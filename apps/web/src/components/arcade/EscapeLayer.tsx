import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../lib/i18n";
import { collectWords, hits, type WordBox } from "../../lib/arcade/escape";
import { PHRASE } from "../../lib/arcade/config";
import type { Sound } from "../../lib/arcade/sound";

// Le serpent sort de la borne et rampe sur la vraie page : chaque mot mangé complète la phrase mystère.
// La page n'est jamais modifiée : les mots mangés sont seulement recouverts, et tout disparaît à la sortie.
const C = 24;
type D = { x: number; y: number };

export default function EscapeLayer({ onEnd, sound }: { onEnd: (eaten: number, won: boolean) => void; sound: Sound | null }) {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const phrase = PHRASE[lang];
  const words = useMemo<WordBox[]>(() => collectWords(document.querySelector("main") ?? document.body), []);
  const cols = Math.max(10, Math.floor(innerWidth / C)), rows = Math.max(8, Math.floor(innerHeight / C));
  const [snake, setSnake] = useState<D[]>(() => { const y = Math.floor(rows / 2); return [{ x: 3, y }, { x: 2, y }, { x: 1, y }]; });
  const [eaten, setEaten] = useState<number[]>([]);
  const dir = useRef<D>({ x: 1, y: 0 });
  const done = useRef(false);
  const goal = Math.min(phrase.length, Math.max(1, words.length));

  const finish = (n: number, won: boolean) => {
    if (done.current) return;
    done.current = true;
    if (won) sound?.win(); else sound?.die();
    onEnd(n, won);
  };

  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const m: Record<string, D> = { ArrowUp: { x: 0, y: -1 }, z: { x: 0, y: -1 }, w: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 }, q: { x: -1, y: 0 }, a: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 } };
      if (e.key === "Escape") { e.preventDefault(); finish(eaten.length, false); return; }
      const nd = m[k];
      if (nd && !(nd.x === -dir.current.x && nd.y === -dir.current.y)) { e.preventDefault(); dir.current = nd; }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.documentElement.style.overflow = prev; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eaten.length]);

  useEffect(() => {
    if (done.current) return;
    const t = setTimeout(() => {
      const h = { x: (snake[0].x + dir.current.x + cols) % cols, y: (snake[0].y + dir.current.y + rows) % rows };
      if (snake.slice(0, -1).some((s) => s.x === h.x && s.y === h.y)) { finish(eaten.length, false); return; }
      const box = { x: h.x * C, y: h.y * C, w: C, h: C };
      const i = words.findIndex((w, k) => !eaten.includes(k) && hits(box, w));
      if (i >= 0) {
        const next = [...eaten, i];
        setEaten(next);
        sound?.eat();
        setSnake([h, ...snake]);
        if (next.length >= goal) finish(next.length, true);
        return;
      }
      setSnake([h, ...snake.slice(0, -1)]);
    }, 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snake]);

  const shown = phrase.map((w, i) => (i < eaten.length ? w : "_".repeat(Math.max(1, [...w].length)))).join(" ");
  return createPortal(
    <div className="esc" data-arcade>
      {eaten.map((k) => <span key={k} className="esc-mask" style={{ left: words[k].x - 2, top: words[k].y - 1, width: words[k].w + 4, height: words[k].h + 2 }} />)}
      {snake.map((s, i) => <span key={i} className={i === 0 ? "esc-seg esc-head" : "esc-seg"} style={{ left: s.x * C, top: s.y * C }} />)}
      <aside className="esc-panel" aria-labelledby="esc-titre">
        <h2 id="esc-titre">🚪 {fr ? "ÉVASION !" : "هروب!"}</h2>
        <p>{fr ? "Le serpent a quitté la borne. Mangez les mots du site pour reconstituer la phrase mystère." : "خرج الثعبان من اللعبة. كُل كلمات الموقع لتكمل الجملة السرية."}</p>
        <p className="esc-phrase" aria-live="polite">{shown}</p>
        <p>{fr ? "Mots mangés" : "كلمات مأكولة"} : {eaten.map((k) => words[k].text).join(", ") || "–"}</p>
        <button type="button" className="arc-btn" onClick={() => finish(eaten.length, false)}>{fr ? "RETOUR À LA BORNE" : "العودة إلى اللعبة"}</button>
        <p className="esc-note">{fr ? "La page revient intacte à la sortie." : "تعود الصفحة سليمة عند الخروج."}</p>
      </aside>
    </div>,
    document.body,
  );
}
