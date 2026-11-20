import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import defis from "../data/defis.json";
import { kb } from "../../../../shared/rafiq/search.js";
import { useI18n } from "../lib/i18n";
import { useSobre } from "../lib/sobre";
import { runChecks, grade } from "../lib/security";
import { estimate, measure } from "../lib/eco";
import { hasWebGL } from "../lib/village/webgl";
import {
  BUILDINGS, buildingStates, countdown, defisRendus, intentFor, litWindows, phaseAt,
  type BuildingId, type Metrics, type Phase,
} from "../lib/village/model";
import type { Village as Scene } from "../lib/village/scene";

const TXT = {
  fr: {
    title: "Le village du site en 3D", intro: "Chaque bâtiment montre l'état réel du site, mesuré à l'instant. Pendant la Nuit de l'Info, le soleil se couche à 15h39 et chaque défi rendu allume des fenêtres.",
    load: "Charger la 3D (environ 150 Ko)", loading: "Chargement de la scène…", error: "La 3D n'a pas pu démarrer : le contenu reste disponible ci-dessous.",
    sober: "Mode sobre : la 3D n'est pas chargée. Tout le contenu est dans la liste.", noGl: "Votre appareil n'affiche pas la 3D (WebGL). Tout le contenu est dans la liste.",
    sky: "Ciel", auto: "Heure de Nouakchott", day: "Jour", dusk: "Coucher (15h39)", night: "Nuit",
    rotL: "Tourner à gauche", rotR: "Tourner à droite", reset: "Vue d'ensemble",
    buildings: "Les bâtiments", events: "Événements", replayForm: "Rejouer : une mission arrive", replayRafiq: "Rejouer : Rafiq répond",
    jury: "Démo jury : retirer la CSP", ask: "Demander à Rafiq où aller", askBtn: "Rafiq, montre-moi", askPh: "Le site est-il bien protégé ?",
    notFound: "Rafiq ne sait pas quel bâtiment montrer. Essayez « sécurité », « écologie » ou « accessibilité ».",
    rendus: (n: number, t: number) => `${n} défi(s) rendu(s) sur ${t}`, open: "Ouvrir la page",
    before: (m: string) => `La nuit commence dans ${m}`, left: (m: string) => `Fin de la nuit dans ${m}`,
    status: (p: Phase, lit: number) => `${p === "night" ? "Nuit" : p === "dusk" ? "Coucher de soleil" : "Jour"} · ${lit} fenêtre(s) allumée(s)`,
    newForm: "Nouvelle mission reçue : la lumière court vers le silo.", newQ: "Nouvelle question pour Rafiq : son antenne émet.",
    canvas: "Vue 3D du village (décorative, le même contenu est dans la liste)",
  },
  ar: {
    title: "قرية الموقع ثلاثية الأبعاد", intro: "كل مبنى يُظهر الحالة الحقيقية للموقع، مقيسة الآن. خلال ليلة المعلوميات تغرب الشمس على الساعة 15:39 وكل تحدٍّ نسلّمه يضيء نوافذ.",
    load: "تحميل الـ3D (حوالي 150 كيلوبايت)", loading: "جارٍ تحميل المشهد…", error: "تعذّر تشغيل الـ3D: المحتوى متاح في القائمة أدناه.",
    sober: "الوضع الخفيف: لم تُحمَّل الـ3D. كل المحتوى في القائمة.", noGl: "جهازك لا يعرض الـ3D (WebGL). كل المحتوى في القائمة.",
    sky: "السماء", auto: "توقيت نواكشوط", day: "نهار", dusk: "غروب (15:39)", night: "ليل",
    rotL: "تدوير إلى اليسار", rotR: "تدوير إلى اليمين", reset: "نظرة شاملة",
    buildings: "المباني", events: "الأحداث", replayForm: "إعادة: وصول مهمة", replayRafiq: "إعادة: رفيق يجيب",
    jury: "عرض للجنة: حذف CSP", ask: "اسأل رفيق إلى أين نذهب", askBtn: "رفيق، أرِني", askPh: "هل الموقع آمن؟",
    notFound: "لم يعرف رفيق أي مبنى يُظهر. جرّب «الأمان» أو «البيئة» أو «سهولة الوصول».",
    rendus: (n: number, t: number) => `${n} تحدٍّ مسلَّم من ${t}`, open: "فتح الصفحة",
    before: (m: string) => `تبدأ الليلة بعد ${m}`, left: (m: string) => `تنتهي الليلة بعد ${m}`,
    status: (p: Phase, lit: number) => `${p === "night" ? "ليل" : p === "dusk" ? "غروب" : "نهار"} · ${lit} نافذة مضاءة`,
    newForm: "وصلت مهمة جديدة: الضوء يجري نحو الصومعة.", newQ: "سؤال جديد لرفيق: هوائيه يبث.",
    canvas: "مشهد القرية ثلاثي الأبعاد (للزينة، نفس المحتوى في القائمة)",
  },
};

