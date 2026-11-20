// Mode 8-bit : habille tout le site en rétro (classe html.retro), mémorisé.
const KEY = "mode-8bit";
export const isRetro = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };
export function setRetro(on: boolean) {
  document.documentElement.classList.toggle("retro", on);
  try { localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* stockage indisponible */ }
}
export const initRetro = () => { if (isRetro()) document.documentElement.classList.add("retro"); };
