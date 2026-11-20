import { NavLink, Outlet } from "react-router-dom";
import { useI18n } from "../lib/i18n";
import EcoBadge from "./EcoBadge";
import SecurityBadge from "./SecurityBadge";
import A11yPanel from "./A11yPanel";
import Rafiq from "./Rafiq";
import ArcadeLauncher from "./ArcadeLauncher";
import RouteAnnouncer from "./RouteAnnouncer";

export default function Layout() {
  const { t, toggle } = useI18n();
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
            <li><NavLink to="/agir">{t("agir")}</NavLink></li>
            <li><NavLink to="/village">{t("village")}</NavLink></li>
            <li><NavLink to="/inscription">{t("signup")}</NavLink></li>
            <li><button type="button" onClick={toggle} lang={t("lang") === "العربية" ? "ar" : "fr"}>{t("lang")}</button></li>
          </ul>
        </nav>
      </header>
      <RouteAnnouncer />
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <Rafiq />
      <A11yPanel />
      <footer>
        <div className="footer-row"><div className="footer-badges"><EcoBadge /><SecurityBadge /></div><p>Équipe FST - Université de Nouakchott · Licence MIT · aucun traceur · <NavLink to="/sobriete">Sobriété</NavLink> · <NavLink to="/securite">Sécurité</NavLink> <ArcadeLauncher /></p></div>
      </footer>
    </>
  );
}
