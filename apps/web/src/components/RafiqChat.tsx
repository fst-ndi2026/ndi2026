import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../lib/i18n";
import { askRafiq, nanoState, rafiqStats, type NanoState, type Reply, type Stats } from "../lib/rafiq";
import { kb, SUGGESTIONS } from "../../../../shared/rafiq/search.js";
import type { PersonaId } from "../../../../shared/rafiq/index";

const T = {
  fr: {
    notice: "Vous échangez avec une intelligence artificielle. Ses réponses peuvent contenir des erreurs.",
    hello: "Bonjour ! Je réponds aux questions sur ce site et je cite mes sources.",
    label: "Votre question", placeholder: "Posez votre question…", send: "Envoyer", thinking: "Rafiq réfléchit…",
    persona: "Personnalité", personas: { serieux: "Sérieux", prof: "Prof", bruti: "Chat'bruti" },
    source: "Source", how: "Comment je fonctionne", back: "Retour à la conversation",
    tag: { llm: "Réponse IA · Claude (en ligne)", nano: "Réponse IA · Gemini Nano (sur votre appareil)", offline: "Réponse tirée des fiches du site (hors ligne)" },
    intro: "Je choisis automatiquement le meilleur cerveau disponible. Si l'un ne répond pas, je passe au suivant : je réponds toujours.",
    brains: [
      ["Claude, en ligne", "Le plus précis. Utilisé si la clé du serveur est configurée."],
      ["Gemini Nano, dans Chrome", "Tourne sur votre ordinateur, gratuit, sans envoyer vos questions."],
      ["Recherche hors ligne", "Retrouve le passage exact du site. Marche même sans réseau."],
    ],
    ready: "Prêt", off: "Non configuré", nano: { available: "Disponible", downloadable: "À télécharger", downloading: "Téléchargement…", unavailable: "Indisponible", absent: "Absent de ce navigateur" }, always: "Toujours prête",
    stats: ["Fiches connues", "Langues", "Sans réponse"],
    rules: ["Je réponds seulement à partir du contenu du site, et je cite la page source.", "Votre texte est traité comme une donnée, jamais comme une instruction.", "Les questions restées sans réponse sont gardées, sans e-mail ni numéro, pour améliorer mes fiches."],
  },
  ar: {
    notice: "أنت تتحدث مع ذكاء اصطناعي، وقد تحتوي إجاباته على أخطاء.",
    hello: "مرحباً! أجيب عن الأسئلة حول هذا الموقع وأذكر مصادري.",
    label: "سؤالك", placeholder: "اكتب سؤالك…", send: "إرسال", thinking: "رفيق يفكّر…",
    persona: "الشخصية", personas: { serieux: "جادّ", prof: "معلّم", bruti: "Chat'bruti" },
    source: "المصدر", how: "كيف أعمل", back: "العودة إلى المحادثة",
    tag: { llm: "إجابة ذكاء اصطناعي · Claude (عبر الإنترنت)", nano: "إجابة ذكاء اصطناعي · Gemini Nano (على جهازك)", offline: "إجابة من بطاقات الموقع (بلا إنترنت)" },
    intro: "أختار تلقائياً أفضل عقل متاح، وإن لم يُجب أحدها أنتقل إلى التالي: أجيب دائماً.",
    brains: [
      ["Claude عبر الإنترنت", "الأدق، يُستعمل إن كان مفتاح الخادم مضبوطاً."],
      ["Gemini Nano داخل Chrome", "يعمل على حاسوبك، مجاناً، دون إرسال أسئلتك."],
      ["بحث بلا إنترنت", "يجد الفقرة المناسبة من الموقع، ويعمل حتى دون شبكة."],
    ],
    ready: "جاهز", off: "غير مضبوط", nano: { available: "متاح", downloadable: "يحتاج تنزيلاً", downloading: "جارٍ التنزيل…", unavailable: "غير متاح", absent: "غير موجود في هذا المتصفح" }, always: "جاهز دائماً",
    stats: ["البطاقات", "اللغات", "بلا إجابة"],
    rules: ["أجيب فقط من محتوى الموقع، وأذكر الصفحة المصدر.", "نصّك يُعامل كمعطى، لا كأمر.", "تُحفظ الأسئلة التي لم أجد لها إجابة، دون بريد أو رقم، لتحسين بطاقاتي."],
  },
};

type Msg = { who: "user" | "bot"; text: string; reply?: Reply };

