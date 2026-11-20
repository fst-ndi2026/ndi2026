// Jauge de gloire : chaque action utile rapporte des XP.
export default function Glory({ xp, step, lang }: { xp: number; step: number; lang: "fr" | "ar" }) {
  const pct = Math.min(100, Math.round((xp / 120) * 100));
  return (
    <div className="fa-glory">
      <span className="fa-level" aria-hidden="true">{step}</span>
      <div>
        <p><strong>{lang === "ar" ? "مقياس المجد" : "Jauge de gloire"}</strong> · {xp} XP · {lang === "ar" ? `المرحلة ${step} من 3` : `étape ${step} sur 3`}</p>
        <div className="fa-bar" role="progressbar" aria-label={lang === "ar" ? "تقدّم الاستمارة" : "Progression du formulaire"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
