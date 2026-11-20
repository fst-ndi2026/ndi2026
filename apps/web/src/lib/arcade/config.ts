// Réglages du jeu caché : à adapter au sujet national le jour J (couleurs, symboles, phrase mystère).
export type Kind = "pomme" | "eclair" | "fantome" | "ciseaux" | "sablier" | "miroir" | "evasion";

export const POWERS: Record<Kind, { color: string; symbol: string; fr: string; ar: string; desc: string }> = {
  pomme:   { color: "#EF4444", symbol: "",  fr: "Pomme",   ar: "تفاحة",       desc: "+10, le serpent grandit" },
  eclair:  { color: "#3B82F6", symbol: "⚡", fr: "Éclair",  ar: "برق",         desc: "Vitesse ×2 et points ×2" },
  fantome: { color: "#A855F7", symbol: "👻", fr: "Fantôme", ar: "شبح",         desc: "Traverse les murs et sa queue" },
  ciseaux: { color: "#FACC15", symbol: "✂", fr: "Ciseaux", ar: "مقص",         desc: "Coupe 3 anneaux" },
  sablier: { color: "#22C55E", symbol: "⏳", fr: "Sablier", ar: "ساعة رملية",  desc: "Ralenti" },
  miroir:  { color: "#F472B6", symbol: "🌀", fr: "Miroir",  ar: "مرآة",        desc: "Commandes inversées (piège !)" },
  evasion: { color: "#F59E0B", symbol: "🚪", fr: "Évasion", ar: "هروب",        desc: "Le serpent sort dans le site" },
};

export const SNAKE_COLORS: Partial<Record<Kind, { head: string; body: string; alpha: number }>> = {
  eclair: { head: "#BFDBFE", body: "#3B82F6", alpha: 1 },
  fantome: { head: "#E9D5FF", body: "#A855F7", alpha: 0.45 },
  sablier: { head: "#BBF7D0", body: "#16A34A", alpha: 0.85 },
  miroir: { head: "#FFFFFF", body: "#F472B6", alpha: 1 },
};

// Phrase mystère reconstituée en mangeant les mots du site pendant l'évasion.
export const PHRASE = { fr: ["LA", "NUIT", "EST", "À", "NOUS", "!"], ar: ["الليلة", "لنا", "!"] };
