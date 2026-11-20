import defis from "../data/defis.json";
import { useI18n } from "../lib/i18n";

// Une vitrine par défi : exigences et preuves, pour les jurys.
export default function Defis() {
  const { t } = useI18n();
  return (
    <section className="stack">
      <h1>{t("defis")}</h1>
      {defis.map((d) => (
        <article key={d.id} id={d.id} className="card">
          <h2>{d.titre}</h2>
          <ul>
            {d.exigences.map((x, i) => (
              <li key={i}>
                <span aria-hidden="true">{x.fait ? "✅" : "⬜"}</span>{" "}
                <strong>{x.texte}</strong>
                <br /><span className="muted">{x.preuve}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
