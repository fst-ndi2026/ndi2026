// Logique pure du village 3D (sans three.js) : testable et réutilisée par la page et la scène.
import { search } from "../../../../../shared/rafiq/search.js";

export type Phase = "day" | "dusk" | "night";
export type BuildingId = "securite" | "sobriete" | "accessibilite" | "rafiq" | "donnees";

// Nouakchott vit à l'heure UTC toute l'année.
export const EVENT_START = Date.UTC(2026, 11, 3, 15, 39);
export const EVENT_END = Date.UTC(2026, 11, 4, 7, 1);

/** Phase du ciel. Pendant la Nuit de l'Info, le soleil « se couche » à 15h39, au coup d'envoi. */
export function phaseAt(d: Date): Phase {
  const t = d.getTime();
  const m = d.getUTCHours() * 60 + d.getUTCMinutes();
  if (t >= EVENT_START && t < EVENT_END) {
    if (t < EVENT_START + 2 * 3600_000) return "dusk";
    return m >= 6 * 60 + 30 && m < 12 * 60 ? "dusk" : "night";
  }
  if (m >= 7 * 60 + 30 && m < 17 * 60 + 30) return "day";
  if (m >= 17 * 60 + 30 && m < 19 * 60) return "dusk";
  if (m >= 6 * 60 + 45 && m < 7 * 60 + 30) return "dusk";
  return "night";
}

/** Temps restant avant la fin de la nuit (ou avant son début), en minutes, ou null après. */
export function countdown(d: Date): { label: "avant" | "reste"; minutes: number } | null {
  const t = d.getTime();
  if (t < EVENT_START) return { label: "avant", minutes: Math.ceil((EVENT_START - t) / 60_000) };
  if (t < EVENT_END) return { label: "reste", minutes: Math.ceil((EVENT_END - t) / 60_000) };
  return null;
}

type Defi = { exigences: { fait: boolean }[] };
/** Un défi est « rendu » quand toutes ses exigences sont faites. */
export const defisRendus = (defis: Defi[]) => defis.filter((d) => d.exigences.length > 0 && d.exigences.every((e) => e.fait)).length;

/** Nombre de fenêtres allumées : la nuit, proportionnel aux défis rendus ; au coucher, la moitié. */
export function litWindows(total: number, rendus: number, max: number, phase: Phase): number {
  if (phase === "day" || max <= 0) return 0;
  const full = Math.round((Math.min(rendus, max) / max) * total);
  return phase === "night" ? full : Math.round(full / 2);
}

/** Ordre d'allumage étalé sur tout le village (pas un bâtiment après l'autre). */
export function isLit(i: number, total: number, lit: number): boolean {
  if (total <= 0) return false;
  return ((i * 7) % total) < lit;
}

export type Metrics = {
  secOk: number | null; secTotal: number; secGrade: string | null; secMissing: string[];
  eco: number | null; ecoGrade: string | null;
  sansReponse: number | null; fiches: number | null; demandes: number | null;
  rendus: number; defisTotal: number;
};

export const BUILDINGS: { id: BuildingId; fiche: string; route: string; fr: string; ar: string }[] = [
  { id: "securite", fiche: "securite", route: "/securite", fr: "Tour Sécurité", ar: "برج الأمان" },
  { id: "sobriete", fiche: "sobriete", route: "/sobriete", fr: "Maison Sobriété", ar: "مبنى الاقتصاد الرقمي" },
  { id: "accessibilite", fiche: "accessibilite", route: "/accessibilite", fr: "Maison Accessibilité", ar: "بيت سهولة الوصول" },
  { id: "rafiq", fiche: "rafiq", route: "/assistant", fr: "Antenne Rafiq", ar: "هوائي رفيق" },
  { id: "donnees", fiche: "donnees", route: "/agir", fr: "Silo des données", ar: "صومعة البيانات" },
];

export type BuildingState = { id: BuildingId; alert: boolean; level: number; fr: string; ar: string };

