import { useI18n } from "../lib/i18n";
import TopScores from "../components/TopScores";

export default function Home() {
  const { t } = useI18n();
  return (
    <section className="stack">
      <h1>{t("title")}</h1>
      <p>{t("intro")}</p>
      <TopScores />
    </section>
  );
}