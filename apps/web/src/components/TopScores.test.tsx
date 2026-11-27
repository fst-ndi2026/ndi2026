import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import TopScores from "./TopScores";

afterEach(() => vi.unstubAllGlobals());

describe("TopScores", () => {
    it("affiche le chargement pendant l'attente", () => {
        vi.stubGlobal("fetch", vi.fn(() => new Promise(() => { })));
        render(<TopScores />);
        expect(screen.getByText("Chargement…")).toBeTruthy();
    });
    it("affiche les scores dans l'ordre et demande la bonne limite", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true, json: async () => [{ name: "MED", score: 420 }, { name: "AYA", score: 390 }],
        });
        vi.stubGlobal("fetch", fetchMock);
        render(<TopScores limit={3} />);
        const items = await screen.findAllByRole("listitem");
        expect(items).toHaveLength(2);
        expect(items[0].textContent).toContain("MED");
        expect(fetchMock.mock.calls[0][0]).toContain("/api/scores?limit=3");
    });
    it("affiche une alerte si l'API échoue", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
        render(<TopScores />);
        expect(await screen.findByRole("alert")).toBeTruthy();
    });
    it("affiche l'état vide", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
        render(<TopScores />);
        expect(await screen.findByText(/Aucun élément/)).toBeTruthy();
    });
});