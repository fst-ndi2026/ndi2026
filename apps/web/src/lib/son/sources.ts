// Les trois sources de son, toutes branchées sur le même AnalyserNode.
// Rien n'est enregistré ni envoyé : le son reste dans le navigateur.

export type Source = "micro" | "fichier" | "generateur";

export type AudioEngine = {
  analyser: AnalyserNode;
  sampleRate: number;
  read(out: Uint8Array<ArrayBuffer>): void;
  useMic(): Promise<void>;
  useFile(file: File): Promise<void>;
  useSynth(hz: number): void;
  stop(): void;
  close(): void;
};

export function createEngine(): AudioEngine {
  const ctx = new AudioContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.6;
  const out = ctx.createGain(); // vers les haut-parleurs (pas pour le micro : pas d'écho)
  out.gain.value = 0.5;
  out.connect(ctx.destination);

  let stopCur: (() => void) | null = null;
  let osc: OscillatorNode | null = null;

  const stop = () => { stopCur?.(); stopCur = null; osc = null; };

  return {
    analyser,
    sampleRate: ctx.sampleRate,
    read(buf) { analyser.getByteFrequencyData(buf); },

    async useMic() {
      stop();
      await ctx.resume();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
      const src = ctx.createMediaStreamSource(stream);
      src.connect(analyser);
      stopCur = () => { src.disconnect(); stream.getTracks().forEach((t) => t.stop()); };
    },

    async useFile(file) {
      stop();
      await ctx.resume();
      const buf = await ctx.decodeAudioData(await file.arrayBuffer());
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      src.connect(analyser); src.connect(out);
      src.start();
      stopCur = () => { try { src.stop(); } catch { /* déjà arrêté */ } src.disconnect(); };
    },

    useSynth(hz) {
      void ctx.resume();
      if (osc) { osc.frequency.setTargetAtTime(hz, ctx.currentTime, 0.05); return; }
      stop();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = hz;
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.08); // pas de « clic » au départ
      o.connect(g); g.connect(analyser); g.connect(out);
      o.start();
      osc = o;
      stopCur = () => {
        g.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
        setTimeout(() => { try { o.stop(); } catch { /* déjà arrêté */ } g.disconnect(); }, 150);
      };
    },

    stop,
    close() { stop(); void ctx.close(); },
  };
}
