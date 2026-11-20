// Remplissage intelligent : Gemini Nano (sortie JSON contrainte) s'il est déjà présent, sinon extracteur local.
import { extract, type Extracted } from "./extract";

type LM = { availability: () => Promise<string>; create: (o?: unknown) => Promise<{ prompt: (t: string, o?: unknown) => Promise<string>; destroy: () => void }> };
const lm = () => (globalThis as unknown as { LanguageModel?: LM }).LanguageModel;

const SCHEMA = {
  type: "object",
  properties: {
    mission: { enum: ["contact", "don", "benevole", "info"] },
    name: { type: "string" }, email: { type: "string" }, phone: { type: "string" },
    amount: { type: "number" }, frequency: { enum: ["once", "monthly"] }, message: { type: "string" },
  },
};

export async function smartFill(text: string): Promise<{ data: Extracted; brain: "nano" | "local" }> {
  const local = extract(text);
  const L = lm();
  try {
    if (L && (await L.availability()) === "available") {
      const s = await L.create();
      try {
        const raw = await s.prompt(
          "Extrais les informations de ce message pour remplir un formulaire. Ne devine rien qui n'est pas écrit. Message : " + text,
          { responseConstraint: SCHEMA },
        );
        const ai = JSON.parse(raw) as Extracted;
        // Les valeurs trouvées localement (e-mail, montant…) priment : elles sont exactes par construction.
        return { data: { ...ai, ...Object.fromEntries(Object.entries(local).filter(([, v]) => v !== undefined)) }, brain: "nano" };
      } finally { s.destroy(); }
    }
  } catch { /* repli local */ }
  return { data: local, brain: "local" };
}

// Dictée vocale (Chrome, Edge, Safari) ; traitement sur l'appareil quand le navigateur le permet.
type SR = { lang: string; interimResults: boolean; processLocally?: boolean; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
export function speechSupported() {
  const w = globalThis as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
export function dictate(lang: "fr" | "ar", onText: (t: string) => void, onEnd: () => void): (() => void) | null {
  const Ctor = speechSupported();
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = lang === "ar" ? "ar-MR" : "fr-FR";
  r.interimResults = false;
  if ("processLocally" in r) r.processLocally = true;
  r.onresult = (e) => onText(Array.from(e.results).map((x) => x[0].transcript).join(" "));
  r.onerror = onEnd; r.onend = onEnd;
  r.start();
  return () => r.stop();
}
