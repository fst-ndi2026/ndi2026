export type Lang = "fr" | "ar";
export type Fiche = { id: string; url: string; titre: Record<Lang, string>; texte: Record<Lang, string>; mots: string };
export type PersonaId = "serieux" | "prof" | "bruti";
