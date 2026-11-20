import { useEffect, useState } from "react";
import { DISTRICTS, ALL_QUESTS } from "../data/village";

// Progression du village, gardée dans le navigateur (aucun compte nécessaire).
type Progress = { done: string[]; points: number; village: string };
const KEY = "village-progress";
const EMPTY: Progress = { done: [], points: 0, village: "" };

function load(): Progress {
  try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { return EMPTY; }
}
const listeners = new Set<(p: Progress) => void>();
let current: Progress = load();

function save(p: Progress) {
  current = p;
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* stockage indisponible */ }
  listeners.forEach((l) => l(p));
}

export function useProgress() {
  const [p, setP] = useState(current);
  useEffect(() => { listeners.add(setP); return () => { listeners.delete(setP); }; }, []);
  const status = (id: string): "done" | "todo" | "locked" => {
    if (p.done.includes(id)) return "done";
    const q = ALL_QUESTS.find((x) => x.id === id);
    return q?.requires && !p.done.includes(q.requires) ? "locked" : "todo";
  };
  const pillar = (districtId: string) => {
    const d = DISTRICTS.find((x) => x.id === districtId)!;
    return Math.round((d.quests.filter((q) => p.done.includes(q.id)).length / d.quests.length) * 100);
  };
  const total = Math.round((p.done.length / ALL_QUESTS.length) * 100);
  const milestone = total >= 67 ? 3 : total >= 34 ? 2 : 1;
  return {
    ...p, status, pillar, total, milestone,
    complete: (id: string, pts: number) => {
      if (p.done.includes(id)) return;
      save({ ...p, done: [...p.done, id], points: p.points + pts });
    },
    setVillage: (village: string) => save({ ...p, village }),
    reset: () => save(EMPTY),
  };
}
