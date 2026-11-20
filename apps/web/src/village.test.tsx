import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, beforeEach, vi } from "vitest";
import Carte from "./pages/Carte";
import Quete from "./pages/Quete";
import { localSearch } from "./lib/rafiq";

const wrap = (path: string) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes><Route path="/" element={<Carte />} /><Route path="/quete/:id" element={<Quete />} /></Routes>
  </MemoryRouter>);

beforeEach(() => { localStorage.clear(); vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline"))); });

describe("Le Village Résistant", () => {
  it("affiche les trois quartiers et la prochaine quête", () => {
    wrap("/");
    for (const n of ["Inclusion", "Responsabilité", "Durabilité"]) expect(screen.getAllByText(n).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /Commencer/ })).toBeTruthy();
  });
  it("une bonne réponse donne un retour positif", () => {
    wrap("/quete/atelier-linux");
    fireEvent.click(screen.getByRole("button", { name: /Installer Linux progressivement/ }));
    expect(screen.getByText("Bien joué.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Terminer la quête" }));
    expect(screen.getByText("Quête libérée !")).toBeTruthy();
  });
  it("une quête verrouillée ne s'ouvre pas", () => {
    wrap("/quete/charte");
    expect(screen.getByText(/se débloque après/)).toBeTruthy();
  });
  it("Rafiq répond hors connexion", () => {
    expect(localSearch("Pourquoi Linux ?").refs[0]).toBe("Pourquoi Linux ?");
    expect(localSearch("Pourquoi Linux ?").source).toBe("offline");
  });
});
