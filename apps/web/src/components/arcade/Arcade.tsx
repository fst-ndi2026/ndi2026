import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useI18n } from "../../lib/i18n";
import { api } from "../../lib/api";
import { newGame, step, turn, speedMs, active, endEscape, TIMED, type Dir, type Game } from "../../lib/arcade/engine";
import { POWERS, SNAKE_COLORS } from "../../lib/arcade/config";
import { createSound, describe, type Sound } from "../../lib/arcade/sound";
import { isRetro, setRetro } from "../../lib/retro";
import EscapeLayer from "./EscapeLayer";

// Borne d'arcade du jeu caché : Snake avec cases spéciales, évasion dans le site, mode sonore et mode 8-bit.
const W = 24, H = 16, CELL = 24;
const KEYS: Record<string, Dir> = {
  ArrowUp: "U", ArrowDown: "D", ArrowLeft: "L", ArrowRight: "R",
  z: "U", w: "U", s: "D", q: "L", a: "L", d: "R",
};
type Phase = "start" | "play" | "pause" | "escape" | "over";
type Score = { name: string; score: number };

export default function Arcade({ onClose }: { onClose: () => void }) {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const g = useRef<Game>(newGame(W, H));
  const [phase, setPhase] = useState<Phase>("start");
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [sfx, setSfx] = useState(false);
  const [audioMode, setAudioMode] = useState(false);
  const [retro, setRetroState] = useState(isRetro());
  const [say, setSay] = useState("");
  const [best, setBest] = useState<Score[] | null>(null);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const sound = useRef<Sound | null>(null);
  const calm = typeof matchMedia === "function" && (matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("calm"));

  const snd = () => (sfx || audioMode ? (sound.current ??= createSound()) : null);
  useEffect(() => () => sound.current?.close(), []);

  const draw = useCallback(() => {
    const ctx = canvas.current?.getContext?.("2d");
    if (!ctx) return;
    const s = g.current;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      ctx.fillStyle = (x + y) % 2 ? "#0B1220" : "#0E1729";
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
    ctx.fillStyle = POWERS.pomme.color;
    ctx.fillRect(s.food.x * CELL + 3, s.food.y * CELL + 3, CELL - 6, CELL - 6);
    if (s.special) {
      const p = POWERS[s.special.kind];
      ctx.fillStyle = p.color;
      ctx.fillRect(s.special.p.x * CELL + 1, s.special.p.y * CELL + 1, CELL - 2, CELL - 2);
      ctx.font = `${CELL - 8}px system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(p.symbol, s.special.p.x * CELL + CELL / 2, s.special.p.y * CELL + CELL / 2 + 1);
    }
    const eff = s.effect && s.tick < s.effect.until ? SNAKE_COLORS[s.effect.kind] : undefined;
    const rainbow = active(s, "miroir");
    ctx.globalAlpha = eff?.alpha ?? 1;
    s.snake.forEach((c, i) => {
      ctx.fillStyle = i === 0 ? (eff?.head ?? "#FDE047") : rainbow ? `hsl(${(i * 40 + s.tick * 12) % 360} 90% 60%)` : (eff?.body ?? "#22C55E");
      ctx.fillRect(c.x * CELL + 1, c.y * CELL + 1, CELL - 2, CELL - 2);
    });
    ctx.globalAlpha = 1;
  }, []);

  // Boucle de jeu.
  useEffect(() => {
    draw();
    if (phase !== "play") return;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const s = step(g.current);
      const so = snd();
      for (const e of s.events.splice(0)) {
        if (e === "pomme") so?.eat();
        else if (e === "mort") so?.die();
        else if (e === "fin") setSay(fr ? "Effet terminé" : "انتهى المفعول");
        else if (e === "special") setSay(fr ? `Case spéciale : ${POWERS[s.special!.kind].fr}` : `مربع خاص: ${POWERS[s.special!.kind].ar}`);
        else if (e in POWERS) { so?.power(); setSay(fr ? `${POWERS[e as keyof typeof POWERS].fr} : ${POWERS[e as keyof typeof POWERS].desc}` : POWERS[e as keyof typeof POWERS].ar); }
      }
      if (audioMode && s.tick % 3 === 0) so?.guide(s.food.x - s.snake[0].x, s.food.y - s.snake[0].y, W + H);
      draw(); force();
      if (s.over) { setPhase("over"); return; }
      if (s.escape) { setPhase("escape"); return; }
      t = setTimeout(tick, speedMs(s, calm));
    };
    t = setTimeout(tick, speedMs(g.current, calm));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, audioMode, sfx]);

  useEffect(() => {
    if (phase !== "over") return;
    setSaved(false);
    api<Score[]>("/api/scores").then(setBest).catch(() => setBest([]));
  }, [phase]);

  useEffect(() => { if (phase !== "escape") dialog.current?.querySelector<HTMLElement>("[data-focus]")?.focus(); }, [phase]);

  const start = () => { g.current = newGame(W, H); setSay(""); setPhase("play"); dialog.current?.focus(); };
  const close = () => { setPhase("pause"); onClose(); };

  function onKey(e: KeyboardEvent) {
    if (phase === "escape") return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (phase === "play" && KEYS[k] && !(e.target instanceof HTMLInputElement)) { e.preventDefault(); turn(g.current, KEYS[k]); return; }
    if (e.key === " " && (phase === "play" || phase === "pause") && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); setPhase(phase === "play" ? "pause" : "play"); return; }
    if (k === "h" && phase !== "over" && !(e.target instanceof HTMLInputElement)) {
      const s = g.current; setSay(describe(s.food.x - s.snake[0].x, s.food.y - s.snake[0].y, lang));
    }
    if (e.key === "Tab" && dialog.current) {
      const f = [...dialog.current.querySelectorAll<HTMLElement>("button:not([disabled]), input")];
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  }

  // Clavier écouté sur toute la page tant que la borne est ouverte (le bouton JOUER disparaît au démarrage).
  const keyRef = useRef(onKey);
  keyRef.current = onKey;
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[A-Za-z]{3}$/.test(name)) return;
    try { setBest(await api<Score[]>("/api/scores", { method: "POST", body: JSON.stringify({ name: name.toUpperCase(), score: g.current.score }) })); setSaved(true); }
    catch { setSay(fr ? "Score non enregistré (hors ligne)" : "لم يُحفظ الرصيد"); }
  }

  const s = g.current;
  const eff = s.effect && s.tick < s.effect.until && TIMED.includes(s.effect.kind) ? s.effect : null;
  const pct = eff ? Math.max(0, Math.round(((eff.until - s.tick) / (eff.kind === "sablier" ? 30 : 40)) * 100)) : 0;
  const dpad = (d: Dir, label: string, sym: string) => (
    <button type="button" aria-label={label} className={`arc-pad arc-${d}`} onClick={() => { if (phase === "play") turn(g.current, d); }}>{sym}</button>
  );

  return (
    <>
      <div className="arc-backdrop" data-arcade hidden={phase === "escape"}>
        <section ref={dialog} className="arc" role="dialog" aria-modal="true" aria-labelledby="arc-titre" tabIndex={-1}>
          <div className="arc-head">
            <h2 id="arc-titre">FST SNAKE</h2>
            <button type="button" className="arc-x" aria-label={fr ? "Quitter le jeu" : "الخروج من اللعبة"} onClick={close}>×</button>
          </div>
          <dl className="arc-hud">
            <div><dt>SCORE</dt><dd>{String(s.score).padStart(4, "0")}</dd></div>
            <div><dt>{fr ? "NIVEAU" : "المستوى"}</dt><dd>{s.level}</dd></div>
            <div><dt>{fr ? "TAILLE" : "الطول"}</dt><dd>{s.snake.length}</dd></div>
          </dl>
          <div className="arc-effect" style={{ color: eff ? POWERS[eff.kind].color : undefined }}>
            <span>{eff ? `${POWERS[eff.kind].symbol} ${fr ? POWERS[eff.kind].fr : POWERS[eff.kind].ar}`.toUpperCase() : fr ? "NORMAL" : "عادي"}</span>
            <span className="arc-bar" aria-hidden="true"><span style={{ width: `${pct}%`, background: eff ? POWERS[eff.kind].color : undefined }} /></span>
          </div>
          <div className="arc-screen">
            <canvas ref={canvas} width={W * CELL} height={H * CELL} role="img"
              aria-label={fr ? `Plateau de jeu. ${describe(s.food.x - s.snake[0].x, s.food.y - s.snake[0].y, "fr")}. Touche H pour la position.` : "لوحة اللعب. اضغط H لمعرفة موقع التفاحة."} />
            {phase === "start" && (
              <div className="arc-overlay">
                <p className="arc-big">{fr ? "PRÊT ?" : "مستعد؟"}</p>
                <button type="button" data-focus className="arc-btn arc-primary" onClick={start}>{fr ? "JOUER" : "العب"}</button>
                <p>{fr ? "Flèches ou ZQSD · Espace : pause · H : où est la pomme ? · Échap : quitter" : "الأسهم للتوجيه · المسافة للإيقاف · H لموقع التفاحة · Esc للخروج"}</p>
              </div>
            )}
            {phase === "pause" && (
              <div className="arc-overlay"><p className="arc-big">PAUSE</p>
                <button type="button" data-focus className="arc-btn arc-primary" onClick={() => { setPhase("play"); dialog.current?.focus(); }}>{fr ? "REPRENDRE" : "متابعة"}</button></div>
            )}
            {phase === "over" && (
              <div className="arc-overlay arc-over">
                <p className="arc-big arc-red">GAME OVER</p>
                <p className="arc-score">{String(s.score).padStart(4, "0")}</p>
                {!saved ? (
                  <form onSubmit={save} className="arc-save">
                    <label htmlFor="arc-nom">{fr ? "VOS INITIALES" : "حروفك الثلاثة"}</label>
                    <input id="arc-nom" data-focus value={name} maxLength={3} pattern="[A-Za-z]{3}" autoComplete="off" lang="en" dir="ltr"
                      onChange={(e) => setName(e.target.value.replace(/[^A-Za-z]/g, "").toUpperCase())} />
                    <button type="submit" className="arc-btn arc-primary" disabled={name.length !== 3}>{fr ? "ENREGISTRER" : "حفظ"}</button>
                  </form>
                ) : null}
                <button type="button" className="arc-btn" onClick={start}>{fr ? "REJOUER" : "إعادة"}</button>
                {best && best.length > 0 && (
                  <table className="arc-table">
                    <caption>{fr ? "MEILLEURS SCORES" : "أفضل النتائج"}</caption>
                    <thead><tr><th scope="col">#</th><th scope="col">{fr ? "NOM" : "الاسم"}</th><th scope="col">SCORE</th></tr></thead>
                    <tbody>{best.slice(0, 5).map((b, i) => <tr key={i}><td>{i + 1}</td><td>{b.name}</td><td>{b.score}</td></tr>)}</tbody>
                  </table>
                )}
              </div>
            )}
          </div>
          <p className="sr-only" aria-live="polite">{say}</p>
          <div className="arc-controls">
            <div className="arc-dpad" role="group" aria-label={fr ? "Croix directionnelle" : "أزرار الاتجاه"}>
              {dpad("U", fr ? "Haut" : "أعلى", "▲")}{dpad("L", fr ? "Gauche" : "يسار", "◀")}{dpad("R", fr ? "Droite" : "يمين", "▶")}{dpad("D", fr ? "Bas" : "أسفل", "▼")}
            </div>
            <div className="arc-opts">
              <button type="button" className="arc-btn" aria-pressed={phase === "pause"} disabled={phase !== "play" && phase !== "pause"}
                onClick={() => { setPhase(phase === "play" ? "pause" : "play"); dialog.current?.focus(); }}>PAUSE</button>
              <button type="button" className="arc-btn" aria-pressed={sfx} onClick={() => setSfx(!sfx)}>{fr ? "SON" : "الصوت"}</button>
              <button type="button" className="arc-btn" aria-pressed={audioMode} onClick={() => setAudioMode(!audioMode)}>🎧 {fr ? "MODE SONORE" : "وضع صوتي"}</button>
              <button type="button" className="arc-btn" aria-pressed={retro} onClick={() => { setRetro(!retro); setRetroState(!retro); }}>{fr ? "SITE 8-BIT" : "الموقع 8-bit"}</button>
            </div>
          </div>
          <ul className="arc-legend" aria-label={fr ? "Cases spéciales" : "المربعات الخاصة"}>
            {(Object.keys(POWERS) as (keyof typeof POWERS)[]).map((k) => (
              <li key={k}><span aria-hidden="true" style={{ background: POWERS[k].color }}>{POWERS[k].symbol}</span>{fr ? `${POWERS[k].fr} : ${POWERS[k].desc}` : POWERS[k].ar}</li>
            ))}
          </ul>
        </section>
      </div>
      {phase === "escape" && (
        <EscapeLayer sound={snd()} onEnd={(eaten, won) => { endEscape(g.current, eaten, won); setSay(won ? (fr ? "Phrase mystère complète ! +500" : "اكتملت الجملة السرية! +500") : ""); setPhase("play"); }} />
      )}
    </>
  );
}
