import { useEffect, useRef, useState } from "react";
import { useI18n } from "../lib/i18n";
import RafiqChat from "./RafiqChat";

// Bouton flottant « Rafiq » et fenêtre de discussion, sur toutes les pages.
export default function Rafiq() {
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const name = lang === "ar" ? "رفيق" : "Rafiq";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button ref={btn} type="button" className="rq-fab" aria-expanded={open} aria-controls="rq-panel" onClick={() => setOpen((o) => !o)}>
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="8" width="16" height="11" rx="3" /><path d="M12 4v4" /><circle cx="9" cy="13" r="1" /><circle cx="15" cy="13" r="1" /></svg>
        <span>{name}</span>
      </button>
      {open && (
        <section id="rq-panel" className="rq-panel" role="dialog" aria-labelledby="rq-titre">
          <div className="rq-head">
            <div><h2 id="rq-titre">{name}</h2><p>{lang === "ar" ? "مساعد فريق FST" : "Assistant de l'équipe FST"}</p></div>
            <button type="button" aria-label={lang === "ar" ? "إغلاق" : "Fermer"} onClick={() => { setOpen(false); btn.current?.focus(); }}>×</button>
          </div>
          <RafiqChat autoFocus />
        </section>
      )}
    </>
  );
}