export default function RafiqChat({ autoFocus = false }: { autoFocus?: boolean }) {
  const { lang } = useI18n();
  const t = T[lang];
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [persona, setPersona] = useState<PersonaId>("serieux");
  const [view, setView] = useState<"chat" | "how">("chat");
  const [info, setInfo] = useState<{ stats: Stats | null; nano: NanoState } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => { if (autoFocus) input.current?.focus(); }, [autoFocus]);
  useEffect(() => { log.current?.scrollTo?.({ top: log.current.scrollHeight }); }, [msgs, busy]);
  useEffect(() => {
    if (view !== "how") return;
    Promise.all([rafiqStats().catch(() => null), nanoState()]).then(([stats, nano]) => setInfo({ stats, nano }));
  }, [view]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setQ("");
    setMsgs((m) => [...m, { who: "user", text: question }]);
    setBusy(true);
    const reply = await askRafiq(question, persona);
    setMsgs((m) => [...m, { who: "bot", text: reply.answer, reply }]);
    setBusy(false);
    input.current?.focus();
  }
  const submit = (e: FormEvent) => { e.preventDefault(); send(q); };

  if (view === "how") {
    const nano = info?.nano ?? "absent";
    const status = [
      info?.stats?.ai ? [t.ready, "ok"] : [t.off, "muted"],
      [t.nano[nano], nano === "available" ? "ok" : "muted"],
      [t.always, "ok"],
    ];
    return (
      <div className="rq-body rq-how">
        <button type="button" className="rq-link" onClick={() => setView("chat")}>← {t.back}</button>
        <h3>{t.how}</h3>
        <p>{t.intro}</p>
        <ol className="rq-brains">
          {t.brains.map(([name, desc], i) => (
            <li key={name}><span className="rq-num" aria-hidden="true">{i + 1}</span>
              <div><strong>{name}</strong><p>{desc}</p></div>
              <strong className={`rq-state ${status[i][1]}`}>{status[i][0]}</strong></li>
          ))}
        </ol>
        <dl className="rq-stats">
          <div><dt>{t.stats[0]}</dt><dd>{info?.stats?.fiches ?? kb.length}</dd></div>
          <div><dt>{t.stats[1]}</dt><dd>FR · AR</dd></div>
          <div><dt>{t.stats[2]}</dt><dd>{info?.stats?.sansReponse ?? "–"}</dd></div>
        </dl>
        <ul className="rq-rules">{t.rules.map((r) => <li key={r}>{r}</li>)}</ul>
      </div>
    );
  }

  return (
    <div className="rq-body">
      <p className="rq-notice">{t.notice}</p>
      <div role="radiogroup" aria-label={t.persona} className="rq-personas">
        {(["serieux", "prof", "bruti"] as PersonaId[]).map((p) => (
          <button key={p} type="button" role="radio" aria-checked={persona === p} onClick={() => setPersona(p)}>{t.personas[p]}</button>
        ))}
      </div>
      <div ref={log} role="log" aria-live="polite" aria-relevant="additions" className="rq-log">
        <p className="rq-msg rq-bot">{t.hello}</p>
        {msgs.map((m, i) => m.who === "user"
          ? <p key={i} className="rq-msg rq-user">{m.text}</p>
          : (
            <div key={i} className="rq-msg rq-bot" lang={m.reply?.lang} dir={m.reply?.lang === "ar" ? "rtl" : "ltr"}>
              <p>{m.text}</p>
              <div className="rq-meta">
                {m.reply?.refs.map((id) => {
                  const f = kb.find((k) => k.id === id);
                  return f ? <Link key={id} to={f.url} className="rq-src">{t.source} : {f.titre[m.reply!.lang]}</Link> : null;
                })}
                <span>{t.tag[m.reply!.source]}</span>
              </div>
            </div>
          ))}
        {busy && <p className="rq-msg rq-bot" aria-busy="true">{t.thinking}</p>}
      </div>
      <div className="rq-suggest">
        {SUGGESTIONS[lang].map((s) => <button key={s} type="button" onClick={() => send(s)} disabled={busy}>{s}</button>)}
      </div>
      <form className="rq-form" onSubmit={submit}>
        <label htmlFor="rq-q" className="sr-only">{t.label}</label>
        <input id="rq-q" ref={input} value={q} onChange={(e) => setQ(e.target.value)} maxLength={500} placeholder={t.placeholder} autoComplete="off" />
        <button type="submit" aria-label={t.send} disabled={busy || !q.trim()}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rq-send"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
        </button>
      </form>
      <button type="button" className="rq-link" onClick={() => setView("how")}>{t.how}</button>
    </div>
  );
}
