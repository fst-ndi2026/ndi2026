import { describe, it, expect } from "vitest";
import fs from "node:fs";
import request from "supertest";
import app from "../app.js";
import { estimatePassword } from "../../../shared/password.js";

const root = new URL("../../../", import.meta.url);

describe("Robustesse des mots de passe (repère CNIL)", () => {
  it("refuse les mots courants, années, suites et répétitions", () => {
    for (const p of ["motdepasse123", "Nouakchott2026", "azerty123", "P@ssw0rd!", "aaaaaaaaaaaa", "abcdefgh1234"]) {
      expect(estimatePassword(p).accepted, p).toBe(false);
    }
  });
  it("retrouve les exemples CNIL : 12 caractères de 4 types ou 14 sans caractère spécial ≈ 80 bits", () => {
    expect(estimatePassword("Xk9#mQ2!vL7p").bits).toBeGreaterThanOrEqual(80);
    expect(estimatePassword("Xk9mQ2vL7pRt4w").bits).toBeGreaterThanOrEqual(80);
  });
  it("accepte une phrase de passe", () => {
    expect(estimatePassword("sable-dromadaire-7-lune")).toMatchObject({ accepted: true, level: 4 });
  });
  it("le serveur applique la même règle", async () => {
    const res = await request(app).post("/api/register").send({
      fullName: "Test", email: "faible@example.com", password: "Nouakchott2026", acceptTerms: true,
    });
    expect(res.status).toBe(400);
    expect(res.body.fields).toContain("password");
  });
});

describe("En-têtes de sécurité déployés (vercel.json)", () => {
  const vercel = JSON.parse(fs.readFileSync(new URL("vercel.json", root), "utf8"));
  const all = vercel.headers.find((h) => h.source === "/(.*)").headers;
  const get = (k) => all.find((h) => h.key.toLowerCase() === k.toLowerCase())?.value ?? "";

  it("CSP stricte sans unsafe-inline ni unsafe-eval", () => {
    const csp = get("Content-Security-Policy");
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).not.toMatch(/unsafe-(inline|eval)/);
    expect(csp).toContain("https://api.pwnedpasswords.com");
  });
  it("HSTS, nosniff, référent, permissions et isolation", () => {
    expect(get("Strict-Transport-Security")).toMatch(/max-age=(\d{8,})/);
    expect(get("X-Content-Type-Options")).toBe("nosniff");
    expect(get("Referrer-Policy")).toBe("no-referrer");
    expect(get("Permissions-Policy")).toContain("camera=()");
    expect(get("Cross-Origin-Opener-Policy")).toBe("same-origin");
    expect(get("Cross-Origin-Resource-Policy")).toBe("same-origin");
  });
  it("security.txt conforme à la RFC 9116 et encore valide", () => {
    const txt = fs.readFileSync(new URL("apps/web/public/.well-known/security.txt", root), "utf8");
    expect(txt).toMatch(/^Contact: https:\/\//m);
    const exp = /^Expires: (.+)$/m.exec(txt)[1];
    expect(new Date(exp).getTime()).toBeGreaterThan(Date.now());
  });
  it("l'API annonce sa limitation de débit et cache sa technologie", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["ratelimit-limit"] ?? res.headers["x-ratelimit-limit"] ?? res.headers["ratelimit-policy"]).toBeTruthy();
  });
});