const fmt = (min: number, ar: boolean) => {
  const h = Math.floor(min / 60), m = min % 60;
  if (h >= 48) return ar ? `${Math.round(h / 24)} يوماً` : `${Math.round(h / 24)} jours`;
  return ar ? `${h} س ${m} د` : `${h} h ${String(m).padStart(2, "0")}`;
};

export default function Village() {
  const { lang } = useI18n();
  const T = TXT[lang];
  const ar = lang === "ar";
  const { sobre } = useSobre();
  const gl = useMemo(hasWebGL, []);
  const reduced = useMemo(() => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  const [now, setNow] = useState(() => new Date());
  const [mode, setMode] = useState<"auto" | Phase>("auto");
  const [breach, setBreach] = useState(false);
  const [selected, setSelected] = useState<BuildingId | null>(null);
  const [want3d, setWant3d] = useState(!sobre && gl);
  const [state3d, setState3d] = useState<"off" | "loading" | "ready" | "error">("off");
  const [announce, setAnnounce] = useState("");
  const [question, setQuestion] = useState("");
  const [metrics, setMetrics] = useState<Metrics>(() => ({
    secOk: null, secTotal: 9, secGrade: null, secMissing: [], eco: null, ecoGrade: null,
    sansReponse: null, fiches: null, demandes: null, rendus: defisRendus(defis), defisTotal: defis.length,
  }));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const prev = useRef<{ demandes: number | null; sansReponse: number | null }>({ demandes: null, sansReponse: null });

  const phase: Phase = mode === "auto" ? phaseAt(now) : mode;
  const states = buildingStates(metrics, breach);
  const lit = litWindows(sceneRef.current?.windowCount ?? 40, metrics.rendus, metrics.defisTotal, phase);
  const cd = countdown(now);

  // horloge (pour la phase automatique et le compte à rebours)
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(id); }, []);

  // mesures réelles : protections, EcoIndex, compteurs de l'API (sondés toutes les 20 s)
  useEffect(() => {
    let alive = true;
    runChecks().then((c) => alive && setMetrics((m) => ({ ...m, secOk: c.filter((x) => x.ok).length, secTotal: c.length, secGrade: grade(c), secMissing: c.filter((x) => !x.ok).map((x) => x.label) }))).catch(() => {});
    const eco = setTimeout(() => { if (alive) { const r = estimate(measure()); setMetrics((m) => ({ ...m, eco: r.score, ecoGrade: r.grade })); } }, 1500);
    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch("/api/village", { cache: "no-store" });
        if (!r.ok) return;
        const d = (await r.json()) as { demandes: number; sansReponse: number; fiches: number };
        if (!alive) return;
        const p = prev.current;
        if (p.demandes !== null && d.demandes > p.demandes) { sceneRef.current?.pulse("form"); setAnnounce(TXT[document.documentElement.lang === "ar" ? "ar" : "fr"].newForm); }
        if (p.sansReponse !== null && d.sansReponse !== p.sansReponse) sceneRef.current?.pulse("rafiq");
        prev.current = { demandes: d.demandes, sansReponse: d.sansReponse };
        setMetrics((m) => ({ ...m, ...d }));
      } catch { /* hors ligne : les bâtiments l'indiquent */ }
    };
    poll();
    const id = setInterval(poll, 20_000);
    return () => { alive = false; clearTimeout(eco); clearInterval(id); };
  }, []);

  const pick = useCallback((id: BuildingId) => {
    setSelected(id);
    sceneRef.current?.flyTo(id);
  }, []);

  // chargement paresseux de three.js
  useEffect(() => {
    if (!want3d || !canvasRef.current) return;
    let disposed = false;
    setState3d("loading");
    import("../lib/village/scene")
      .then(({ createVillage }) => {
        if (disposed || !canvasRef.current) return;
        sceneRef.current = createVillage(canvasRef.current, { reducedMotion: reduced, onPick: pick });
        setState3d("ready");
      })
      .catch(() => setState3d("error"));
    return () => { disposed = true; sceneRef.current?.dispose(); sceneRef.current = null; };
  }, [want3d, reduced, pick]);

  useEffect(() => {
    sceneRef.current?.update({ phase, lit, breach, states });
  }); // à chaque rendu : la scène ne recalcule que ce qui change

  const onAsk = (e: FormEvent) => {
    e.preventDefault();
    const id = intentFor(question || T.askPh);
    if (!id) { setAnnounce(T.notFound); return; }
    pick(id);
    sceneRef.current?.pulse("rafiq");
    setAnnounce(`${ar ? BUILDINGS.find((b) => b.id === id)!.ar : BUILDINGS.find((b) => b.id === id)!.fr}`);
  };

  const sel = BUILDINGS.find((b) => b.id === selected);
  const fiche = sel ? kb.find((f) => f.id === sel.fiche) : undefined;
  const phases: ["auto" | Phase, string][] = [["auto", T.auto], ["day", T.day], ["dusk", T.dusk], ["night", T.night]];

  return (
    <section className="stack v3d" lang={lang} dir={ar ? "rtl" : "ltr"}>
      <h1>{T.title}</h1>
      <p>{T.intro}</p>
      <p className="v3d-meta">
        <span>{T.rendus(metrics.rendus, metrics.defisTotal)}</span>
        {cd && <span>{cd.label === "avant" ? T.before(fmt(cd.minutes, ar)) : T.left(fmt(cd.minutes, ar))}</span>}
      </p>

      <div className="v3d-layout">
        <div className="v3d-stage-col">
          <div className={`v3d-stage v3d-${phase}`}>
            {want3d ? (
              <canvas ref={canvasRef} className="v3d-canvas" aria-hidden="true" title={T.canvas} />
            ) : (
              <div className="v3d-off">
                <p>{!gl ? T.noGl : T.sober}</p>
                {gl && <button type="button" onClick={() => setWant3d(true)}>{T.load}</button>}
              </div>
            )}
            {state3d === "loading" && <p className="v3d-overlay" role="status">{T.loading}</p>}
            {state3d === "error" && <p className="v3d-overlay" role="alert">{T.error}</p>}
          </div>

          <div className="v3d-controls">
            <div role="group" aria-label={T.sky} className="v3d-seg">
              {phases.map(([k, label]) => (
                <button key={k} type="button" aria-pressed={mode === k} onClick={() => setMode(k)}>{label}</button>
              ))}
            </div>
            {want3d && (
              <div className="v3d-seg">
                <button type="button" onClick={() => sceneRef.current?.rotate(-1)} aria-label={T.rotL}>⟲</button>
                <button type="button" onClick={() => { setSelected(null); sceneRef.current?.flyTo(null); }}>{T.reset}</button>
                <button type="button" onClick={() => sceneRef.current?.rotate(1)} aria-label={T.rotR}>⟳</button>
              </div>
            )}
          </div>

          <form className="v3d-ask" onSubmit={onAsk}>
            <label htmlFor="v3d-q">{T.ask}</label>
            <div>
              <input id="v3d-q" value={question} placeholder={T.askPh} onChange={(e) => setQuestion(e.target.value)} />
              <button type="submit">{T.askBtn}</button>
            </div>
          </form>
          <p className="v3d-status" aria-live="polite">{T.status(phase, lit)}{announce ? ` · ${announce}` : ""}</p>
        </div>

        <aside className="v3d-side">
          <h2>{T.buildings}</h2>
          <ul className="v3d-list">
            {states.map((s) => {
              const b = BUILDINGS.find((x) => x.id === s.id)!;
              return (
                <li key={s.id}>
                  <button type="button" aria-pressed={selected === s.id} className={`v3d-b v3d-${s.id}${s.alert ? (s.id === "rafiq" ? " is-notice" : " is-alert") : ""}`} onClick={() => pick(s.id)}>
                    <span className="v3d-dot" aria-hidden="true" />
                    <span><strong>{ar ? b.ar : b.fr}</strong><span className="v3d-sub">{ar ? s.ar : s.fr}</span></span>
                  </button>
                </li>
              );
            })}
          </ul>

          {sel && fiche && (
            <article className="v3d-fiche" aria-live="polite">
              <h3>{fiche.titre[lang]}</h3>
              <p>{fiche.texte[lang]}</p>
              <Link to={sel.route}>{T.open} →</Link>
            </article>
          )}

          <h2>{T.events}</h2>
          <div className="v3d-events">
            <button type="button" onClick={() => { sceneRef.current?.pulse("form"); setAnnounce(T.newForm); }}>{T.replayForm}</button>
            <button type="button" onClick={() => { sceneRef.current?.pulse("rafiq"); setAnnounce(T.newQ); }}>{T.replayRafiq}</button>
            <label className="v3d-jury">
              <input type="checkbox" role="switch" checked={breach} onChange={(e) => setBreach(e.target.checked)} />
              {T.jury}
            </label>
          </div>
        </aside>
      </div>
    </section>
  );
}
