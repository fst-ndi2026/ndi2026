import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, afterEach } from "vitest";
import axe from "axe-core";
import Rafiq from "./components/Rafiq";
import { askRafiq } from "./lib/rafiq";
import { I18nProvider } from "./lib/i18n";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); delete (globalThis as { LanguageModel?: unknown }).LanguageModel; });

const ui = () => render(<I18nProvider><MemoryRouter><Rafiq /></MemoryRouter></I18nProvider>);
const server = (body: object) => vi.fn().mockResolvedValue({ ok: true, json: async () => body });

describe("Cascade des cerveaux", () => {
  it("1. garde la réponse de Claude quand le serveur en a une", async () => {
    vi.stubGlobal("fetch", server({ answer: "Via Claude", refs: ["inscription"], lang: "fr", found: true, source: "llm" }));
    expect((await askRafiq("Comment s'inscrire ?")).source).toBe("llm");
  });
  it("2. passe à Gemini Nano si le serveur n'a pas de clé et que Nano est prêt", async () => {
    vi.stubGlobal("fetch", server({ answer: "Fiche", refs: [], lang: "fr", found: true, source: "offline" }));
    const prompt = vi.fn().mockResolvedValue("Réponse de Nano");
    (globalThis as { LanguageModel?: unknown }).LanguageModel = {
      availability: async () => "available",
      create: async () => ({ prompt, destroy: () => {} }),
    };
    const r = await askRafiq("Le site est-il écologique ?");
    expect(r).toMatchObject({ source: "nano", answer: "Réponse de Nano", refs: ["sobriete"] });
    expect(prompt.mock.calls[0][0]).toContain("<fiches>");
  });
  it("ne déclenche jamais le téléchargement de Nano", async () => {
    vi.stubGlobal("fetch", server({ answer: "Fiche", refs: ["sobriete"], lang: "fr", found: true, source: "offline" }));
    const create = vi.fn();
    (globalThis as { LanguageModel?: unknown }).LanguageModel = { availability: async () => "downloadable", create };
    expect((await askRafiq("Le site est-il écologique ?")).source).toBe("offline");
    expect(create).not.toHaveBeenCalled();
  });
  it("3. répond hors ligne même sans serveur ni réseau", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("hors ligne")));
    const r = await askRafiq("هل الموقع آمن؟");
    expect(r).toMatchObject({ source: "offline", lang: "ar", found: true, refs: ["securite", expect.any(String)] });
  });
});

describe("Fenêtre Rafiq", () => {
  it("annonce l'IA, répond avec sa source, et se ferme avec Échap", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("hors ligne")));
    ui();
    const fab = screen.getByRole("button", { name: "Rafiq" });
    fireEvent.click(fab);
    const dialog = screen.getByRole("dialog", { name: "Rafiq" });
    expect(within(dialog).getByText(/Vous échangez avec une intelligence artificielle/)).toBeTruthy();
    expect(document.activeElement).toBe(within(dialog).getByLabelText("Votre question"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Comment s'inscrire ?" }));
    expect(await within(dialog).findByRole("link", { name: /Source : S'inscrire/ })).toBeTruthy();
    expect(within(dialog).getByText(/fiches du site \(hors ligne\)/)).toBeTruthy();
    const res = await axe.run(dialog, { rules: { "color-contrast": { enabled: false } } });
    expect(res.violations.map((v) => v.id)).toEqual([]);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(fab);
  });
  it("change de personnalité et montre comment il fonctionne", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("hors ligne")));
    ui();
    fireEvent.click(screen.getByRole("button", { name: "Rafiq" }));
    fireEvent.click(screen.getByRole("radio", { name: "Chat'bruti" }));
    expect(screen.getByRole("radio", { name: "Chat'bruti" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.change(screen.getByLabelText("Votre question"), { target: { value: "Comment s'inscrire ?" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    expect(await screen.findByText(/grille-pain/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Comment je fonctionne" }));
    expect(await screen.findByText("Toujours prête")).toBeTruthy();
    expect(screen.getByText("Absent de ce navigateur")).toBeTruthy();
  });
});