/** État de chaque bâtiment à partir des mesures réelles. level ∈ [0,1] pilote la hauteur ou le remplissage. */
export function buildingStates(m: Metrics, breach = false): BuildingState[] {
  const secOk = breach ? Math.max(0, (m.secOk ?? m.secTotal) - 1) : m.secOk;
  const missing = breach ? ["Politique de contenu (CSP)", ...m.secMissing] : m.secMissing;
  const secAlert = secOk !== null && secOk < m.secTotal;
  return [
    {
      id: "securite", alert: secAlert, level: secOk === null ? 1 : secOk / m.secTotal,
      fr: secOk === null ? "Mesure en cours…" : secAlert ? `${secOk}/${m.secTotal} protections · manque : ${missing[0] ?? "?"}` : `${secOk}/${m.secTotal} protections reçues${m.secGrade ? ` · ${m.secGrade}` : ""}`,
      ar: secOk === null ? "جارٍ القياس…" : secAlert ? `${secOk}/${m.secTotal} حمايات · تنقص حماية` : `${secOk}/${m.secTotal} حمايات موجودة`,
    },
    {
      id: "sobriete", alert: m.eco !== null && m.eco < 55, level: m.eco === null ? 0.7 : m.eco / 100,
      fr: m.eco === null ? "Mesure en cours…" : `EcoIndex ${m.eco} (${m.ecoGrade}) · hauteur = score`,
      ar: m.eco === null ? "جارٍ القياس…" : `مؤشر EcoIndex ‏${m.eco} (${m.ecoGrade}) · الارتفاع = النتيجة`,
    },
    {
      id: "accessibilite", alert: false, level: 1,
      fr: "0 erreur axe-core (tests à chaque intégration)", ar: "0 خطأ في اختبارات axe-core",
    },
    {
      id: "rafiq", alert: (m.sansReponse ?? 0) > 0, level: 1,
      fr: m.sansReponse === null ? "Hors ligne" : `${m.fiches ?? "?"} fiches · ${m.sansReponse} question(s) sans réponse`,
      ar: m.sansReponse === null ? "غير متصل" : `${m.fiches ?? "?"} بطاقة · ${m.sansReponse} سؤال بلا جواب`,
    },
    {
      id: "donnees", alert: false, level: m.demandes === null ? 0 : Math.min(1, m.demandes / 50),
      fr: m.demandes === null ? "Hors ligne" : `${m.demandes} mission(s) reçue(s) cette année`,
      ar: m.demandes === null ? "غير متصل" : `${m.demandes} مهمة هذه السنة`,
    },
  ];
}

const FICHE_TO_BUILDING: Record<string, BuildingId> = {
  securite: "securite", faille: "securite", "mot-de-passe": "securite",
  sobriete: "sobriete", accessibilite: "accessibilite",
  rafiq: "rafiq", langues: "rafiq",
  donnees: "donnees", inscription: "donnees",
};
const KEYWORDS: [RegExp, BuildingId][] = [
  [/s[ée]cu|prot[eé]g|pirat|faille|أمان|حماي|اختراق/i, "securite"],
  [/[ée]colo|sobri|poids|carbone|بيئ|اقتصاد|طاقة/i, "sobriete"],
  [/access|handicap|aveugle|clavier|إعاق|وصول/i, "accessibilite"],
  [/rafiq|chatbot|robot|ia\b|رفيق|ذكاء/i, "rafiq"],
  [/donn[ée]e|mission|formulaire|don\b|بيانات|مهم|استمار/i, "donnees"],
];

/** Rafiq choisit une destination PRÉVUE (jamais du code) : l'IA ne fait que choisir dans cette liste. */
export function intentFor(question: string): BuildingId | null {
  const hit = search(question)[0]?.doc.id;
  if (hit && FICHE_TO_BUILDING[hit]) return FICHE_TO_BUILDING[hit];
  for (const [re, id] of KEYWORDS) if (re.test(question)) return id;
  return null;
}
