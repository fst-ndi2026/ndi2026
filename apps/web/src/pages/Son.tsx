import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import "../styles/son.css";
import { useI18n } from "../lib/i18n";
import { useSobre } from "../lib/sobre";
import { hasWebGL } from "../lib/village/webgl";
import { buildingStates, defisRendus } from "../lib/village/model";
import type { Village as Scene } from "../lib/village/scene";
import defis from "../data/defis.json";
import { MODES, SILENCE, bands, loudest, modeFor, smooth, type Bands, type Mode } from "../lib/son/audio";
import { Sand, field, seeded } from "../lib/son/chladni";
import type { AudioEngine, Source } from "../lib/son/sources";

const GRAINS = 2600;
const WIN = 0.5, BASE = 0.14; // calibrés : figure juste ≈ 0,5 en 5 s ; mauvaise figure ≤ 0,22

const TXT = {
  fr: {
    title: "Visualisation audio : le son qu'on peut voir",
    intro: "Une plaque recouverte de sable vibre avec votre son. Le sable fuit les zones qui bougent et dessine les lignes immobiles : chaque note dessine sa propre figure (figures de Chladni, 1787). Ou bien faites danser notre village.",
    tabSable: "Le sable qui chante", tabVillage: "Le village danse",
    source: "Source du son", micro: "Micro", fichier: "Fichier audio", generateur: "Générateur",
    micBtn: "Écouter le micro", micDenied: "Micro refusé ou absent : essayez le générateur ou un fichier.",
    fileLabel: "Choisir un fichier audio (il reste sur votre appareil)", fileErr: "Ce fichier n'a pas pu être lu.",
    privacy: "Rien n'est enregistré ni envoyé : le son est analysé dans votre navigateur.",
    notes: "Notes du générateur", stop: "Arrêter le son", shake: "Secouer le sable",
    now: (m: Mode | null) => (m ? `Figure actuelle : ${m.fr} (${m.n} × ${m.m})` : "Silence : le sable est immobile."),
    plate: "Plaque de Chladni : le sable dessine la figure de la note jouée",
    play: "Jouer : reproduis la figure", target: (m: Mode) => `Figure à reproduire (indice : ${m.fr})`, score: "Ressemblance",
    won: "Bravo ! Le sable a dessiné la figure demandée.", again: "Nouvelle figure",
    why: "Pourquoi ça marche ?", whyText: "Une note fait vibrer la plaque en « cases » qui montent et descendent. Entre deux cases, une ligne reste immobile. Le sable, secoué partout ailleurs, finit par s'y poser. Plus la note est aiguë, plus les cases sont petites et la figure fine.",
    village: "Le village du site danse : graves = les bâtiments sautent, médiums = la lumière court plus vite dans les tuyaux, aigus = les fenêtres flashent.",
    noVillage: "Le village 3D n'est pas disponible ici (mode sobre ou WebGL absent) : le sable, lui, fonctionne.",
    loading: "Chargement du village…", meters: "Niveaux", bass: "Graves", mid: "Médiums", treble: "Aigus",
  },
  ar: {
    title: "تصوّر الصوت: صوت يمكن رؤيته",
    intro: "صفيحة مغطاة بالرمل تهتز مع صوتك. يهرب الرمل من المناطق المتحركة ويرسم الخطوط الساكنة: كل نغمة ترسم شكلها الخاص (أشكال كلادني، 1787). أو اجعل قريتنا ترقص.",
    tabSable: "الرمل الذي يغني", tabVillage: "القرية ترقص",
    source: "مصدر الصوت", micro: "الميكروفون", fichier: "ملف صوتي", generateur: "المولّد",
    micBtn: "الاستماع إلى الميكروفون", micDenied: "الميكروفون مرفوض أو غير موجود: جرّب المولّد أو ملفاً.",
    fileLabel: "اختر ملفاً صوتياً (يبقى على جهازك)", fileErr: "تعذّرت قراءة هذا الملف.",
    privacy: "لا شيء يُسجَّل أو يُرسَل: يُحلَّل الصوت داخل متصفحك.",
    notes: "نغمات المولّد", stop: "إيقاف الصوت", shake: "هزّ الرمل",
    now: (m: Mode | null) => (m ? `الشكل الحالي: ${m.ar} (${m.n} × ${m.m})` : "صمت: الرمل ساكن."),
    plate: "صفيحة كلادني: الرمل يرسم شكل النغمة المعزوفة",
    play: "العب: أعِد رسم الشكل", target: (m: Mode) => `الشكل المطلوب (تلميح: ${m.ar})`, score: "التشابه",
    won: "أحسنت! رسم الرمل الشكل المطلوب.", again: "شكل جديد",
    why: "لماذا يعمل هذا؟", whyText: "النغمة تجعل الصفيحة تهتز في «خانات» تصعد وتنزل. بين خانتين يبقى خط ساكن. الرمل، المهتز في كل مكان آخر، يستقر عليه في النهاية. كلما كانت النغمة أحدّ صغرت الخانات ودقّ الشكل.",
    village: "قرية الموقع ترقص: الأصوات المنخفضة = المباني تقفز، المتوسطة = الضوء يجري أسرع في الأنابيب، الحادة = النوافذ تومض.",
    noVillage: "القرية ثلاثية الأبعاد غير متاحة هنا (الوضع الخفيف أو غياب WebGL): أما الرمل فيعمل.",
    loading: "جارٍ تحميل القرية…", meters: "المستويات", bass: "منخفض", mid: "متوسط", treble: "حاد",
  },
};

