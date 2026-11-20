import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";
import { store } from "../store.js";

describe("Scores du jeu caché", () => {
  it("enregistre 3 lettres et renvoie le classement trié", async () => {
    await request(app).post("/api/scores").send({ name: "aya", score: 390 }).expect(201);
    const res = await request(app).post("/api/scores").send({ name: "MED", score: 420 }).expect(201);
    expect(res.body[0]).toEqual({ name: "MED", score: 420 });
    expect(res.body[1]).toEqual({ name: "AYA", score: 390 });
  });
  it("refuse un nom invalide ou un score impossible", async () => {
    await request(app).post("/api/scores").send({ name: "<b>", score: 10 }).expect(400);
    await request(app).post("/api/scores").send({ name: "ABCD", score: 10 }).expect(400);
    await request(app).post("/api/scores").send({ name: "ABC", score: 999999 }).expect(400);
    await request(app).post("/api/scores").send({ name: "ABC", score: 1.5 }).expect(400);
  });
  it("limite les envois à 10 par minute", async () => {
    const codes = [];
    for (let i = 0; i < 6; i++) codes.push((await request(app).post("/api/scores").send({ name: "XYZ", score: 1 })).status);
    expect(codes).toContain(429);
  });
  it("limite le classement à 10", async () => {
    for (let i = 0; i < 12; i++) await store.addScore({ name: "ZZZ", score: i });
    const res = await request(app).get("/api/scores").expect(200);
    expect(res.body.length).toBe(10);
  });
});
