import { useEffect, useRef, useState, type FormEvent } from "react";
import { useI18n } from "../lib/i18n";
import { api } from "../lib/api";
import { MISSIONS, AMOUNTS, SKILLS, TOPICS, XP, impact, type Mission } from "../lib/form/config";
import { filledKeys, type Extracted } from "../lib/form/extract";
import { smartFill, dictate, speechSupported } from "../lib/form/smart";
import Glory from "../components/form/Glory";
import BadForm from "../components/form/BadForm";

// Formulaire augmenté : mission au choix, champs adaptés, jauge de gloire, « Dis-le en une phrase », version Bad UI.
type Values = { name: string; email: string; message: string; amount: string; frequency: "once" | "monthly"; phone: string; skills: string[]; topic: string };
const EMPTY: Values = { name: "", email: "", message: "", amount: "", frequency: "once", phone: "", skills: [], topic: TOPICS[0] };
type Errors = Partial<Record<keyof Values, string>>;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

function check(m: Mission, v: Values, fr: boolean): Errors {
  const e: Errors = {};
  if (v.name.trim().length < 2) e.name = fr ? "Indique ton nom (2 caractères minimum)." : "اكتب اسمك (حرفان على الأقل).";
  if (!EMAIL_RE.test(v.email.trim())) e.email = fr ? (v.email.includes("@") ? "Il manque la fin de l'adresse, par exemple « .mr » ou « .com »." : "Il manque le « @ » dans l'adresse.") : "البريد الإلكتروني غير صحيح.";
  if (m === "contact" && v.message.trim().length < 5) e.message = fr ? "Écris au moins quelques mots." : "اكتب بضع كلمات على الأقل.";
  if (m === "don" && !(Number(v.amount) >= 1 && Number(v.amount) <= 10000)) e.amount = fr ? "Choisis un montant entre 1 et 10 000 €." : "اختر مبلغاً بين 1 و10000 €.";
  if (m === "benevole" && v.skills.length === 0) e.skills = fr ? "Choisis au moins une compétence." : "اختر مهارة واحدة على الأقل.";
  if (m === "benevole" && v.phone && !/^\+?\d{8,15}$/.test(v.phone.replace(/\s/g, ""))) e.phone = fr ? "Numéro invalide (8 à 15 chiffres)." : "رقم غير صحيح.";
  return e;
}

