// Formulaire augmenté : missions et textes, à adapter au sujet national le jour J.
export type Mission = "contact" | "don" | "benevole" | "info";
export const MISSIONS: Record<Mission, { icon: string; fr: string; ar: string; dfr: string; dar: string; badge: { fr: string; ar: string } }> = {
  contact:  { icon: "📞", fr: "Établir le contact", ar: "التواصل معنا", dfr: "Une question, une idée, un partenariat", dar: "سؤال، فكرة، شراكة", badge: { fr: "Messager", ar: "المراسل" } },
  don:      { icon: "💰", fr: "Offrir un don", ar: "تقديم تبرّع", dfr: "Soutenir le projet, une fois ou chaque mois", dar: "ادعم المشروع مرة أو كل شهر", badge: { fr: "Mécène", ar: "الداعم" } },
  benevole: { icon: "🛡", fr: "Rejoindre les bénévoles", ar: "الانضمام إلى المتطوعين", dfr: "Donner un peu de temps et de talent", dar: "قدّم قليلاً من وقتك وموهبتك", badge: { fr: "Gardien", ar: "الحارس" } },
  info:     { icon: "❓", fr: "Demander des informations", ar: "طلب معلومات", dfr: "Recevoir la documentation", dar: "استلم الوثائق", badge: { fr: "Curieux", ar: "الفضولي" } },
};
export const AMOUNTS = [10, 25, 50];
export const SKILLS = ["Développement", "Design", "Communication", "Animation", "Traduction"];
export const TOPICS = ["Le projet", "Les ateliers", "Les partenariats", "La presse"];
// Exemple d'impact affiché pour un don : à remplacer par une donnée réelle du sujet national.
export const impact = (euros: number) => Math.round(euros / 5);
export const XP = { mission: 20, field: 10, submit: 50 };
