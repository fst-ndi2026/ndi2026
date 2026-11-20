import { useI18n } from "../lib/i18n";
export default function Credits() {
  const { t } = useI18n();
  return (
    <section className="stack">
      <h1>{t("credits")}</h1>
      <p>Code sous licence MIT. Ressources tierces (images, sons, polices) : lister ici le nom, l'URL et la licence de chacune.</p>
      <ul><li>Polices : polices système (aucune police externe).</li></ul>
    </section>
  );
}
