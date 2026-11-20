import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../app.js";

describe("API", () => {
  it("répond sur /api/health", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
  it("liste les éléments", async () => {
    const res = await request(app).get("/api/items");
    expect(Array.isArray(res.body)).toBe(true);
  });
  it("refuse une entrée invalide", async () => {
    const res = await request(app).post("/api/items").send({ title: "" });
    expect(res.status).toBe(400);
  });
  it("crée un élément valide", async () => {
    const res = await request(app).post("/api/items").send({ title: "Test", body: "ok" });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Test");
  });
  it("inscrit un utilisateur sans renvoyer le mot de passe", async () => {
    const res = await request(app).post("/api/register").send({
      fullName: "Sidi Ould Test", email: "Sidi@Example.com", github: "sidi-test",
      filiere: "Informatique", password: "sable-dromadaire-7-lune", acceptTerms: true,
    });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe("sidi@example.com");
    expect(res.body.password).toBeUndefined();
    expect(res.body.passwordHash).toBeUndefined();
  });
  it("refuse un e-mail déjà inscrit", async () => {
    const res = await request(app).post("/api/register").send({
      fullName: "Autre", email: "sidi@example.com", password: "sable-dromadaire-7-lune", acceptTerms: true,
    });
    expect(res.status).toBe(409);
  });
  it("refuse une inscription invalide", async () => {
    const res = await request(app).post("/api/register").send({
      fullName: "A", email: "pas-un-email", password: "court", acceptTerms: false,
    });
    expect(res.status).toBe(400);
    expect(res.body.fields).toEqual(expect.arrayContaining(["fullName", "email", "password", "acceptTerms"]));
  });
  it("répond sans clé IA (repli)", async () => {
    const res = await request(app).post("/api/ask").send({ question: "Bonjour ?" });
    expect(res.body.source).toBe("fallback");
  });
  it("renvoie 404 JSON pour une route API inconnue", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
  });
  it("ajoute les en-têtes de sécurité", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});
