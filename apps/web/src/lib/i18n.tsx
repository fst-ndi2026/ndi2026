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
    a11y: "Accessibilité", sobriete: "Sobriété", securite: "Sécurité", agir: "Agir", village: "Village 3D", son: "Son visible", textBigger: "Agrandir le texte", textSmaller: "Réduire le texte", contrast: "Contraste élevé", a11yTools: "Outils d'accessibilité", pageLoaded: "Page chargée :",
    signup: "Inscription", signupIntro: "Créez votre compte pour rejoindre l'équipe FST.",
    fullName: "Nom complet", email: "Adresse e-mail", github: "Identifiant GitHub (facultatif)",
    filiere: "Filière", password: "Mot de passe", passwordHint: "8 caractères minimum ; une phrase de plusieurs mots est le plus sûr.",
    confirmPassword: "Confirmer le mot de passe", acceptTerms: "J'accepte la charte de l'équipe et le traitement de mes données.",
    signupSubmit: "Créer mon compte", signupOk: "Inscription réussie ! Bienvenue dans l'équipe.",
    errFullName: "Indiquez votre nom (2 caractères minimum).", errEmail: "Adresse e-mail invalide.",
    errGithub: "Identifiant GitHub invalide.", errPassword: "Mot de passe trop faible : allongez-le ou utilisez plusieurs mots sans lien entre eux.", errPwned: "Ce mot de passe figure dans des fuites connues : choisissez-en un autre.",
    errConfirm: "Les mots de passe ne correspondent pas.", errTerms: "Vous devez accepter la charte.",
    errEmailTaken: "Cette adresse e-mail est déjà inscrite.", errSummary: "Le formulaire contient des erreurs :",
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
    a11y: "سهولة الوصول", sobriete: "الاقتصاد الرقمي", securite: "الأمان", agir: "شارك", village: "القرية 3D", son: "صوت مرئي", textBigger: "تكبير النص", textSmaller: "تصغير النص", contrast: "تباين عالٍ", a11yTools: "أدوات سهولة الوصول", pageLoaded: "تم تحميل الصفحة:",
    signup: "التسجيل", signupIntro: "أنشئ حسابك للانضمام إلى فريق FST.",
    fullName: "الاسم الكامل", email: "البريد الإلكتروني", github: "معرّف GitHub (اختياري)",
    filiere: "التخصص", password: "كلمة المرور", passwordHint: "8 أحرف على الأقل؛ العبارة المكوّنة من عدة كلمات هي الأكثر أماناً.",
    confirmPassword: "تأكيد كلمة المرور", acceptTerms: "أوافق على ميثاق الفريق ومعالجة بياناتي.",
    signupSubmit: "إنشاء حسابي", signupOk: "تم التسجيل بنجاح! مرحباً بك في الفريق.",
    errFullName: "أدخل اسمك (حرفان على الأقل).", errEmail: "بريد إلكتروني غير صالح.",
    errGithub: "معرّف GitHub غير صالح.", errPassword: "كلمة المرور ضعيفة: أطِلها أو استعمل عدة كلمات لا رابط بينها.", errPwned: "كلمة المرور هذه موجودة في تسريبات معروفة: اختر غيرها.",
    errConfirm: "كلمتا المرور غير متطابقتين.", errTerms: "يجب الموافقة على الميثاق.",
    errEmailTaken: "هذا البريد الإلكتروني مسجّل مسبقاً.", errSummary: "يحتوي النموذج على أخطاء:",
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
