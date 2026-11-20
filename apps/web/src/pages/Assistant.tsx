import { useI18n } from "../lib/i18n";
import RafiqChat from "../components/RafiqChat";

// Page pleine largeur de Rafiq (même composant que la fenêtre flottante).
export default function Assistant() {
  const { t, lang } = useI18n();
  return (
    <section className="stack">
      <h1>{t("assistant")}</h1>
      <p>{lang === "ar"
        ? "رفيق يجيب من محتوى الموقع ويذكر المصدر. يعمل حتى دون مفتاح API ودون إنترنت."
        : "Rafiq répond à partir du contenu du site et cite la source. Il fonctionne même sans clé d'API ni réseau."}</p>
      <div className="rq-page"><RafiqChat /></div>
    </section>
  );
}
