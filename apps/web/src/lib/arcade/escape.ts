// Évasion : repère les mots du site à l'écran, sans modifier la page (on les masque par-dessus).
export type Box = { x: number; y: number; w: number; h: number };
export type WordBox = Box & { text: string };

export function collectWords(root: Element, minLen = 4, max = 80): WordBox[] {
  const out: WordBox[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest("[data-arcade], script, style, [aria-hidden='true']") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const vw = innerWidth, vh = innerHeight;
  for (let n = walker.nextNode(); n && out.length < max; n = walker.nextNode()) {
    const text = n.textContent ?? "";
    for (const m of text.matchAll(/[\p{L}\p{N}'’-]+/gu)) {
      if (m[0].length < minLen) continue;
      const r = document.createRange();
      if (typeof r.getBoundingClientRect !== "function") return out;
      r.setStart(n, m.index!); r.setEnd(n, m.index! + m[0].length);
      const b = r.getBoundingClientRect();
      if (b.width > 0 && b.height > 0 && b.top >= 0 && b.left >= 0 && b.bottom <= vh && b.right <= vw) {
        out.push({ text: m[0], x: b.left, y: b.top, w: b.width, h: b.height });
      }
      if (out.length >= max) break;
    }
  }
  return out;
}

export const hits = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
