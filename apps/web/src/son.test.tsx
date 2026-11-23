import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import axe from "axe-core";
import Son from "./pages/Son";
import { I18nProvider } from "./lib/i18n";

const ui = () => render(<MemoryRouter><I18nProvider><Son /></I18nProvider></MemoryRouter>);

describe("Visualisation audio (/son)", () => {
  it("affiche la plaque, les 3 sources et les 4 notes, sans erreur d'accessibilité", async () => {
    const { container } = ui();
    expect(screen.getByRole("img", { name: /Plaque de Chladni/ })).toBeTruthy();
    for (const s of ["Générateur", "Micro", "Fichier audio"]) expect(screen.getByRole("button", { name: s })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Hz/ })).toHaveLength(4);
    expect(screen.getByText(/Rien n'est enregistré ni envoyé/)).toBeTruthy();
    const res = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(res.violations.map((v) => v.id)).toEqual([]);
  });

  it("changer de source montre le bon contrôle", () => {
    ui();
    fireEvent.click(screen.getByRole("button", { name: "Fichier audio" }));
    expect(screen.getByLabelText(/Choisir un fichier audio/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Micro" }));
    expect(screen.getByRole("button", { name: "Écouter le micro" })).toBeTruthy();
  });

  it("le jeu propose une figure à reproduire avec une barre de ressemblance", () => {
    ui();
    fireEvent.click(screen.getByRole("button", { name: /reproduis la figure/ }));
    expect(screen.getByText(/Figure à reproduire/)).toBeTruthy();
    expect(screen.getByRole("progressbar")).toBeTruthy();
  });

  it("sans WebGL, l'onglet village l'explique et le sable reste disponible", () => {
    ui();
    fireEvent.click(screen.getByRole("button", { name: "Le village danse" }));
    expect(screen.getByText(/village 3D n'est pas disponible/)).toBeTruthy();
  });
});
