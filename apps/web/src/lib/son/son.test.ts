import { describe, it, expect } from "vitest";
import { MODES, bands, dominant, loudest, modeFor, smooth, SILENCE } from "./audio";
import { Sand, field, seeded } from "./chladni";

const SR = 48000, FFT = 2048, HZ = SR / FFT; // ≈ 23,4 Hz par case

// Spectre factice : un pic à la fréquence demandée.
function spectrum(peaks: Record<number, number>): Uint8Array {
  const a = new Uint8Array(FFT / 2);
  for (const [hz, v] of Object.entries(peaks)) a[Math.round(Number(hz) / HZ)] = v;
  return a;
}

describe("analyse du son", () => {
  it("trouve la note dominante et la bonne figure", () => {
    expect(Math.abs(dominant(spectrum({ 196: 220, 1200: 90 }), SR, FFT)! - 196)).toBeLessThan(HZ);
    expect(modeFor(196)?.id).toBe("sol");
    expect(modeFor(1150)?.id).toBe("siffle");
    expect(modeFor(140)?.id).toBe("grave");
  });

  it("une note pure aiguë est entendue même si la moyenne de sa bande est faible", () => {
    const f = spectrum({ 1200: 230 });
    expect(bands(f, SR, FFT).mid).toBeLessThan(0.05);
    expect(loudest(f, SR, FFT)!.amp).toBeGreaterThan(0.8);
    expect(modeFor(dominant(f, SR, FFT))?.id).toBe("siffle");
  });

  it("silence : pas de note, pas de figure", () => {
    expect(dominant(new Uint8Array(FFT / 2), SR, FFT)).toBeNull();
    expect(modeFor(null)).toBeNull();
  });

  it("sépare graves, médiums et aigus", () => {
    const b = bands(spectrum({ 100: 255, 4000: 255 }), SR, FFT);
    expect(b.bass).toBeGreaterThan(0);
    expect(b.treble).toBeGreaterThan(0);
    expect(b.mid).toBe(0);
  });

  it("le lissage avance vers la nouvelle valeur sans sauter", () => {
    const s = smooth(SILENCE, { bass: 1, mid: 1, treble: 1, level: 1 }, 0.25);
    expect(s.bass).toBeCloseTo(0.25);
  });
});

describe("figures de Chladni", () => {
  it("la figure est symétrique (plaque carrée)", () => {
    for (const { n, m } of MODES) expect(field(0.2, 0.7, n, m)).toBeCloseTo(field(0.7, 0.2, n, m));
  });

  it("chaque note fait apparaître SA figure, et pas celle des autres", () => {
    for (const mode of MODES) {
      const s = new Sand(2000, seeded(1)), r = seeded(2);
      const before = s.match(mode.n, mode.m);
      for (let f = 0; f < 400; f++) s.step(mode.n, mode.m, 0.8, r);
      expect(s.match(mode.n, mode.m)).toBeGreaterThan(Math.max(0.5, before * 3));
      for (const other of MODES) if (other !== mode) expect(s.match(other.n, other.m)).toBeLessThan(0.3);
    }
  });

  it("en silence, le sable ne bouge pas et reste sur la plaque", () => {
    const s = new Sand(500, seeded(3));
    const x0 = Array.from(s.x);
    s.step(2, 5, 0);
    expect(Array.from(s.x)).toEqual(x0);
    for (let f = 0; f < 200; f++) s.step(5, 9, 1, seeded(f));
    expect(Math.min(...s.x, ...s.y)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...s.x, ...s.y)).toBeLessThanOrEqual(1);
  });
});
