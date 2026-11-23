import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, afterEach } from "vitest";
import { checkHeaders, grade } from "./lib/security";
import { pwnedCount } from "./lib/pwned";
import SecurityBadge from "./components/SecurityBadge";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

const GOOD = {
  "content-security-policy": "default-src 'none'; script-src 'self'; frame-ancestors 'none'",
  "strict-transport-security": "max-age=63072000",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
};
const api = new Headers({ "x-ratelimit-limit": "120" });

describe("Vérification des protections", () => {
  it("A+ quand les 9 protections sont là", () => {
    const c = checkHeaders(new Headers(GOOD), api, "");
    expect(c.every((x) => x.ok)).toBe(true);
    expect(grade(c)).toBe("A+");
  });
  it("micro réservé au site : accepté ; micro ouvert à tous : refusé", () => {
    const perm = (v: string) => checkHeaders(new Headers({ ...GOOD, "permissions-policy": v }), api, "").find((x) => x.id === "perms")!.ok;
    expect(perm("camera=(), microphone=(self), geolocation=()")).toBe(true);
    expect(perm("camera=(), microphone=*, geolocation=()")).toBe(false);
    expect(perm("camera=(), geolocation=()")).toBe(false);
  });
  it("détecte une CSP faible et l'absence d'en-têtes", () => {
    const c = checkHeaders(new Headers({ "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline'" }), null, "id=1");
    expect(c.find((x) => x.id === "csp")!.ok).toBe(false);
    expect(c.filter((x) => !x.ok).length).toBe(9);
    expect(grade(c)).toBe("F");
  });
});

describe("Fuites de mots de passe (k-anonymat)", () => {
  it("n'envoie que 5 caractères de l'empreinte et compte les apparitions", async () => {
    const hash = "21BD12DC183F740EE76F27B78EB39C8AD972A757"; // SHA-1 de « P@ssw0rd »
    const fetch = vi.fn().mockResolvedValue({ ok: true, text: async () => "0000AAA:0\r\n2DC183F740EE76F27B78EB39C8AD972A757:52579\r\n" });
    vi.stubGlobal("fetch", fetch);
    expect(await pwnedCount("ignoré", hash)).toBe(52579);
    expect(fetch.mock.calls[0][0]).toBe("https://api.pwnedpasswords.com/range/21BD1");
  });
  it("renvoie null si le service est injoignable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("hors ligne")));
    expect(await pwnedCount("x", "ABCDEF0123")).toBeNull();
  });
});

describe("Badge bouclier", () => {
  it("affiche la note et ouvre le détail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string) =>
      url.includes("/api/") ? { ok: true, headers: api } : { ok: true, headers: new Headers(GOOD) }));
    render(<MemoryRouter><SecurityBadge /></MemoryRouter>);
    const btn = await screen.findByRole("button", { name: /Sécurité A\+ · 9\/9/ }, { timeout: 2000 });
    fireEvent.click(btn);
    expect(screen.getByRole("dialog", { name: "Protections de cette page" })).toBeTruthy();
    expect(screen.getAllByText("✓ OK").length).toBe(9);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
