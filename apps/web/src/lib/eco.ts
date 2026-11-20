// Estimation d'empreinte d'une page, inspirée de la méthode publique EcoIndex
// (éléments du DOM ×3, requêtes ×2, poids ×1). Ce n'est pas le calcul officiel :
// la mesure de référence se fait sur https://www.ecoindex.fr/.
export type EcoMetrics = { dom: number; requests: number; kb: number };
export type EcoResult = EcoMetrics & { score: number; grade: string; co2: number; water: number };

// Bornes « page très sobre » → « page très lourde » (échelle logarithmique).
const RANGES = { dom: [50, 2500], requests: [2, 280], kb: [2, 5000] } as const;

function part(value: number, [good, bad]: readonly [number, number]) {
  if (value <= good) return 0;
  const r = Math.log(value / good) / Math.log(bad / good);
  return 20 * Math.min(1, r);
}

export const GRADES = [
  { grade: "A", min: 80, bg: "#349A47", fg: "#FFFFFF" },
  { grade: "B", min: 70, bg: "#51B84B", fg: "#0B2A09" },
  { grade: "C", min: 55, bg: "#CADB2A", fg: "#2B2E05" },
  { grade: "D", min: 40, bg: "#F6EB15", fg: "#3A3600" },
  { grade: "E", min: 25, bg: "#FECD06", fg: "#3D2F00" },
  { grade: "F", min: 10, bg: "#F99839", fg: "#3D1E00" },
  { grade: "G", min: -1, bg: "#ED2124", fg: "#FFFFFF" },
];

export function estimate(m: EcoMetrics): EcoResult {
  const q = 3 * part(m.dom, RANGES.dom) + 2 * part(m.requests, RANGES.requests) + part(m.kb, RANGES.kb);
  const score = Math.round(100 - (5 * q) / 6);
  const grade = GRADES.find((g) => score > g.min)!.grade;
  // Ordres de grandeur par visite, à partir de la note (méthode publique EcoIndex).
  const co2 = Math.round((2 + (2 * (50 - score)) / 100) * 100) / 100;
  const water = Math.round((3 + (3 * (50 - score)) / 100) * 100) / 100;
  return { ...m, score, grade, co2, water };
}

export function measure(): EcoMetrics {
  const all = document.getElementsByTagName("*");
  let dom = 0;
  for (const el of Array.from(all)) if (!el.closest("svg") || el.tagName.toLowerCase() === "svg") dom++;
  const entries = [
    ...performance.getEntriesByType("navigation"),
    ...performance.getEntriesByType("resource"),
  ] as PerformanceResourceTiming[];
  const bytes = entries.reduce((s, e) => s + (e.transferSize || e.encodedBodySize || 0), 0);
  return { dom, requests: Math.max(1, entries.length), kb: Math.round(bytes / 1024) };
}

export const gradeStyle = (grade: string) => GRADES.find((g) => g.grade === grade) ?? GRADES[6];
