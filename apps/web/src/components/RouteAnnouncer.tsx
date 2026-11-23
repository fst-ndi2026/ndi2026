import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useI18n, type Key } from "../lib/i18n";

// À chaque changement de page : titre du document mis à jour, focus sur le contenu, annonce aux lecteurs d'écran.
const TITLES: Record<string, Key> = {
  "/": "home", "/demo": "demo", "/assistant": "assistant", "/defis": "defis", "/credits": "credits", "/accessibilite": "a11y", "/sobriete": "sobriete", "/securite": "securite", "/agir": "agir", "/village": "village", "/son": "son",
};

export default function RouteAnnouncer() {
  const { pathname } = useLocation();
  const { t } = useI18n();
  const [msg, setMsg] = useState("");
  const first = useRef(true);
  useEffect(() => {
    const name = t(TITLES[pathname] ?? "home");
    document.title = `${name} · ${t("title")}`;
    if (first.current) { first.current = false; return; }
    document.getElementById("main")?.focus();
    setMsg(`${t("pageLoaded")} ${name}`);
  }, [pathname, t]);
  return <p className="sr-only" aria-live="polite">{msg}</p>;
}
