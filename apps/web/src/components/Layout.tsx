import { NavLink, Outlet } from "react-router-dom";
import { useI18n } from "../lib/i18n";
import { useKonami } from "../lib/useKonami";
import EcoBadge from "./EcoBadge";
import SecurityBadge from "./SecurityBadge";
import A11yPanel from "./A11yPanel";
import RouteAnnouncer from "./RouteAnnouncer";

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
            <li><NavLink to="/accessibilite">{t("a11y")}</NavLink></li>
            <li><NavLink to="/inscription">{t("signup")}</NavLink></li>
            <li><button type="button" onClick={toggle} lang={t("lang") === "العربية" ? "ar" : "fr"}>{t("lang")}</button></li>
          </ul>
        </nav>
      </header>
      <RouteAnnouncer />
      <main id="main" tabIndex={-1}>
        {found && (
          <div className="card" role="status">
            <p>🎉 {t("konami")}</p>
            <button type="button" onClick={close}>OK</button>
          </div>
        )}
        <Outlet />
      </main>
      <A11yPanel />
      <footer>
        <div className="footer-row"><div className="footer-badges"><EcoBadge /><SecurityBadge /></div><p>Équipe FST - Université de Nouakchott · Licence MIT · aucun traceur · <NavLink to="/sobriete">Sobriété</NavLink> · <NavLink to="/securite">Sécurité</NavLink></p></div>
      </footer>
    </>
  );
}
