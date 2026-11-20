import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeEach } from "vitest";
import { estimate } from "./lib/eco";
import EcoBadge from "./components/EcoBadge";
import { SobreImage } from "./components/SobreMedia";
import { SobreProvider } from "./lib/sobre";

beforeEach(() => { localStorage.clear(); document.documentElement.className = ""; });

describe("Estimation d'empreinte", () => {
  it("note A pour une page très sobre et G pour une page très lourde", () => {
    expect(estimate({ dom: 40, requests: 1, kb: 1 }).grade).toBe("A");
    expect(estimate({ dom: 5000, requests: 400, kb: 9000 }).grade).toBe("G");
  });
  it("pèse plus le DOM que les requêtes, et les requêtes plus que le poids", () => {
    const base = { dom: 100, requests: 5, kb: 20 };
    const s = estimate(base).score;
    expect(s - estimate({ ...base, dom: 1000 }).score).toBeGreaterThan(s - estimate({ ...base, kb: 1000 }).score);
  });
});

describe("Badge et mode sobre", () => {
  const ui = () => render(<SobreProvider><MemoryRouter><EcoBadge />
    <SobreImage src="/images/atelier.webp" alt="Atelier" width={800} height={450} kb={48} /></MemoryRouter></SobreProvider>);

  it("ouvre le panneau et active le mode sobre", async () => {
    ui();
    const badge = await screen.findByRole("button", { name: /EcoIndex estimé/ }, { timeout: 2000 });
    expect(screen.getByRole("img", { name: "Atelier" })).toBeTruthy();
    fireEvent.click(badge);
    fireEvent.click(screen.getByRole("switch", { name: /Mode sobre/ }));
    expect(document.documentElement.classList.contains("sobre")).toBe(true);
    const placeholder = screen.getByRole("button", { name: /Afficher l'image/ });
    fireEvent.click(placeholder);
    expect(screen.getByRole("img", { name: "Atelier" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
