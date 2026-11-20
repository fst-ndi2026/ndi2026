import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import axe from "axe-core";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Demo from "./pages/Demo";
import Assistant from "./pages/Assistant";
import Defis from "./pages/Defis";
import Credits from "./pages/Credits";
import Accessibilite from "./pages/Accessibilite";
import { I18nProvider } from "./lib/i18n";
import { A11yProvider } from "./lib/a11y";

function app(path: string) {
  return render(
    <I18nProvider><A11yProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="demo" element={<Demo />} />
            <Route path="assistant" element={<Assistant />} />
            <Route path="defis" element={<Defis />} />
            <Route path="credits" element={<Credits />} />
            <Route path="accessibilite" element={<Accessibilite />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </A11yProvider></I18nProvider>
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [{ id: 1, title: "Exemple", body: "" }] }));
  document.documentElement.className = "";
  document.documentElement.style.fontSize = "";
});

describe("Accessibilité (axe-core)", () => {
  for (const path of ["/", "/demo", "/assistant", "/defis", "/credits", "/accessibilite"]) {
    it(`aucune violation sur ${path}`, async () => {
      const { container } = app(path);
      await screen.findByRole("heading", { level: 1 });
      // Le contraste ne peut pas être calculé dans jsdom : il est vérifié à part (palette AA).
      const res = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
      expect(res.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }
});

describe("Outils d'accessibilité", () => {
  it("agrandit le texte et active le contraste élevé", async () => {
    app("/");
    fireEvent.click(screen.getByRole("button", { name: "Agrandir le texte" }));
    await waitFor(() => expect(document.documentElement.style.fontSize).toBe("125%"));
    const c = screen.getByRole("button", { name: "Contraste élevé" });
    fireEvent.click(c);
    expect(c.getAttribute("aria-pressed")).toBe("true");
    expect(document.documentElement.classList.contains("hc")).toBe(true);
  });
  it("met à jour le titre de la page", async () => {
    app("/defis");
    await waitFor(() => expect(document.title).toMatch(/^Défis/));
  });
  it("propose un lien d'évitement vers le contenu", () => {
    app("/");
    expect(screen.getByRole("link", { name: "Aller au contenu" }).getAttribute("href")).toBe("#main");
  });
});
