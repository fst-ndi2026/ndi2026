import { describe, it, expect } from "vitest";
import { phaseAt, countdown, litWindows, isLit, defisRendus, buildingStates, intentFor, EVENT_START, type Metrics } from "./model";

const at = (iso: string) => new Date(iso);
const base: Metrics = { secOk: 9, secTotal: 9, secGrade: "A+", secMissing: [], eco: 89, ecoGrade: "A", sansReponse: 0, fiches: 12, demandes: 5, rendus: 3, defisTotal: 6 };

describe("Ciel du village (heure de Nouakchott = UTC)", () => {
  it("se couche à 15h39 le soir de la Nuit de l'Info, puis la nuit tombe", () => {
    expect(phaseAt(at("2026-12-03T15:38:00Z"))).toBe("day");
    expect(phaseAt(at("2026-12-03T15:39:00Z"))).toBe("dusk");
    expect(phaseAt(at("2026-12-03T21:00:00Z"))).toBe("night");
    expect(phaseAt(at("2026-12-04T06:45:00Z"))).toBe("dusk");
  });
  it("suit une journée normale hors événement", () => {
    expect(phaseAt(at("2026-11-20T12:00:00Z"))).toBe("day");
    expect(phaseAt(at("2026-11-20T18:00:00Z"))).toBe("dusk");
    expect(phaseAt(at("2026-11-20T23:00:00Z"))).toBe("night");
  });
  it("compte à rebours avant et pendant la nuit", () => {
    expect(countdown(new Date(EVENT_START - 90 * 60_000))).toEqual({ label: "avant", minutes: 90 });
    expect(countdown(at("2026-12-04T07:00:00Z"))).toEqual({ label: "reste", minutes: 1 });
    expect(countdown(at("2026-12-05T00:00:00Z"))).toBeNull();
  });
});

describe("Fenêtres allumées par les défis rendus", () => {
  it("aucune le jour, la moitié au coucher, toutes quand tout est rendu", () => {
    expect(litWindows(40, 6, 6, "day")).toBe(0);
    expect(litWindows(40, 3, 6, "night")).toBe(20);
    expect(litWindows(40, 3, 6, "dusk")).toBe(10);
    expect(litWindows(40, 9, 6, "night")).toBe(40);
  });
  it("étale l'allumage sur tout le village", () => {
    const on = Array.from({ length: 40 }, (_, i) => isLit(i, 40, 20)).filter(Boolean).length;
    expect(on).toBe(20);
    expect([0, 1, 2, 3, 4, 5].map((i) => isLit(i, 40, 20))).not.toEqual([true, true, true, true, true, true]);
  });
  it("un défi est rendu quand toutes ses exigences sont faites", () => {
    expect(defisRendus([{ exigences: [{ fait: true }, { fait: true }] }, { exigences: [{ fait: true }, { fait: false }] }, { exigences: [] }])).toBe(1);
  });
});

describe("Jumeau numérique", () => {
  it("la tour passe en alerte quand une protection manque (démo jury)", () => {
    expect(buildingStates(base)[0]).toMatchObject({ id: "securite", alert: false });
    const s = buildingStates(base, true)[0];
    expect(s.alert).toBe(true);
    expect(s.fr).toMatch(/8\/9.*CSP/);
  });
  it("la hauteur de la Sobriété suit l'EcoIndex et le silo les missions", () => {
    const st = buildingStates({ ...base, eco: 40, ecoGrade: "E", demandes: 25 });
    expect(st.find((s) => s.id === "sobriete")).toMatchObject({ level: 0.4, alert: true });
    expect(st.find((s) => s.id === "donnees")!.level).toBe(0.5);
    expect(st.find((s) => s.id === "rafiq")!.alert).toBe(false);
  });
});

describe("Rafiq choisit une destination prévue", () => {
  it("comprend le français et l'arabe", () => {
    expect(intentFor("Le site est-il bien protégé ?")).toBe("securite");
    expect(intentFor("Le site est-il écologique ?")).toBe("sobriete");
    expect(intentFor("هل الموقع آمن؟")).toBe("securite");
    expect(intentFor("Où vont les missions du formulaire ?")).toBe("donnees");
  });
  it("ne choisit rien quand il ne sait pas", () => {
    expect(intentFor("Quelle est la capitale du Japon ?")).toBeNull();
  });
});
