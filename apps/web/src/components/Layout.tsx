import { NavLink, Outlet } from "react-router-dom";
import { useI18n } from "../lib/i18n";
import { useKonami } from "../lib/useKonami";
import PageWeight from "./PageWeight";

export default function Layout() {
  const { t, toggle } = useI18n();
  const [found, close] = useKonami();
  return (
    <>
      <a className="skip" href="#main">{t("skip")}</a>
      <header>
        <nav aria-label="Navigation principale">
          <ul>
            <li><NavLink to="/">{t("home")}</NavLink></li>
            <li><NavLink to="/demo">{t("demo")}</NavLink></li>
            <li><NavLink to="/assistant">{t("assistant")}</NavLink></li>
            <li><NavLink to="/defis">{t("defis")}</NavLink></li>
            <li><NavLink to="/credits">{t("credits")}</NavLink></li>
            <li><button type="button" onClick={toggle}>{t("lang")}</button></li>
          </ul>
        </nav>
      </header>
      <main id="main" tabIndex={-1}>
        {found && (
          <div className="card" role="status">
            <p>🎉 {t("konami")}</p>
            <button type="button" onClick={close}>OK</button>
          </div>
        )}
        <Outlet />
      </main>
      <footer>
        <p>Équipe FST - Université de Nouakchott · Licence MIT · <PageWeight /></p>
      </footer>
    </>
  );
}
