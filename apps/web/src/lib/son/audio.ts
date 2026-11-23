// Analyse du son : bandes (graves / médiums / aigus) et note dominante.
// Fonctions pures : elles lisent le tableau de fréquences d'un AnalyserNode.

export type Bands = { bass: number; mid: number; treble: number; level: number };
export type Mode = { id: string; hz: number; n: number; m: number; fr: string; ar: string };

// Une note = une figure de Chladni (n × m). Plus la note est aiguë, plus la figure est fine.
export const MODES: Mode[] = [
  { id: "grave", hz: 130, n: 1, m: 4, fr: "Voix grave", ar: "صوت منخفض" },
  { id: "sol", hz: 196, n: 2, m: 5, fr: "Sol", ar: "صول" },
  { id: "do", hz: 262, n: 3, m: 7, fr: "Do", ar: "دو" },
  { id: "siffle", hz: 1200, n: 5, m: 9, fr: "Sifflement", ar: "صفير" },
];

const binHz = (sampleRate: number, fftSize: number) => sampleRate / fftSize;

function avg(freq: ArrayLike<number>, from: number, to: number, hz: number): number {
  const a = Math.max(1, Math.floor(from / hz)), b = Math.min(freq.length - 1, Math.ceil(to / hz));
  if (b < a) return 0;
  let s = 0;
  for (let i = a; i <= b; i++) s += freq[i];
  return s / (b - a + 1) / 255;
}

export function bands(freq: ArrayLike<number>, sampleRate: number, fftSize: number): Bands {
  const hz = binHz(sampleRate, fftSize);
  const bass = avg(freq, 20, 250, hz), mid = avg(freq, 250, 2000, hz), treble = avg(freq, 2000, 8000, hz);
  return { bass, mid, treble, level: Math.max(bass, mid, treble) };
}

// Pic le plus fort entre 80 Hz et 4 kHz (fréquence + force 0..1), ou null si c'est presque le silence.
// Une note pure n'occupe qu'une ou deux cases : sa force se lit sur le pic, pas sur la moyenne d'une bande.
export function loudest(freq: ArrayLike<number>, sampleRate: number, fftSize: number, floor = 60): { hz: number; amp: number } | null {
  const hz = binHz(sampleRate, fftSize);
  let best = -1, val = floor;
  for (let i = Math.floor(80 / hz); i <= Math.min(freq.length - 1, Math.ceil(4000 / hz)); i++) {
    if (freq[i] > val) { val = freq[i]; best = i; }
  }
  return best < 0 ? null : { hz: best * hz, amp: val / 255 };
}

export const dominant = (freq: ArrayLike<number>, sampleRate: number, fftSize: number, floor = 60): number | null =>
  loudest(freq, sampleRate, fftSize, floor)?.hz ?? null;

// Note la plus proche « à l'oreille » (distance en octaves, pas en hertz).
export function modeFor(hz: number | null): Mode | null {
  if (hz === null || hz <= 0) return null;
  let best = MODES[0], d = Infinity;
  for (const m of MODES) {
    const k = Math.abs(Math.log2(hz / m.hz));
    if (k < d) { d = k; best = m; }
  }
  return best;
}

// Lissage : évite que tout tremble d'une image à l'autre.
export const smooth = (prev: Bands, next: Bands, a = 0.25): Bands => ({
  bass: prev.bass + (next.bass - prev.bass) * a,
  mid: prev.mid + (next.mid - prev.mid) * a,
  treble: prev.treble + (next.treble - prev.treble) * a,
  level: prev.level + (next.level - prev.level) * a,
});

export const SILENCE: Bands = { bass: 0, mid: 0, treble: 0, level: 0 };
