// « Dis-le en une phrase » : extraction locale (sans réseau) de la mission et des champs, en français et en arabe.
import type { Mission } from "./config";

export type Extracted = {
  mission?: Mission; name?: string; email?: string; phone?: string;
  amount?: number; frequency?: "once" | "monthly"; message?: string;
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const westernDigits = (s: string) => s.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));

const MISSION_WORDS: [Mission, RegExp][] = [
  ["don", /\b(don|donner|donne|dons|soutenir|contribu\w*|euros?|€)|تبرع|اتبرع|أتبرع|ادعم|أدعم|دعم/],
  ["benevole", /\b(benevol\w*|volontaire|aider|participer|rejoindre)|تطوع|متطوع|اتطوع|أتطوع|انضم/],
  ["info", /\b(info\w*|documentation|brochure|renseign\w*|savoir plus)|معلومات|استفسار|وثائق/],
  ["contact", /\b(contact\w*|question|parler|appel\w*|ecrire|message|partenariat)|تواصل|اتصال|سؤال|شراكة/],
];

export function extract(text: string): Extracted {
  const t = westernDigits(text);
  const n = norm(t);
  const out: Extracted = {};
  for (const [m, re] of MISSION_WORDS) if (re.test(n)) { out.mission = m; break; }

  const email = t.match(/[^\s@,;:<>()]+@[^\s@,;:<>()]+\.[a-z]{2,}/i);
  if (email) out.email = email[0].replace(/[.)]+$/, "");

  const phone = t.replace(email?.[0] ?? "", "").match(/(\+?\d[\d\s.-]{6,}\d)/);
  if (phone) out.phone = phone[1].replace(/[\s.-]/g, "");

  const amount = t.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:€|euros?|eur\b|يورو|أوقية|اوقية|mru)/i) ?? t.match(/(?:€|eur)\s*(\d+(?:[.,]\d{1,2})?)/i);
  if (amount) { out.amount = Number(amount[1].replace(",", ".")); out.mission ??= "don"; }

  if (/(chaque|par|tous les)\s+mois|mensuel|mensuellement|كل شهر|شهريا|شهري/.test(n)) out.frequency = "monthly";
  else if (out.amount) out.frequency = "once";

  const name = t.match(/(?:[Jj]e m['’]appelle|[Mm]on nom est|[Mm]oi c['’]est|[Jj]e suis)\s+([\p{Lu}][\p{L}'’-]+(?:\s+[\p{Lu}][\p{L}'’-]+){0,2})/u)
    ?? t.match(/(?:اسمي|أنا)\s+([ء-ي]+(?:\s+[ء-ي]+)?)/);
  if (name) out.name = name[1].trim();

  return out;
}

export const filledKeys = (e: Extracted) => (Object.keys(e) as (keyof Extracted)[]).filter((k) => e[k] !== undefined && k !== "mission");
