import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import Inscription from "./Inscription";

afterEach(() => vi.unstubAllGlobals());

function fill() {
  fireEvent.change(screen.getByLabelText("Nom complet"), { target: { value: "Aïcha Mint Ahmed" } });
  fireEvent.change(screen.getByLabelText("Adresse e-mail"), { target: { value: "aicha@example.com" } });
  fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "motdepasse123" } });
  fireEvent.change(screen.getByLabelText("Confirmer le mot de passe"), { target: { value: "motdepasse123" } });
  fireEvent.click(screen.getByLabelText(/J'accepte la charte/));
}

describe("Inscription", () => {
  it("affiche les erreurs si le formulaire est vide", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<Inscription />);
    fireEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getAllByText("Adresse e-mail invalide.").length).toBeGreaterThan(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("signale des mots de passe différents", async () => {
    render(<Inscription />);
    fill();
    fireEvent.change(screen.getByLabelText("Confirmer le mot de passe"), { target: { value: "autre12345" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));
    expect((await screen.findAllByText("Les mots de passe ne correspondent pas.")).length).toBeGreaterThan(0);
  });

  it("envoie l'inscription et confirme", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: 1 }) });
    vi.stubGlobal("fetch", fetch);
    render(<Inscription />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));
    expect(await screen.findByText(/Inscription réussie/)).toBeTruthy();
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body).toMatchObject({ email: "aicha@example.com", acceptTerms: true });
    expect(body.confirm).toBeUndefined();
  });

  it("signale un e-mail déjà inscrit", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 409 }));
    render(<Inscription />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));
    expect((await screen.findAllByText("Cette adresse e-mail est déjà inscrite.")).length).toBeGreaterThan(0);
  });
});