// Dessine la figure-cible (lignes nodales) dans une petite vignette.
function drawTarget(c: HTMLCanvasElement, m: Mode) {
  const g = c.getContext("2d");
  if (!g) return;
  const S = c.width;
  g.fillStyle = "#1c1a2e"; g.fillRect(0, 0, S, S);
  g.fillStyle = "#f4e3b5";
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (Math.abs(field(x / S, y / S, m.n, m.m)) < 0.08) g.fillRect(x, y, 1, 1);
}

export default function Son() {
  const { lang } = useI18n();
  const T = TXT[lang];
  const ar = lang === "ar";
  const { sobre } = useSobre();
  const gl = useMemo(hasWebGL, []);

  const [tab, setTab] = useState<"sable" | "village">("sable");
  const [source, setSource] = useState<Source>("generateur");
  const [note, setNote] = useState<Mode | null>(null); // note jouée par le générateur
  const [shown, setShown] = useState<Mode | null>(null); // figure que le sable dessine
  const [levels, setLevels] = useState<Bands>(SILENCE);
  const [err, setErr] = useState("");
  const [target, setTarget] = useState<Mode | null>(null);
  const [score, setScore] = useState(0);
  const [won, setWon] = useState(false);
  const [village, setVillage] = useState<"off" | "loading" | "ready" | "error">("off");

  const engine = useRef<AudioEngine | null>(null);
  const sand = useRef(new Sand(GRAINS, seeded(7)));
  const plate = useRef<HTMLCanvasElement>(null);
  const targetC = useRef<HTMLCanvasElement>(null);
  const villageC = useRef<HTMLCanvasElement>(null);
  const scene = useRef<Scene | null>(null);
  const live = useRef({ b: SILENCE, energy: 0, mode: null as Mode | null, cand: null as Mode | null, stable: 0, hold: 0, frame: 0 });
  const targetRef = useRef<Mode | null>(null);
  targetRef.current = won ? null : target;

  const getEngine = useCallback(async () => {
    if (!engine.current) engine.current = (await import("../lib/son/sources")).createEngine();
    return engine.current;
  }, []);

  // Dessin du sable : grains clairs sur une plaque sombre.
  const draw = useCallback(() => {
    const c = plate.current, g = c?.getContext("2d");
    if (!c || !g) return;
    const S = c.width, s = sand.current, r = Math.max(1.6, S / 330);
    g.fillStyle = "#1c1a2e"; g.fillRect(0, 0, S, S);
    g.fillStyle = "#f4e3b5";
    for (let i = 0; i < s.count; i++) g.fillRect(s.x[i] * S - r / 2, s.y[i] * S - r / 2, r, r);
  }, []);

  // Boucle d'animation : lire le son → choisir la figure → secouer le sable → dessiner.
  useEffect(() => {
    let raf = 0;
    const buf = new Uint8Array(1024);
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const L = live.current, e = engine.current;
      if (!e) return;
      e.read(buf);
      L.b = smooth(L.b, bands(buf, e.sampleRate, 2048));
      const pk = loudest(buf, e.sampleRate, 2048);
      L.energy += (Math.max(L.b.level, pk?.amp ?? 0) - L.energy) * 0.25;
      const heard = pk ? modeFor(pk.hz) : null;
      // hystérésis : une nouvelle figure seulement si la note tient ~0,15 s
      if (heard !== L.cand) { L.cand = heard; L.stable = 0; } else if (++L.stable === 9 && heard !== L.mode) { L.mode = heard; setShown(heard); }
      if (!heard && L.energy < 0.05 && L.mode) { L.mode = null; setShown(null); }
      if (L.mode) sand.current.step(L.mode.n, L.mode.m, L.energy);
      draw();
      // une note pure du générateur compte comme « graves » ou « aigus » selon sa hauteur
      const g = pk && L.b.level < pk.amp * 0.5 ? (pk.hz < 250 ? { ...L.b, bass: L.energy } : pk.hz < 2000 ? { ...L.b, mid: L.energy, treble: L.energy * 0.6 } : { ...L.b, treble: L.energy }) : L.b;
      scene.current?.dance(L.energy > 0.03 ? g : null);
      if (++L.frame % 6 === 0) setLevels(g);
      const tg = targetRef.current;
      if (tg && L.frame % 10 === 0) {
        const m = sand.current.match(tg.n, tg.m);
        setScore(Math.max(0, Math.min(1, (m - BASE) / (WIN - BASE))));
        L.hold = m >= WIN ? L.hold + 1 : 0;
        if (L.hold >= 3) setWon(true); // gagné si ça tient une demi-seconde
      }
    };
    draw();
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  // Taille du canvas = taille affichée × densité de l'écran.
  useEffect(() => {
    const c = plate.current;
    if (!c || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => { c.width = c.height = Math.round(c.clientWidth * Math.min(2, devicePixelRatio || 1)); draw(); });
    ro.observe(c);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => () => { engine.current?.close(); }, []);

  useEffect(() => { if (target && targetC.current) drawTarget(targetC.current, target); }, [target]);

  // Village : chargé seulement quand on ouvre l'onglet.
  useEffect(() => {
    if (tab !== "village" || sobre || !gl || !villageC.current || scene.current) return;
    let gone = false;
    setVillage("loading");
    import("../lib/village/scene").then(({ createVillage }) => {
      if (gone || !villageC.current) return;
      const reducedMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
      const v = createVillage(villageC.current, { reducedMotion, onPick: () => {} });
      const states = buildingStates({ secOk: 9, secTotal: 9, secGrade: "A+", secMissing: [], eco: null, ecoGrade: null, sansReponse: 0, fiches: null, demandes: null, rendus: defisRendus(defis), defisTotal: defis.length });
      v.update({ phase: "night", lit: Math.round(v.windowCount * 0.7), breach: false, states });
      scene.current = v;
      setVillage("ready");
    }).catch(() => !gone && setVillage("error"));
    return () => { gone = true; };
  }, [tab, sobre, gl]);
  useEffect(() => () => { scene.current?.dispose(); scene.current = null; }, []);

  const playNote = async (m: Mode) => { setErr(""); setSource("generateur"); setNote(m); (await getEngine()).useSynth(m.hz); };
  const stop = () => { engine.current?.stop(); setNote(null); };
  const startMic = async () => {
    setErr(""); setNote(null);
    try { await (await getEngine()).useMic(); } catch { setErr(T.micDenied); }
  };
  const onFile = async (ev: ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    setErr(""); setNote(null);
    try { await (await getEngine()).useFile(f); } catch { setErr(T.fileErr); }
  };
  const newTarget = () => {
    const pool = MODES.filter((m) => m !== target && m !== shown);
    setTarget(pool[Math.floor(Math.random() * pool.length)]);
    setScore(0); setWon(false); live.current.hold = 0;
    sand.current.scatter();
  };

  const meter = (label: string, v: number) => (
    <li key={label}>
      <span>{label}</span>
      <span className="son-bar" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)}>
        <span style={{ inlineSize: `${Math.round(v * 100)}%` }} />
      </span>
    </li>
  );

  return (
    <section className="son" dir={ar ? "rtl" : "ltr"}>
      <h1>{T.title}</h1>
      <p>{T.intro}</p>

      <div className="v3d-seg son-tabs" role="group" aria-label={T.title}>
        <button type="button" aria-pressed={tab === "sable"} onClick={() => setTab("sable")}>{T.tabSable}</button>
        <button type="button" aria-pressed={tab === "village"} onClick={() => setTab("village")}>{T.tabVillage}</button>
      </div>

      <div className="son-layout">
        <div className="son-stage">
          <canvas ref={plate} className="son-plate" role="img" aria-label={T.plate} hidden={tab !== "sable"} />
          {/* le canvas du village reste monté (caché) pour ne pas recréer la scène à chaque onglet */}
          {sobre || !gl ? (tab === "village" && <p className="son-off">{T.noVillage}</p>) : (
            <div className="son-village" hidden={tab !== "village"}>
              <canvas ref={villageC} className="v3d-canvas" aria-hidden="true" />
              {village === "loading" && <p className="son-off">{T.loading}</p>}
              {village === "error" && <p className="son-off">{T.noVillage}</p>}
            </div>
          )}
          <p className="son-now" aria-live="polite">{tab === "village" ? T.village : T.now(shown)}</p>
        </div>

        <div className="son-side">
          <fieldset className="son-box">
            <legend>{T.source}</legend>
            <div className="v3d-seg">
              {(["generateur", "micro", "fichier"] as Source[]).map((s) => (
                <button key={s} type="button" aria-pressed={source === s} onClick={() => { stop(); setSource(s); }}>{T[s]}</button>
              ))}
            </div>
            {source === "generateur" && (
              <div className="son-notes" role="group" aria-label={T.notes}>
                {MODES.map((m) => (
                  <button key={m.id} type="button" aria-pressed={note === m} onClick={() => playNote(m)}>
                    {ar ? m.ar : m.fr} <small>{m.hz} Hz</small>
                  </button>
                ))}
              </div>
            )}
            {source === "micro" && <button type="button" onClick={startMic}>{T.micBtn}</button>}
            {source === "fichier" && (
              <label className="son-file">{T.fileLabel}<input type="file" accept="audio/*" onChange={onFile} /></label>
            )}
            <div className="son-row">
              <button type="button" onClick={stop}>{T.stop}</button>
              <button type="button" onClick={() => { sand.current.scatter(); draw(); }}>{T.shake}</button>
            </div>
            {err && <p role="alert" className="son-err">{err}</p>}
            <p className="son-small">{T.privacy}</p>
          </fieldset>

          <div className="son-box">
            <h2>{T.meters}</h2>
            <ul className="son-meters">{[meter(T.bass, levels.bass), meter(T.mid, levels.mid), meter(T.treble, levels.treble)]}</ul>
          </div>

          {tab === "sable" && (
            <div className="son-box">
              {!target ? <button type="button" onClick={newTarget}>{T.play}</button> : (
                <>
                  <p>{T.target(target)}</p>
                  <canvas ref={targetC} width={120} height={120} className="son-target" role="img" aria-label={T.target(target)} />
                  <label className="son-score">{T.score}<progress max={100} value={Math.round(score * 100)} /></label>
                  {won && <p role="status" className="son-won">{T.won}</p>}
                  <button type="button" onClick={newTarget}>{T.again}</button>
                </>
              )}
            </div>
          )}

          <details className="son-box">
            <summary>{T.why}</summary>
            <p>{T.whyText}</p>
          </details>
        </div>
      </div>
    </section>
  );
}
