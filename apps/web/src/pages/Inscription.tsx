import { useRef, useState, type FormEvent } from "react";
import { useI18n, type Key } from "../lib/i18n";
import { estimatePassword } from "../../../../shared/password.js";
import PasswordStrength from "../components/PasswordStrength";

type Field = "fullName" | "email" | "github" | "filiere" | "password" | "confirm" | "acceptTerms";
type Errors = Partial<Record<Field, Key>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GITHUB_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const BASE = import.meta.env.VITE_API_URL ?? "";

const empty = { fullName: "", email: "", github: "", filiere: "", password: "", confirm: "" };

export function validate(v: typeof empty & { acceptTerms: boolean }): Errors {
  const e: Errors = {};
  if (v.fullName.trim().length < 2) e.fullName = "errFullName";
  if (!EMAIL_RE.test(v.email.trim())) e.email = "errEmail";
  if (v.github.trim() && !GITHUB_RE.test(v.github.trim())) e.github = "errGithub";
  if (!estimatePassword(v.password).accepted) e.password = "errPassword";
  if (v.confirm !== v.password) e.confirm = "errConfirm";
  if (!v.acceptTerms) e.acceptTerms = "errTerms";
  return e;
}

export default function Inscription() {
  const { t } = useI18n();
  const [values, setValues] = useState(empty);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [leak, setLeak] = useState<number | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    const errs = validate({ ...values, acceptTerms });
    if (!errs.password && leak) errs.password = "errPwned";
    setErrors(errs);
    if (Object.keys(errs).length) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setSending(true);
    try {
      const { confirm: _c, ...payload } = values;
      const r = await fetch(`${BASE}/api/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, acceptTerms }),
      });
      if (r.status === 409) {
        setErrors({ email: "errEmailTaken" });
        requestAnimationFrame(() => summaryRef.current?.focus());
      } else if (!r.ok) {
        setMsg({ ok: false, text: t("loadError") });
      } else {
        setValues(empty);
        setAcceptTerms(false);
        setMsg({ ok: true, text: t("signupOk") });
      }
    } catch {
      setMsg({ ok: false, text: t("loadError") });
    } finally {
      setSending(false);
    }
  }

  const errorList = Object.entries(errors) as [Field, Key][];
  const describe = (f: Field, hint?: string) =>
    [hint, errors[f] ? `${f}-error` : undefined].filter(Boolean).join(" ") || undefined;
  const fieldError = (f: Field) =>
    errors[f] ? <p id={`${f}-error`} className="error">{t(errors[f]!)}</p> : null;

  return (
    <section className="stack">
      <h1>{t("signup")}</h1>
      <p>{t("signupIntro")}</p>

      {errorList.length > 0 && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="card">
          <p className="error"><strong>{t("errSummary")}</strong></p>
          <ul>
            {errorList.map(([f, k]) => (
              <li key={f}><a href={`#${f}`}>{t(k)}</a></li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={submit} className="card stack" noValidate>
        <div>
          <label htmlFor="fullName">{t("fullName")}</label>
          <input id="fullName" name="fullName" autoComplete="name" required maxLength={100}
            value={values.fullName} onChange={set("fullName")}
            aria-invalid={!!errors.fullName} aria-describedby={describe("fullName")} />
          {fieldError("fullName")}
        </div>
        <div>
          <label htmlFor="email">{t("email")}</label>
          <input id="email" name="email" type="email" autoComplete="email" required maxLength={254}
            value={values.email} onChange={set("email")}
            aria-invalid={!!errors.email} aria-describedby={describe("email")} />
          {fieldError("email")}
        </div>
        <div>
          <label htmlFor="github">{t("github")}</label>
          <input id="github" name="github" autoComplete="username" maxLength={39} dir="ltr"
            value={values.github} onChange={set("github")}
            aria-invalid={!!errors.github} aria-describedby={describe("github")} />
          {fieldError("github")}
        </div>
        <div>
          <label htmlFor="filiere">{t("filiere")}</label>
          <input id="filiere" name="filiere" maxLength={80}
            value={values.filiere} onChange={set("filiere")} />
        </div>
        <div>
          <label htmlFor="password">{t("password")}</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required
            minLength={8} maxLength={128} value={values.password} onChange={set("password")}
            aria-invalid={!!errors.password} aria-describedby={describe("password", "password-hint password-strength")} />
          <p id="password-hint">{t("passwordHint")}</p>
          <PasswordStrength id="password-strength" password={values.password} onLeak={setLeak} />
          {fieldError("password")}
        </div>
        <div>
          <label htmlFor="confirm">{t("confirmPassword")}</label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" required
            maxLength={128} value={values.confirm} onChange={set("confirm")}
            aria-invalid={!!errors.confirm} aria-describedby={describe("confirm")} />
          {fieldError("confirm")}
        </div>
        <div>
          <input id="acceptTerms" name="acceptTerms" type="checkbox" checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            aria-invalid={!!errors.acceptTerms} aria-describedby={describe("acceptTerms")} />{" "}
          <label htmlFor="acceptTerms">{t("acceptTerms")}</label>
          {fieldError("acceptTerms")}
        </div>
        <button type="submit" disabled={sending} aria-busy={sending}>{t("signupSubmit")}</button>
        <p aria-live="polite" role="status" className={msg?.ok ? "ok" : "error"}>{msg?.text}</p>
      </form>
    </section>
  );
}
