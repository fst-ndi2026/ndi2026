/** WebGL disponible ? (faux dans jsdom et sur certains vieux appareils) — sans charger three.js. */
export function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch { return false; }
}
