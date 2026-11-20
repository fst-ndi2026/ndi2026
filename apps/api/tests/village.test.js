import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../app.js";
import { search } from "../rag.js";

describe("Rafiq et podium", () => {
  it("trouve la bonne fiche sans réseau", () => {
    expect(search("Pourquoi passer à Linux ?")[0].id).toBe("linux");
    expect(search("comment rejoindre la démarche")[0].id).toBe("rejoindre");
  });
  it("répond localement sans clé IA", async () => {
    const res = await request(app).post("/api/ask").send({ question: "C'est quoi NIRD ?" });
    expect(res.body.source).toBe("local");
    expect(res.body.answer).toMatch(/Inclusif/);
  });
  it("classe les villages et enregistre un score", async () => {
    const ok = await request(app).post("/api/scores").send({ village: "Village Test", points: 9000 });
    expect(ok.status).toBe(201);
    const top = await request(app).get("/api/scores");
    expect(top.body[0]).toEqual({ village: "Village Test", points: 9000 });
  });
  it("refuse un pseudonyme dangereux ou un score impossible", async () => {
    expect((await request(app).post("/api/scores").send({ village: "<script>", points: 10 })).status).toBe(400);
    expect((await request(app).post("/api/scores").send({ village: "Ok", points: 99999 })).status).toBe(400);
  });
});
