import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, afterEach } from "vitest";
import axe from "axe-core";
import Village from "./pages/Village";
import { I18nProvider } from "./lib/i18n";

afterEach(() => vi.unstubAllGlobals());
const ui = () => {
  vi.stubGlobal("fetch", vi.fn(async (u: string) => new Response(u.includes("/api/village") ? JSON.stringify({ demandes: 7, sansReponse: 2, fiches: 12 }) : "{}", { status: 200 })));
  return render(<MemoryRouter><I18nProvider><Village /></I18nProvider></MemoryRouter>);
};

describe("Village 3D", () => {
  it("sans WebGL : n'importe pas three.js et garde tout le contenu accessible", async () => {
    const { container } = ui();
    expect(screen.getByText(/n'affiche pas la 3D/)).toBeTruthy();
    expect(container.querySelector("canvas")).toBeNull();
    expect(screen.getAllByRole("button", { name: /Tour Sécurité|Maison Sobriété|Maison Accessibilité|Antenne Rafiq|Silo des données/ })).toHaveLength(5);
    expect(await screen.findByText(/7 mission\(s\) reçue\(s\)/)).toBeTruthy();
    expect(screen.getByText(/2 question\(s\) sans réponse/)).toBeTruthy();
    const res = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(res.violations.map((v) => v.id)).toEqual([]);
  });

  it("choisir un bâtiment ouvre sa fiche et le lien vers la page", () => {
    ui();
    fireEvent.click(screen.getByRole("button", { name: /Maison Sobriété/ }));
    expect(screen.getByRole("button", { name: /Maison Sobriété/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("link", { name: /Ouvrir la page/ }).getAttribute("href")).toBe("/sobriete");
  });

  it("Rafiq, montre-moi : choisit le bon bâtiment à partir d'une question", () => {
    ui();
    fireEvent.change(screen.getByLabelText(/Demander à Rafiq/), { target: { value: "Le site est-il bien protégé ?" } });
    fireEvent.click(screen.getByRole("button", { name: /Rafiq, montre-moi/ }));
    expect(screen.getByRole("button", { name: /Tour Sécurité/ }).getAttribute("aria-pressed")).toBe("true");
  });

  it("le ciel se choisit à la main et la démo jury met la tour en alerte", () => {
    ui();
    fireEvent.click(screen.getByRole("button", { name: "Nuit" }));
    expect(screen.getByRole("button", { name: "Nuit" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(/^Nuit ·/)).toBeTruthy();
    fireEvent.click(screen.getByRole("switch", { name: /Démo jury/ }));
    expect(screen.getByRole("button", { name: /Tour Sécurité/ }).className).toMatch(/is-alert/);
  });
});
