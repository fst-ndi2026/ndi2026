import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { I18nProvider } from "./lib/i18n";
import { A11yProvider } from "./lib/a11y";
import { SobreProvider } from "./lib/sobre";
import "./styles/tokens.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider><A11yProvider><SobreProvider><App /></SobreProvider></A11yProvider></I18nProvider>
  </StrictMode>
);
