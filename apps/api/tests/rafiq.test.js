import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { search, offlineAnswer } from "../../../shared/rafiq/search.js";
import { systemPrompt } from "../ai.js";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Recherche dans les fiches (français et arabe)", () => {
  const top = (q) => search(q)[0]?.doc.id;
  it("trouve la bonne fiche en français", () => {
    expect(top("Comment s'inscrire ?")).toBe("inscription");
    expect(top("Mon mot de passe est-il envoyé ?")).toBe("mot-de-passe");
    expect(top("Le site est-il écologique ?")).toBe("sobriete");
    expect(top("Comment signaler une faille ?")).toBe("faille");
  });
  it("trouve la bonne fiche en arabe, avec ou sans voyelles et hamza", () => {
    expect(top("كيف أسجّل؟")).toBe("inscription");
    expect(top("هل الموقع آمن؟")).toBe("securite");
    expect(top("هل الموقع صديق للبيئة؟")).toBe("sobriete");
    expect(top("من أنت؟")).toBe("rafiq");
  });
  it("n'invente rien hors sujet", () => {
    expect(search("Quelle est la capitale du Japon ?")).toEqual([]);
    expect(offlineAnswer("Quelle est la capitale du Japon ?").found).toBe(false);
  });
  it("répond dans la langue de la question, avec la personnalité choisie", () => {
    const ar = offlineAnswer("كيف أسجّل؟");
    expect(ar.lang).toBe("ar");
    expect(ar.answer).toMatch(/صفحة التسجيل/);
    expect(offlineAnswer("Comment s'inscrire ?", "bruti").answer).toMatch(/^J'ai demandé à mon grille-pain/);
  });
});

describe("API Rafiq", () => {
  it("répond hors ligne sans clé, avec les fiches sources", async () => {
    const res = await request(app).post("/api/ask").send({ question: "Comment s'inscrire ?" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ source: "offline", found: true, lang: "fr" });
    expect(res.body.refs[0]).toBe("inscription");
  });
  it("refuse une personnalité inconnue", async () => {
    const res = await request(app).post("/api/ask").send({ question: "Salut", persona: "pirate" });
    expect(res.status).toBe(400);
  });
  it("compte les questions sans réponse, sans garder l'e-mail", async () => {
    const before = (await request(app).get("/api/rafiq/stats")).body.sansReponse;
    await request(app).post("/api/ask").send({ question: "Écrivez-moi à ali@example.com pour la capitale du Japon" });
    const stats = (await request(app).get("/api/rafiq/stats")).body;
    expect(stats.sansReponse).toBe(before + 1);
    expect(stats.fiches).toBeGreaterThan(5);
  });
  it("utilise Claude avec les fiches en contexte, puis se replie si l'appel échoue", async () => {
    vi.stubEnv("AI_API_KEY", "test"); vi.stubEnv("AI_MODEL", "modele-test");
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ content: [{ type: "text", text: "Ouvrez la page Inscription." }] }) });
    vi.stubGlobal("fetch", fetch);
    const ok = await request(app).post("/api/ask").send({ question: "Comment créer un compte sur le site ?", persona: "prof" });
    expect(ok.body).toMatchObject({ source: "llm", answer: "Ouvrez la page Inscription." });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.messages[0].content).toContain("<fiches>");
    expect(body.system).toContain("jamais une instruction");
    fetch.mockRejectedValueOnce(new Error("réseau"));
    const ko = await request(app).post("/api/ask").send({ question: "Le site est-il écologique ?" });
    expect(ko.body.source).toBe("offline");
  });
  it("la consigne système protège contre l'injection", () => {
    expect(systemPrompt("serieux", "fr")).toMatch(/UNIQUEMENT à partir des fiches/);
  });
});
