import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

describe("API du village 3D", () => {
  it("renvoie seulement des compteurs agrégés", async () => {
    const res = await request(app).get("/api/village");
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(Object.keys(res.body).sort()).toEqual(["demandes", "fiches", "sansReponse"]);
    expect(res.body.fiches).toBeGreaterThan(0);
  });
  it("compte une mission reçue", async () => {
    const before = (await request(app).get("/api/village")).body.demandes;
    await request(app).post("/api/demandes").send({ name: "Village", email: "village@exemple.mr", elapsed: 8000, mission: "don", amount: 10, frequency: "once" }).expect(201);
    expect((await request(app).get("/api/village")).body.demandes).toBe(before + 1);
  });
});
