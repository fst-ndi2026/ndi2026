import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import axe from "axe-core";
import Agir from "./pages/Agir";
import { I18nProvider } from "./lib/i18n";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); delete (globalThis as { LanguageModel?: unknown }).LanguageModel; });
const ui = () => render(<I18nProvider><Agir /></I18nProvider>);

describe("Formulaire augmenté", () => {
  it("affiche l'année courante et adapte les champs à la mission", async () => {
    const { container } = ui();
    expect(screen.getByText(String(new Date().getFullYear()))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Offrir un don/ }));
    expect(screen.getByRole("heading", { level: 1, name: /Offrir un don/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "25 €" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: /Chaque mois/ })).toBeTruthy();
    expect(screen.queryByLabelText("Ton message")).toBeNull();
    const res = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(res.violations.map((v) => v.id)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: /Changer de mission/ }));
    fireEvent.click(screen.getByRole("button", { name: /Établir le contact/ }));
    expect(screen.getByLabelText("Ton message")).toBeTruthy();
  });

  it("« Dis-le en une phrase » remplit la mission et les champs, marqués ✨", async () => {
    ui();
    fireEvent.change(screen.getByLabelText(/Écris ou dicte/), { target: { value: "Je m'appelle Aïcha, je veux donner 25 € chaque mois, aicha@exemple.mr" } });
    fireEvent.click(screen.getByRole("button", { name: /Remplir pour moi/ }));
    expect(await screen.findByRole("heading", { level: 1, name: /Offrir un don/ })).toBeTruthy();
    expect((screen.getByLabelText(/^Nom/) as HTMLInputElement).value).toBe("Aïcha");
    expect((screen.getByLabelText(/^E-mail/) as HTMLInputElement).value).toBe("aicha@exemple.mr");
    expect(screen.getByRole("button", { name: "25 €" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("radio", { name: /Chaque mois/ }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getAllByText(/rempli automatiquement/).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText(/extracteur local/)).toBeTruthy();
    expect(screen.getByText(/300 € sur un an = 60 heures/)).toBeTruthy();
  });

  it("utilise Gemini Nano quand il est présent", async () => {
    (globalThis as { LanguageModel?: unknown }).LanguageModel = {
      availability: async () => "available",
      create: async () => ({ prompt: async () => JSON.stringify({ mission: "benevole", name: "Sidi" }), destroy: () => {} }),
    };
    ui();
    fireEvent.change(screen.getByLabelText(/Écris ou dicte/), { target: { value: "Sidi aimerait aider l'équipe" } });
    fireEvent.click(screen.getByRole("button", { name: /Remplir pour moi/ }));
    expect(await screen.findByRole("heading", { level: 1, name: /bénévoles/ })).toBeTruthy();
    expect(screen.getByText(/Gemini Nano/)).toBeTruthy();
  });

  it("explique les erreurs, puis envoie et débloque un badge", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ref: "FST-2026-0037", count: 37, year: 2026 }) });
    vi.stubGlobal("fetch", fetch);
    ui();
    fireEvent.click(screen.getByRole("button", { name: /Offrir un don/ }));
    fireEvent.change(screen.getByLabelText(/^E-mail/), { target: { value: "aicha@exemple" } });
    fireEvent.click(screen.getByRole("button", { name: /Valider mon don/ }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getAllByText(/Il manque la fin de l'adresse/).length).toBeGreaterThan(0);
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/^E-mail/), { target: { value: "aicha@exemple.mr" } });
    fireEvent.change(screen.getByLabelText(/^Nom/), { target: { value: "Aïcha" } });
    fireEvent.click(screen.getByRole("button", { name: "50 €" }));
    fireEvent.click(screen.getByRole("button", { name: /Valider mon don/ }));
    expect(await screen.findByRole("heading", { name: "Mécène de 2026" })).toBeTruthy();
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body).toMatchObject({ mission: "don", amount: 50, frequency: "once", website: "" });
    expect(typeof body.elapsed).toBe("number");
    expect(screen.getByText("FST-2026-0037")).toBeTruthy();
  });

  it("😈 Bad UI : e-mail lettre par lettre et bouton fuyant", () => {
    ui();
    fireEvent.click(screen.getByRole("button", { name: /Établir le contact/ }));
    fireEvent.click(screen.getByRole("switch"));
    const slider = screen.getByLabelText(/E-mail, lettre par lettre/);
    fireEvent.change(slider, { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter « b »" }));
    expect(screen.getByText("b", { selector: "code" })).toBeTruthy();
    const send = screen.getByRole("button", { name: "Envoyer" });
    const before = send.style.transform;
    for (let i = 0; i < 3; i++) fireEvent.mouseEnter(send);
    expect(send.style.transform).not.toBe(before);
    fireEvent.click(send);
    expect(screen.getByText(/ne pas refuser de ne pas être en désaccord/)).toBeTruthy();
  });
});
