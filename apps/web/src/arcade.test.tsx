import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import axe from "axe-core";
import ArcadeLauncher from "./components/ArcadeLauncher";
import Rafiq from "./components/Rafiq";
import EscapeLayer from "./components/arcade/EscapeLayer";
import { I18nProvider } from "./lib/i18n";
import { hits } from "./lib/arcade/escape";
import { describe as where } from "./lib/arcade/sound";

vi.mock("./lib/arcade/escape", async (orig) => {
  const m = await orig<typeof import("./lib/arcade/escape")>();
  return { ...m, collectWords: () => [
    { text: "national", x: 5 * 24, y: 16 * 24, w: 30, h: 20 },
    { text: "sobre", x: 8 * 24, y: 16 * 24, w: 30, h: 20 },
  ] };
});

beforeEach(() => { localStorage.clear(); document.documentElement.className = ""; });
afterEach(() => { vi.unstubAllGlobals(); });

const ui = (extra?: React.ReactNode) => render(<I18nProvider><MemoryRouter><main><h1>Titre</h1><ArcadeLauncher />{extra}</main></MemoryRouter></I18nProvider>);
const type = (s: string) => [...s].forEach((k) => fireEvent.keyDown(window, { key: k }));

describe("Déclencheurs du jeu caché", () => {
  it("taper « snake » ouvre la borne, accessible, et Échap la ferme", async () => {
    ui();
    expect(screen.queryByRole("dialog")).toBeNull();
    type("snake");
    const d = await screen.findByRole("dialog", { name: "FST SNAKE" });
    const res = await axe.run(d, { rules: { "color-contrast": { enabled: false } } });
    expect(res.violations.map((v) => v.id)).toEqual([]);
    fireEvent.keyDown(d, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
  it("le code Konami, le pixel caché et 5 clics sur le titre ouvrent aussi la borne", async () => {
    ui();
    ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"].forEach((key) => fireEvent.keyDown(window, { key }));
    fireEvent.keyDown(await screen.findByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Pixel mystère" }));
    fireEvent.keyDown(await screen.findByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole("heading", { name: "Titre" }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
  });
  it("taper « snake » dans un champ ne déclenche rien", () => {
    render(<I18nProvider><MemoryRouter><input aria-label="champ" /><ArcadeLauncher /></MemoryRouter></I18nProvider>);
    const f = screen.getByLabelText("champ");
    [..."snake"].forEach((k) => fireEvent.keyDown(f, { key: k }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("demander à Rafiq « on joue ? » ouvre la borne", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("hors ligne")));
    ui(<Rafiq />);
    fireEvent.click(screen.getByRole("button", { name: "Rafiq" }));
    fireEvent.change(screen.getByLabelText("Votre question"), { target: { value: "On joue ?" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    expect(await screen.findByText(/J'ouvre la borne d'arcade/)).toBeTruthy();
    expect(await screen.findByRole("dialog", { name: "FST SNAKE" }, { timeout: 2000 })).toBeTruthy();
  });
});

describe("Borne", () => {
  it("joue, met en pause, et active le mode 8-bit mémorisé", async () => {
    ui();
    type("snake");
    const d = await screen.findByRole("dialog", { name: "FST SNAKE" });
    fireEvent.click(screen.getByRole("button", { name: "JOUER" }));
    fireEvent.keyDown(d, { key: " " });
    expect(await screen.findByText("PAUSE", { selector: "p" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "SITE 8-BIT" }));
    expect(document.documentElement.classList.contains("retro")).toBe(true);
    expect(localStorage.getItem("mode-8bit")).toBe("1");
    expect(screen.getByRole("button", { name: "SITE 8-BIT" }).getAttribute("aria-pressed")).toBe("true");
  });
});

describe("Évasion dans le site", () => {
  it("mange les mots sur son chemin et gagne la phrase mystère", async () => {
    const onEnd = vi.fn();
    render(<I18nProvider><EscapeLayer onEnd={onEnd} sound={null} /></I18nProvider>);
    expect(screen.getByText(/ÉVASION/)).toBeTruthy();
    await waitFor(() => expect(onEnd).toHaveBeenCalledWith(2, true), { timeout: 3000 });
  });
  it("Échap rend la page intacte", async () => {
    const onEnd = vi.fn();
    const { unmount } = render(<I18nProvider><EscapeLayer onEnd={onEnd} sound={null} /></I18nProvider>);
    act(() => { fireEvent.keyDown(window, { key: "Escape" }); });
    expect(onEnd).toHaveBeenCalledWith(0, false);
    unmount();
    expect(document.documentElement.style.overflow).toBe("");
  });
  it("collision et guidage", () => {
    expect(hits({ x: 0, y: 0, w: 24, h: 24 }, { x: 20, y: 10, w: 30, h: 20 })).toBe(true);
    expect(hits({ x: 0, y: 0, w: 24, h: 24 }, { x: 30, y: 0, w: 30, h: 20 })).toBe(false);
    expect(where(-3, 2, "fr")).toBe("Pomme : 3 à gauche, 2 en bas");
    expect(where(0, 0, "fr")).toBe("Pomme : droit devant");
  });
});
