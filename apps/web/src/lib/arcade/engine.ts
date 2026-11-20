// Moteur du Snake : logique pure (sans affichage), testée à part.
import type { Kind } from "./config";

export type Pt = { x: number; y: number };
export type Dir = "U" | "D" | "L" | "R";
export type Special = { p: Pt; kind: Kind; ttl: number };
export type Game = {
  w: number; h: number; snake: Pt[]; dir: Dir; queue: Dir[]; grow: number;
  food: Pt; special: Special | null; effect: { kind: Kind; until: number } | null;
  score: number; apples: number; level: number; tick: number; over: boolean;
  escape: boolean; escapeSeen: boolean; rng: () => number; events: string[];
};

const DELTA: Record<Dir, Pt> = { U: { x: 0, y: -1 }, D: { x: 0, y: 1 }, L: { x: -1, y: 0 }, R: { x: 1, y: 0 } };
const OPPOSITE: Record<Dir, Dir> = { U: "D", D: "U", L: "R", R: "L" };
export const TIMED: Kind[] = ["eclair", "fantome", "sablier", "miroir"];
const SPECIALS: Kind[] = ["eclair", "fantome", "ciseaux", "sablier", "miroir"];
export const same = (a: Pt, b: Pt) => a.x === b.x && a.y === b.y;

export function newGame(w = 24, h = 16, rng: () => number = Math.random): Game {
  const y = Math.floor(h / 2);
  const g: Game = {
    w, h, snake: [{ x: 6, y }, { x: 5, y }, { x: 4, y }], dir: "R", queue: [], grow: 0,
    food: { x: 0, y: 0 }, special: null, effect: null, score: 0, apples: 0, level: 1, tick: 0,
    over: false, escape: false, escapeSeen: false, rng, events: [],
  };
  g.food = freeCell(g);
  return g;
}

export function freeCell(g: Game): Pt {
  for (let i = 0; i < 500; i++) {
    const p = { x: Math.floor(g.rng() * g.w), y: Math.floor(g.rng() * g.h) };
    if (!g.snake.some((s) => same(s, p)) && !(g.special && same(g.special.p, p)) && !same(g.food ?? { x: -1, y: -1 }, p)) return p;
  }
  return { x: 0, y: 0 };
}

export const active = (g: Game, k: Kind) => g.effect?.kind === k && g.tick < g.effect.until;

export function turn(g: Game, d: Dir) {
  const dir = active(g, "miroir") ? OPPOSITE[d] : d;
  const last = g.queue[g.queue.length - 1] ?? g.dir;
  if (dir === last || dir === OPPOSITE[last] || g.queue.length >= 2) return;
  g.queue.push(dir);
}

// Durée d'un pas en millisecondes.
export function speedMs(g: Game, calm = false): number {
  let ms = Math.max(70, 160 - (g.level - 1) * 12);
  if (active(g, "eclair")) ms /= 2;
  if (active(g, "sablier")) ms *= 1.8;
  return Math.round(calm ? ms * 1.4 : ms);
}

export function apply(g: Game, kind: Kind) {
  g.events.push(kind);
  if (kind === "ciseaux") { g.snake = g.snake.slice(0, Math.max(2, g.snake.length - 3)); g.score += 20; return; }
  if (kind === "evasion") { g.escape = true; g.escapeSeen = true; return; }
  g.effect = { kind, until: g.tick + (kind === "sablier" ? 30 : 40) };
}

export function step(g: Game): Game {
  if (g.over || g.escape) return g;
  g.tick++;
  if (g.effect && g.tick >= g.effect.until) { g.effect = null; g.events.push("fin"); }
  g.dir = g.queue.shift() ?? g.dir;
  const d = DELTA[g.dir];
  let head = { x: g.snake[0].x + d.x, y: g.snake[0].y + d.y };
  const ghost = active(g, "fantome");
  if (head.x < 0 || head.y < 0 || head.x >= g.w || head.y >= g.h) {
    if (!ghost) { g.over = true; g.events.push("mort"); return g; }
    head = { x: (head.x + g.w) % g.w, y: (head.y + g.h) % g.h };
  }
  const body = g.grow > 0 ? g.snake : g.snake.slice(0, -1);
  if (!ghost && body.some((s) => same(s, head))) { g.over = true; g.events.push("mort"); return g; }
  g.snake = [head, ...body];
  if (g.grow > 0) g.grow--;

  if (same(head, g.food)) {
    g.score += 10 * (active(g, "eclair") ? 2 : 1);
    g.grow += 1; g.apples++;
    g.level = 1 + Math.floor(g.apples / 5);
    g.events.push("pomme");
    g.food = freeCell(g);
    if (g.apples % 5 === 0 && !g.special) {
      const kind: Kind = g.level >= 3 && !g.escapeSeen ? "evasion" : SPECIALS[Math.floor(g.rng() * SPECIALS.length)];
      g.special = { p: freeCell(g), kind, ttl: 50 };
      g.events.push("special");
    }
  }
  if (g.special) {
    if (same(head, g.special.p)) { g.score += 50; apply(g, g.special.kind); g.special = null; }
    else if (--g.special.ttl <= 0) g.special = null;
  }
  return g;
}

// Retour de l'évasion : bonus selon les mots mangés, puis la partie reprend dans la borne.
export function endEscape(g: Game, wordsEaten: number, won: boolean) {
  g.escape = false;
  g.score += wordsEaten * 30 + (won ? 500 : 0);
}
