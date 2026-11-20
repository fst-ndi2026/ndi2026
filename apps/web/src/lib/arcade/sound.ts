// Sons 8-bit générés (aucun fichier audio) et guidage sonore stéréo pour jouer les yeux fermés.
export type Sound = {
  ok: boolean;
  blip: (freq: number, ms?: number, pan?: number, vol?: number, type?: OscillatorType) => void;
  eat: () => void; power: () => void; die: () => void; win: () => void;
  guide: (dx: number, dy: number, maxDist: number) => void;
  close: () => void;
};

export function createSound(): Sound {
  const AC = (globalThis as unknown as { AudioContext?: typeof AudioContext }).AudioContext;
  if (!AC) return { ok: false, blip() {}, eat() {}, power() {}, die() {}, win() {}, guide() {}, close() {} };
  const ctx = new AC();
  const blip: Sound["blip"] = (freq, ms = 90, pan = 0, vol = 0.15, type = "square") => {
    const o = ctx.createOscillator(), g = ctx.createGain(), p = ctx.createStereoPanner();
    o.type = type; o.frequency.value = freq; p.pan.value = Math.max(-1, Math.min(1, pan));
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
    o.connect(g).connect(p).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + ms / 1000);
  };
  return {
    ok: true, blip,
    eat: () => { blip(660, 70); setTimeout(() => blip(990, 70), 70); },
    power: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 80), i * 70)),
    die: () => [392, 330, 262, 196].forEach((f, i) => setTimeout(() => blip(f, 140, 0, 0.18, "sawtooth"), i * 130)),
    win: () => [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => blip(f, 120), i * 90)),
    // Gauche/droite = côté de la pomme ; aigu = au-dessus, grave = en dessous ; plus fort = plus proche.
    guide: (dx, dy, maxDist) => {
      const dist = Math.abs(dx) + Math.abs(dy);
      const vol = 0.04 + 0.16 * (1 - Math.min(dist, maxDist) / maxDist);
      blip(dy < 0 ? 880 : dy > 0 ? 330 : 550, 60, dx / 8, vol, "triangle");
    },
    close: () => { ctx.close().catch(() => {}); },
  };
}

// Description de la position de la pomme pour les lecteurs d'écran (touche H).
export function describe(dx: number, dy: number, lang: "fr" | "ar"): string {
  const h = dx === 0 ? "" : lang === "ar" ? `${Math.abs(dx)} ${dx < 0 ? "يساراً" : "يميناً"}` : `${Math.abs(dx)} à ${dx < 0 ? "gauche" : "droite"}`;
  const v = dy === 0 ? "" : lang === "ar" ? `${Math.abs(dy)} ${dy < 0 ? "أعلى" : "أسفل"}` : `${Math.abs(dy)} ${dy < 0 ? "en haut" : "en bas"}`;
  const parts = [h, v].filter(Boolean).join(lang === "ar" ? " و" : ", ");
  return lang === "ar" ? `التفاحة: ${parts || "أمامك"}` : `Pomme : ${parts || "droit devant"}`;
}
