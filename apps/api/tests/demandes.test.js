import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

const ok = { name: "Aïcha", email: "aicha@exemple.mr", elapsed: 8000 };

describe("Formulaire augmenté (API)", () => {
  it("enregistre un don et renvoie une référence avec l'année courante", async () => {
    const res = await request(app).post("/api/demandes").send({ ...ok, mission: "don", amount: 25, frequency: "monthly" }).expect(201);
    const y = new Date().getFullYear();
    expect(res.body.ref).toMatch(new RegExp(`^FST-${y}-\\d{4}$`));
    expect(res.body).toMatchObject({ year: y, count: 1 });
  });
  it("valide les champs propres à chaque mission", async () => {
    const r1 = await request(app).post("/api/demandes").send({ ...ok, mission: "don", amount: -5, frequency: "souvent" }).expect(400);
    expect(r1.body.fields).toEqual(expect.arrayContaining(["amount", "frequency"]));
    const r2 = await request(app).post("/api/demandes").send({ ...ok, mission: "benevole", skills: [], phone: "abc" }).expect(400);
    expect(r2.body.fields).toEqual(expect.arrayContaining(["skills", "phone"]));
  });
  it("bloque les robots : pot de miel rempli ou envoi trop rapide", async () => {
    await request(app).post("/api/demandes").send({ ...ok, mission: "info", topic: "Le projet", website: "http://spam" }).expect(422);
    await request(app).post("/api/demandes").send({ ...ok, mission: "info", topic: "Le projet", elapsed: 400 }).expect(422);
  });
  it("limite à 5 envois par minute", async () => {
    const codes = [];
    for (let i = 0; i < 3; i++) codes.push((await request(app).post("/api/demandes").send({ ...ok, mission: "contact", message: "Bonjour à tous" })).status);
    expect(codes).toContain(429);
  });
});
