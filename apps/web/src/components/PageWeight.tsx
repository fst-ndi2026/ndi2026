import { useEffect, useState } from "react";
import { useI18n } from "../lib/i18n";

// Éco-conception : affiche le poids transféré de la page (API Performance du navigateur).
export default function PageWeight() {
  const { t } = useI18n();
  const [kb, setKb] = useState<number | null>(null);
  useEffect(() => {
    const measure = () => {
      const entries = [
        ...performance.getEntriesByType("navigation"),
        ...performance.getEntriesByType("resource"),
      ] as PerformanceResourceTiming[];
      const bytes = entries.reduce((s, e) => s + (e.transferSize || 0), 0);
      setKb(Math.round(bytes / 1024));
    };
    if (document.readyState === "complete") measure();
    else window.addEventListener("load", measure, { once: true });
  }, []);
  if (kb === null) return null;
  return <span className="muted">{t("weight")} : {kb} Ko</span>;
}
