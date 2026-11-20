import { useEffect, useState } from "react";
const CODE = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];

export function useKonami() {
  const [found, setFound] = useState(false);
  useEffect(() => {
    let i = 0;
    const onKey = (e: KeyboardEvent) => {
      i = e.key === CODE[i] ? i + 1 : e.key === CODE[0] ? 1 : 0;
      if (i === CODE.length) { setFound(true); i = 0; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return [found, () => setFound(false)] as const;
}
