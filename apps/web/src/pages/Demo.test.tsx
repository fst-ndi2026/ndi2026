import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import Demo from "./Demo";

afterEach(() => vi.unstubAllGlobals());

describe("Demo", () => {
  it("affiche une alerte si l'API échoue", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    render(<Demo />);
    expect(await screen.findByRole("alert")).toBeTruthy();
  });
  it("affiche les éléments quand l'API répond", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, json: async () => [{ id: 1, title: "Nouakchott", body: "" }],
    }));
    render(<Demo />);
    expect(await screen.findByText("Nouakchott")).toBeTruthy();
  });
  it("affiche l'état vide", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    render(<Demo />);
    expect(await screen.findByText(/Aucun élément/)).toBeTruthy();
  });
});
