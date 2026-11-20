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
import Sobriete from "./pages/Sobriete";
import Securite from "./pages/Securite";
import { SobreProvider } from "./lib/sobre";
import { I18nProvider } from "./lib/i18n";
import { A11yProvider } from "./lib/a11y";

function app(path: string) {
  return render(
    <I18nProvider><A11yProvider><SobreProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="demo" element={<Demo />} />
            <Route path="assistant" element={<Assistant />} />
            <Route path="defis" element={<Defis />} />
            <Route path="credits" element={<Credits />} />
            <Route path="accessibilite" element={<Accessibilite />} />
            <Route path="sobriete" element={<Sobriete />} />
            <Route path="securite" element={<Securite />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </SobreProvider></A11yProvider></I18nProvider>
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [{ id: 1, title: "Exemple", body: "" }] }));
  document.documentElement.className = ""; localStorage.clear(); delete document.documentElement.dataset.theme;
  document.documentElement.style.fontSize = "";
});

describe("Accessibilité (axe-core)", () => {
  for (const path of ["/", "/demo", "/assistant", "/defis", "/credits", "/accessibilite", "/sobriete", "/securite"]) {
    it(`aucune violation sur ${path}`, async () => {
      const { container } = app(path);
      await screen.findByRole("heading", { level: 1 });
      // Le contraste ne peut pas être calculé dans jsdom : il est vérifié à part (palette AA).
      const res = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
      expect(res.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }
});

describe("Panneau Paramètres d'affichage", () => {
  it("s'ouvre, applique un profil et se referme avec Échap", async () => {
    app("/");
    const fab = screen.getByRole("button", { name: "Paramètres d'affichage" });
    fireEvent.click(fab);
    expect(fab.getAttribute("aria-expanded")).toBe("true");
    const dialog = screen.getByRole("dialog", { name: "Paramètres d'affichage" });
    const res = await axe.run(dialog, { rules: { "color-contrast": { enabled: false } } });
    expect(res.violations.map((v) => v.id)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: /Malvoyance/ }));
    await waitFor(() => expect(document.documentElement.style.fontSize).toBe("150%"));
    expect(document.documentElement.dataset.theme).toBe("contraste");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(fab);
  });
  it("règle la taille, la police et réinitialise", async () => {
    app("/");
    fireEvent.click(screen.getByRole("button", { name: "Paramètres d'affichage" }));
    fireEvent.change(screen.getByLabelText("Taille du texte"), { target: { value: "200" } });
    await waitFor(() => expect(document.documentElement.style.fontSize).toBe("200%"));
    fireEvent.click(screen.getByRole("button", { name: "Lisible" }));
    expect(document.documentElement.classList.contains("font-lisible")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));
    await waitFor(() => expect(document.documentElement.style.fontSize).toBe("100%"));
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
