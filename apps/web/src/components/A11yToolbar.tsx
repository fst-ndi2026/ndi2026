import { useA11y } from "../lib/a11y";
import { useI18n } from "../lib/i18n";

export default function A11yToolbar() {
  const { t } = useI18n();
  const { prefs, bigger, smaller, toggleContrast } = useA11y();
  return (
    <div role="group" aria-label={t("a11yTools")} className="toolbar">
      <button type="button" onClick={smaller} aria-label={t("textSmaller")} disabled={prefs.scale <= 1}>A−</button>
      <button type="button" onClick={bigger} aria-label={t("textBigger")} disabled={prefs.scale >= 2}>A+</button>
      <button type="button" onClick={toggleContrast} aria-pressed={prefs.contrast}>{t("contrast")}</button>
    </div>
  );
}
