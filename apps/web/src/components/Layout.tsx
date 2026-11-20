import { NavLink, Outlet, Link } from "react-router-dom";
import { useI18n } from "../lib/i18n";
import { useKonami } from "../lib/useKonami";
import PageWeight from "./PageWeight";
import A11yToolbar from "./A11yToolbar";
import RouteAnnouncer from "./RouteAnnouncer";

export default function Layout() {
  const { t, toggle } = useI18n();
  const [found, close] = useKonami();
  return (
    <>
      <a className="skip" href="#main">{t("skip")}</a>
      <header className="site-header">
        <div className="wrap header-row">
          <Link to="/" className="brand">
            <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><rect width="34" height="34" rx="9" fill="#23704A" /><path d="M8 24 L17 10 L26 24 Z" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinejoin="round" /><path d="M14 24 V19 H20 V24" fill="none" stroke="#fff" strokeWidth="2.4" /></svg>
            <span>{t("title")}</span>
          </Link>
          <nav aria-label="Navigation principale">
            <ul className="nav">
              <li><NavLink to="/" end>{t("home")}</NavLink></li>
              <li><NavLink to="/podium">{t("podium")}</NavLink></li>
              <li><NavLink to="/defis">{t("defis")}</NavLink></li>
              <li><NavLink to="/accessibilite">{t("a11y")}</NavLink></li>
            </ul>
          </nav>
          <div className="header-tools">
            <button type="button" className="btn-ghost" onClick={toggle}>{t("lang")}</button>
            <A11yToolbar />
          </div>
        </div>
      </header>
      <RouteAnnouncer />
      <main id="main" tabIndex={-1} className="wrap">
        {found && (
          <div className="card" role="status">
            <p>🎉 {t("konami")}</p>
            <button type="button" className="btn" onClick={close}>OK</button>
          </div>
        )}
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="wrap footer-row">
          <span><PageWeight /> · aucun traceur</span>
          <span>Code sous licence MIT · contenus NIRD sous CC BY · <Link to="/credits">{t("credits")}</Link></span>
        </div>
      </footer>
    </>
  );
}
