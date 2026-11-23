// Figures de Chladni : une plaque vibre, le sable fuit les zones qui bougent
// et s'accumule sur les lignes immobiles (les « lignes nodales »).

// Amplitude de vibration de la plaque carrée en (x, y) ∈ [0,1]², mode (n, m).
export function field(x: number, y: number, n: number, m: number): number {
  const p = Math.PI;
  return Math.cos(n * p * x) * Math.cos(m * p * y) + Math.cos(m * p * x) * Math.cos(n * p * y);
}

export type Rand = () => number;

export class Sand {
  readonly x: Float32Array;
  readonly y: Float32Array;
  constructor(readonly count: number, rand: Rand = Math.random) {
    this.x = new Float32Array(count);
    this.y = new Float32Array(count);
    this.scatter(rand);
  }

  scatter(rand: Rand = Math.random) {
    for (let i = 0; i < this.count; i++) { this.x[i] = rand(); this.y[i] = rand(); }
  }

  // Un pas de simulation : chaque grain saute d'autant plus loin que la plaque bouge sous lui.
  // energy = force du son (0 = silence : le sable ne bouge plus).
  step(n: number, m: number, energy: number, rand: Rand = Math.random) {
    if (energy <= 0.01) return;
    // saut proportionnel à la taille des « cases » de la figure : les figures larges se forment aussi vite que les fines
    const jump = (0.11 / Math.max(n, m)) * Math.min(1, energy * 1.6);
    for (let i = 0; i < this.count; i++) {
      const a = Math.abs(field(this.x[i], this.y[i], n, m)) / 2; // 0 sur une ligne nodale, 1 au ventre
      const r = jump * (a + 0.01);
      this.x[i] = clamp(this.x[i] + (rand() * 2 - 1) * r);
      this.y[i] = clamp(this.y[i] + (rand() * 2 - 1) * r);
    }
  }

  // Part du sable posée sur les lignes du mode (n, m) : sert au jeu « Reproduis la figure ».
  match(n: number, m: number, tol = 0.12): number {
    let ok = 0;
    for (let i = 0; i < this.count; i++) if (Math.abs(field(this.x[i], this.y[i], n, m)) < tol) ok++;
    return ok / this.count;
  }
}

const clamp = (v: number) => (v < 0 ? -v : v > 1 ? 2 - v : v); // rebond sur le bord de la plaque

// Générateur pseudo-aléatoire reproductible (tests, figure-cible du jeu).
export function seeded(seed: number): Rand {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
