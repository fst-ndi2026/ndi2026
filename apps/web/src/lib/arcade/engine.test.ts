import { describe, it, expect } from "vitest";
import { newGame, step, turn, apply, speedMs, endEscape, type Game } from "./engine";

const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length]; };
const g0 = (): Game => { const g = newGame(10, 8, seq(0.95, 0.95)); g.food = { x: 9, y: 7 }; return g; };

describe("Moteur du Snake", () => {
  it("avance, grandit en mangeant et compte les points", () => {
    const g = g0(); g.food = { x: 7, y: 4 };
    step(g);
    expect(g.snake[0]).toEqual({ x: 7, y: 4 });
    expect(g.score).toBe(10);
    step(g);
    expect(g.snake.length).toBe(4);
  });
  it("ignore le demi-tour et meurt contre un mur", () => {
    const g = g0();
    turn(g, "L"); step(g);
    expect(g.dir).toBe("R");
    for (let i = 0; i < 10; i++) step(g);
    expect(g.over).toBe(true);
  });
  it("Fantôme : traverse les murs", () => {
    const g = g0(); apply(g, "fantome");
    for (let i = 0; i < 6; i++) step(g);
    expect(g.over).toBe(false);
    expect(g.snake[0].x).toBeLessThan(5);
  });
  it("Éclair : points ×2 et vitesse ×2", () => {
    const g = g0(); const base = speedMs(g);
    apply(g, "eclair"); g.food = { x: 7, y: 4 }; step(g);
    expect(g.score).toBe(20);
    expect(speedMs(g)).toBe(Math.round(base / 2));
  });
  it("Ciseaux : coupe 3 anneaux sans descendre sous 2", () => {
    const g = g0(); g.snake = Array.from({ length: 8 }, (_, i) => ({ x: 8 - i, y: 1 }));
    apply(g, "ciseaux");
    expect(g.snake.length).toBe(5);
    apply(g, "ciseaux"); apply(g, "ciseaux");
    expect(g.snake.length).toBe(2);
  });
  it("Miroir : inverse les commandes", () => {
    const g = g0(); apply(g, "miroir");
    turn(g, "U"); step(g);
    expect(g.dir).toBe("D");
  });
  it("les effets s'arrêtent tout seuls", () => {
    const g = g0(); g.snake = [{ x: 0, y: 0 }, { x: 0, y: 1 }]; g.dir = "R"; apply(g, "sablier");
    g.w = 100;
    for (let i = 0; i < 31; i++) step(g);
    expect(g.effect).toBeNull();
  });
  it("au niveau 3, la case Évasion apparaît et lance l'évasion", () => {
    const g = newGame(30, 10, seq(0.5, 0.1, 0.9, 0.3));
    g.apples = 14; g.level = 3; g.food = { x: g.snake[0].x + 1, y: g.snake[0].y };
    step(g);
    expect(g.special?.kind).toBe("evasion");
    g.special!.p = { x: g.snake[0].x + 1, y: g.snake[0].y };
    step(g);
    expect(g.escape).toBe(true);
    const s = g.score; step(g);
    expect(g.tick).toBe(2);
    endEscape(g, 6, true);
    expect(g.score).toBe(s + 680);
    expect(g.escape).toBe(false);
  });
});