export default function Agir() {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const year = new Date().getFullYear();
  const [mission, setMission] = useState<Mission | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [v, setV] = useState<Values>(EMPTY);
  const [auto, setAuto] = useState<string[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof Values, boolean>>>({});
  const [phrase, setPhrase] = useState("");
  const [status, setStatus] = useState("");
  const [listening, setListening] = useState<(() => void) | null>(null);
  const [bad, setBad] = useState(false);
  const [result, setResult] = useState<{ ref: string; count: number; year: number } | null>(null);
  const [sending, setSending] = useState(false);
  const [hp, setHp] = useState("");
  const shownAt = useRef(Date.now());
  const summary = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => { heading.current?.focus(); }, [step]);

  const live = mission ? check(mission, v, fr) : {};
  const validCount = mission ? (["name", "email", ...({ contact: ["message"], don: ["amount"], benevole: ["skills"], info: ["topic"] }[mission])] as (keyof Values)[])
    .filter((k) => !live[k] && (Array.isArray(v[k]) ? (v[k] as string[]).length : String(v[k]).trim())).length : 0;
  const xp = (mission ? XP.mission : 0) + validCount * XP.field + (step === 3 ? XP.submit : 0);
  const set = (k: keyof Values) => (val: string | string[]) => { setV((o) => ({ ...o, [k]: val })); setAuto((a) => a.filter((x) => x !== k)); };

  async function fill() {
    if (!phrase.trim()) return;
    setStatus(fr ? "Analyse…" : "جارٍ التحليل…");
    const { data, brain } = await smartFill(phrase);
    apply(data, brain);
  }
  function apply(d: Extracted, brain: "nano" | "local") {
    const keys = filledKeys(d);
    setV((o) => ({
      ...o,
      ...(d.name ? { name: d.name } : {}), ...(d.email ? { email: d.email } : {}), ...(d.phone ? { phone: d.phone } : {}),
      ...(d.amount ? { amount: String(d.amount) } : {}), ...(d.frequency ? { frequency: d.frequency } : {}), ...(d.message ? { message: d.message } : {}),
    }));
    setAuto(keys);
    if (d.mission) { setMission(d.mission); setStep(2); }
    const who = brain === "nano" ? "Gemini Nano" : fr ? "extracteur local" : "المحلّل المحلي";
    setStatus(fr ? `${keys.length} champ(s) rempli(s) · cerveau : ${who}. Vérifie avant d'envoyer.` : `تم ملء ${keys.length} حقل · العقل: ${who}. راجعها قبل الإرسال.`);
  }
  function toggleMic() {
    if (listening) { listening(); setListening(null); return; }
    const stop = dictate(lang, (t) => setPhrase((p) => (p ? p + " " : "") + t), () => setListening(null));
    if (stop) setListening(() => stop);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!mission) return;
    const errs = check(mission, v, fr);
    setErrors(errs); setTouched({ name: true, email: true, message: true, amount: true, skills: true, phone: true });
    if (Object.keys(errs).length) { requestAnimationFrame(() => summary.current?.focus()); return; }
    setSending(true);
    const payload: Record<string, unknown> = { mission, name: v.name.trim(), email: v.email.trim(), website: hp, elapsed: Date.now() - shownAt.current };
    if (mission === "contact") payload.message = v.message;
    if (mission === "don") { payload.amount = Number(v.amount); payload.frequency = v.frequency; }
    if (mission === "benevole") { payload.skills = v.skills; payload.phone = v.phone.replace(/\s/g, ""); }
    if (mission === "info") payload.topic = v.topic;
    try { setResult(await api("/api/demandes", { method: "POST", body: JSON.stringify(payload) })); setStep(3); }
    catch { setStatus(fr ? "Envoi impossible pour le moment. Réessaie dans un instant." : "تعذّر الإرسال الآن. أعد المحاولة."); }
    finally { setSending(false); }
  }

  const err = (k: keyof Values) => (touched[k] || errors[k]) && (errors[k] ?? live[k]) ? <p id={`fa-${k}-err`} className="error">{errors[k] ?? live[k]}</p> : null;
  const tag = (k: string) => (auto.includes(k) ? <span className="fa-auto">✨ {fr ? "rempli automatiquement" : "مملوء آلياً"}</span> : null);
  const desc = (k: keyof Values) => ((touched[k] || errors[k]) && (errors[k] ?? live[k]) ? `fa-${k}-err` : undefined);
  const blur = (k: keyof Values) => () => setTouched((t) => ({ ...t, [k]: true }));
  const errorList = Object.entries(errors) as [keyof Values, string][];

  if (step === 3 && result && mission) {
    return (
      <section className="stack fa">
        <h1 ref={heading} tabIndex={-1}>{fr ? `Merci, ${v.name.split(" ")[0]} ! 🎉` : `شكراً ${v.name.split(" ")[0]}! 🎉`}</h1>
        <Glory xp={xp} step={3} lang={lang} />
        <section className="fa-badge" aria-labelledby="fa-badge-titre">
          <span aria-hidden="true">🏅</span>
          <div>
            <p className="fa-kicker">{fr ? "BADGE DÉBLOQUÉ" : "شارة جديدة"}</p>
            <h2 id="fa-badge-titre">{fr ? `${MISSIONS[mission].badge.fr} de ${result.year}` : `${MISSIONS[mission].badge.ar} ${result.year}`}</h2>
            <p>{fr ? `Tu fais partie des ${result.count} personnes qui ont choisi cette mission cette année.` : `أنت واحد من ${result.count} اختاروا هذه المهمة هذا العام.`}</p>
          </div>
        </section>
        <dl className="fa-recap">
          <dt>{fr ? "Mission" : "المهمة"}</dt><dd>{MISSIONS[mission].icon} {fr ? MISSIONS[mission].fr : MISSIONS[mission].ar}</dd>
          {mission === "don" && <><dt>{fr ? "Montant" : "المبلغ"}</dt><dd>{v.amount} € {v.frequency === "monthly" ? (fr ? "chaque mois" : "كل شهر") : ""}</dd></>}
          <dt>E-mail</dt><dd>{v.email}</dd>
          <dt>{fr ? "Référence" : "المرجع"}</dt><dd>{result.ref}</dd>
        </dl>
        <button type="button" onClick={() => { setStep(1); setMission(null); setV(EMPTY); setAuto([]); setResult(null); setErrors({}); setTouched({}); shownAt.current = Date.now(); }}>
          {fr ? "Choisir une autre mission" : "اختيار مهمة أخرى"}
        </button>
      </section>
    );
  }

  return (
    <section className="stack fa">
      <h1 ref={heading} tabIndex={-1}>{step === 1 ? (fr ? "Choisis ta mission" : "اختر مهمتك") : `${MISSIONS[mission!].icon} ${fr ? MISSIONS[mission!].fr : MISSIONS[mission!].ar}`}</h1>
      <p>{fr ? <>Ton soutien en <strong className="fa-year">{year}</strong> est crucial pour notre progression ! 📈</> : <>دعمك في <strong className="fa-year">{year}</strong> أساسي لتقدّمنا! 📈</>}</p>
      <Glory xp={xp} step={step} lang={lang} />

      <section className="fa-smart" aria-labelledby="fa-smart-titre">
        <h2 id="fa-smart-titre">✨ {fr ? "Dis-le en une phrase" : "قلها في جملة"}</h2>
        <label htmlFor="fa-phrase">{fr ? "Écris ou dicte ce que tu veux faire, en français ou en arabe : on remplit le formulaire pour toi." : "اكتب أو أملِ ما تريد بالعربية أو الفرنسية، ونملأ الاستمارة عنك."}</label>
        <div className="fa-row">
          <textarea id="fa-phrase" rows={2} value={phrase} onChange={(e) => setPhrase(e.target.value)} maxLength={500}
            placeholder={fr ? "Ex. : Je m'appelle Aïcha, je veux donner 25 € chaque mois, aicha@exemple.mr" : "مثال: اسمي سيدي، أريد التبرع بـ 25 يورو كل شهر"} />
          {speechSupported() && <button type="button" className="fa-mic" aria-pressed={!!listening} aria-label={fr ? "Dicter" : "إملاء"} onClick={toggleMic}>🎤</button>}
        </div>
        <div className="fa-row">
          <button type="button" onClick={fill} disabled={!phrase.trim()}>✨ {fr ? "Remplir pour moi" : "املأ عنّي"}</button>
          <span aria-live="polite" className="fa-status">{status}</span>
        </div>
      </section>

      {step === 1 && (
        <fieldset className="fa-missions">
          <legend>{fr ? "Que veux-tu faire ?" : "ماذا تريد أن تفعل؟"}</legend>
          <ul>
            {(Object.keys(MISSIONS) as Mission[]).map((m) => (
              <li key={m}>
                <button type="button" aria-pressed={mission === m} onClick={() => { setMission(m); setStep(2); }}>
                  <span aria-hidden="true">{MISSIONS[m].icon}</span>
                  <span><strong>{fr ? MISSIONS[m].fr : MISSIONS[m].ar}</strong><span>{fr ? MISSIONS[m].dfr : MISSIONS[m].dar}</span></span>
                </button>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      {step === 2 && mission && (
        <>
          <button type="button" className="fa-back" onClick={() => setStep(1)}>← {fr ? "Changer de mission" : "تغيير المهمة"}</button>
          {errorList.length > 0 && (
            <div ref={summary} tabIndex={-1} role="alert" className="card">
              <p className="error"><strong>{fr ? "Le formulaire contient des erreurs :" : "في الاستمارة أخطاء:"}</strong></p>
              <ul>{errorList.map(([k, m]) => <li key={k}><a href={`#fa-${k}`}>{m}</a></li>)}</ul>
            </div>
          )}
          {bad ? <BadForm onSubmit={() => {}} /> : (
            <form className="card stack fa-form" onSubmit={submit} noValidate>
              <div className="fa-hp" aria-hidden="true">
                <label htmlFor="fa-website">Site web</label>
                <input id="fa-website" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
              </div>
              {mission === "don" && (
                <>
                  <fieldset>
                    <legend>{fr ? "Montant" : "المبلغ"} {tag("amount")}</legend>
                    <div className="fa-row">
                      {AMOUNTS.map((a) => <button key={a} type="button" className="fa-chip" aria-pressed={v.amount === String(a)} onClick={() => set("amount")(String(a))}>{a} €</button>)}
                      <label className="fa-inline">{fr ? "Autre" : "آخر"}
                        <input id="fa-amount" inputMode="decimal" value={AMOUNTS.map(String).includes(v.amount) ? "" : v.amount} onChange={(e) => set("amount")(e.target.value.replace(",", "."))} onBlur={blur("amount")}
                          aria-invalid={!!desc("amount")} aria-describedby={desc("amount")} />
                      </label>
                    </div>
                    {err("amount")}
                  </fieldset>
                  <fieldset>
                    <legend>{fr ? "Fréquence" : "التكرار"} {tag("frequency")}</legend>
                    <div className="fa-seg" role="radiogroup">
                      <button type="button" role="radio" aria-checked={v.frequency === "once"} onClick={() => set("frequency")("once")}>{fr ? "Une fois" : "مرة واحدة"}</button>
                      <button type="button" role="radio" aria-checked={v.frequency === "monthly"} onClick={() => set("frequency")("monthly")}>{fr ? "Chaque mois 🔄" : "كل شهر 🔄"}</button>
                    </div>
                  </fieldset>
                  {Number(v.amount) > 0 && (
                    <p className="fa-impact">{(() => { const total = Number(v.amount) * (v.frequency === "monthly" ? 12 : 1); return fr
                      ? `${total} € ${v.frequency === "monthly" ? "sur un an " : ""}= ${impact(total)} heures d'atelier numérique offertes [EXEMPLE À ADAPTER AU SUJET]`
                      : `${total} € = ${impact(total)} ساعة ورشة رقمية [مثال يُكيَّف مع الموضوع]`; })()}</p>
                  )}
                </>
              )}
              <div className="fa-grid">
                <div>
                  <label htmlFor="fa-name">{fr ? "Nom" : "الاسم"} {tag("name")}</label>
                  <input id="fa-name" autoComplete="name" value={v.name} maxLength={100} onChange={(e) => set("name")(e.target.value)} onBlur={blur("name")}
                    aria-invalid={!!desc("name")} aria-describedby={desc("name")} className={auto.includes("name") ? "fa-filled" : undefined} />
                  {err("name")}
                </div>
                <div>
                  <label htmlFor="fa-email">E-mail {tag("email")}</label>
                  <input id="fa-email" type="email" autoComplete="email" value={v.email} maxLength={254} onChange={(e) => set("email")(e.target.value)} onBlur={blur("email")}
                    aria-invalid={!!desc("email")} aria-describedby={desc("email")} className={auto.includes("email") ? "fa-filled" : undefined} dir="ltr" />
                  {err("email")}
                </div>
              </div>
              {mission === "contact" && (
                <div>
                  <label htmlFor="fa-message">{fr ? "Ton message" : "رسالتك"} {tag("message")}</label>
                  <textarea id="fa-message" rows={4} value={v.message} maxLength={2000} onChange={(e) => set("message")(e.target.value)} onBlur={blur("message")}
                    aria-invalid={!!desc("message")} aria-describedby={desc("message")} />
                  {err("message")}
                </div>
              )}
              {mission === "benevole" && (
                <>
                  <fieldset>
                    <legend>{fr ? "Tes compétences" : "مهاراتك"}</legend>
                    <div className="fa-row">
                      {SKILLS.map((s) => (
                        <label key={s} className="fa-check"><input type="checkbox" checked={v.skills.includes(s)}
                          onChange={(e) => set("skills")(e.target.checked ? [...v.skills, s] : v.skills.filter((x) => x !== s))} /> {s}</label>
                      ))}
                    </div>
                    {errors.skills && <p id="fa-skills" className="error">{errors.skills}</p>}
                  </fieldset>
                  <div>
                    <label htmlFor="fa-phone">{fr ? "Téléphone (facultatif)" : "الهاتف (اختياري)"} {tag("phone")}</label>
                    <input id="fa-phone" type="tel" autoComplete="tel" value={v.phone} onChange={(e) => set("phone")(e.target.value)} onBlur={blur("phone")} dir="ltr"
                      aria-invalid={!!desc("phone")} aria-describedby={desc("phone")} />
                    {err("phone")}
                  </div>
                </>
              )}
              {mission === "info" && (
                <div>
                  <label htmlFor="fa-topic">{fr ? "Sujet" : "الموضوع"}</label>
                  <select id="fa-topic" value={v.topic} onChange={(e) => set("topic")(e.target.value)}>{TOPICS.map((t) => <option key={t}>{t}</option>)}</select>
                </div>
              )}
              <p className="fa-note">🔒 {fr ? "Envoi chiffré (HTTPS) · protection anti-spam invisible · démonstration : aucun paiement réel n'est demandé." : "إرسال مشفّر · حماية خفية من الرسائل المزعجة · عرض فقط: لا يُطلب أي دفع حقيقي."}</p>
              <button type="submit" className="fa-cta" disabled={sending} aria-busy={sending}>
                {fr ? (mission === "don" ? "Valider mon don" : "Envoyer") : "إرسال"} <span>+{XP.submit} XP</span>
              </button>
            </form>
          )}
          <p role="status" className="fa-status">{status && !auto.length ? status : ""}</p>
          <section className="fa-badui" aria-labelledby="fa-bad-titre">
            <div>
              <h2 id="fa-bad-titre">😈 {fr ? "Version Bad UI" : "نسخة Bad UI"}</h2>
              <p>{fr ? "Le même formulaire, volontairement infernal." : "الاستمارة نفسها، سيئة عمداً."}</p>
            </div>
            <label className="fa-check"><input type="checkbox" role="switch" checked={bad} onChange={(e) => setBad(e.target.checked)} /> {fr ? "Activer" : "تفعيل"}</label>
          </section>
        </>
      )}
    </section>
  );
}
