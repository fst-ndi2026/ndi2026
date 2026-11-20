import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Lang = "fr" | "ar";
const dict = {
  fr: {
    skip: "Aller au contenu", home: "Accueil", demo: "Démo", assistant: "Assistant", defis: "Défis",
    credits: "Crédits", lang: "العربية", title: "Équipe FST - Nuit de l'Info 2026",
    intro: "Template prêt à adapter au sujet national.",
    loading: "Chargement…", empty: "Aucun élément pour l'instant. Ajoutez-en un ci-dessous.",
    loadError: "Impossible de charger les données. Réessayez.", retry: "Réessayer",
    add: "Ajouter", titleField: "Titre", bodyField: "Description", required: "Le titre est obligatoire.",
    added: "Élément ajouté.", ask: "Poser la question", question: "Votre question",
    aiLabel: "Réponse générée par IA - à vérifier.", fallbackLabel: "Réponse de secours (IA indisponible).",
    weight: "Poids de la page", konami: "Bravo, vous avez trouvé l'easter egg !",
    a11y: "Accessibilité", textBigger: "Agrandir le texte", textSmaller: "Réduire le texte", contrast: "Contraste élevé", a11yTools: "Outils d'accessibilité", pageLoaded: "Page chargée :",
  },
  ar: {
    skip: "انتقل إلى المحتوى", home: "الرئيسية", demo: "تجربة", assistant: "المساعد", defis: "التحديات",
    credits: "المصادر", lang: "Français", title: "فريق FST - ليلة المعلوميات 2026",
    intro: "قالب جاهز للتكييف مع الموضوع الوطني.",
    loading: "جارٍ التحميل…", empty: "لا توجد عناصر بعد. أضف عنصراً أدناه.",
    loadError: "تعذّر تحميل البيانات. حاول مجدداً.", retry: "إعادة المحاولة",
    add: "إضافة", titleField: "العنوان", bodyField: "الوصف", required: "العنوان إجباري.",
    added: "تمت الإضافة.", ask: "اطرح السؤال", question: "سؤالك",
    aiLabel: "إجابة مولّدة بالذكاء الاصطناعي - تحقّق منها.", fallbackLabel: "إجابة احتياطية (الذكاء الاصطناعي غير متاح).",
    weight: "وزن الصفحة", konami: "أحسنت، وجدت المفاجأة المخفية!",
    a11y: "سهولة الوصول", textBigger: "تكبير النص", textSmaller: "تصغير النص", contrast: "تباين عالٍ", a11yTools: "أدوات سهولة الوصول", pageLoaded: "تم تحميل الصفحة:",
  },
} as const;

export type Key = keyof typeof dict.fr;
const Ctx = createContext<{ lang: Lang; t: (k: Key) => string; toggle: () => void }>({
  lang: "fr", t: (k) => dict.fr[k], toggle: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("fr");
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  return (
    <Ctx.Provider value={{ lang, t: (k) => dict[lang][k], toggle: () => setLang((l) => (l === "fr" ? "ar" : "fr")) }}>
      {children}
    </Ctx.Provider>
  );
}
export const useI18n = () => useContext(Ctx);
