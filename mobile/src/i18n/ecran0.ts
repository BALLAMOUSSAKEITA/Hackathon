import type { Localized } from "../types";

/** Libellés de l'écran 0 et de la navigation, en français, arabe et darija. */
export const ECRAN0 = {
  welcome: {
    fr: "Bienvenue",
    ar: "مرحبا",
    darija: "Marhba",
  },
  chooseLanguage: { fr: "Langue", ar: "اللغة", darija: "Lou3a" },
  langFr: { fr: "Français", ar: "الفرنسية", darija: "Fransawi" },
  langAr: { fr: "Arabe", ar: "العربية", darija: "3arbi" },
  langDarija: { fr: "Darija", ar: "الدارجة", darija: "Derja" },
  chooseProfile: { fr: "Profil", ar: "الملف", darija: "Profil" },
  enter: { fr: "Entrer", ar: "دخول", darija: "Odkhol" },
  smsSimulated: {
    fr: "Code SMS de démo, fixe :",
    ar: "رمز SMS تجريبي وثابت :",
    darija: "Code SMS demo, thebet :",
  },
  phoneLabel: { fr: "Téléphone", ar: "الهاتف", darija: "Telephone" },
  accountReady: {
    fr: "Le compte de démo est créé.",
    ar: "حساب العرض جاهز.",
    darija: "El compte demo t-sna3.",
  },
  errorRole: {
    fr: "Ce rôle n'est pas accepté.",
    ar: "هذا الدور غير مقبول.",
    darija: "Had el role ma yemchich.",
  },
  errorCode: {
    fr: "Le code n'est pas le bon.",
    ar: "الرمز غير صحيح.",
    darija: "El code ghalet.",
  },
  errorNetwork: {
    fr: "L'API ne répond pas. Le compte reste celui du fichier.",
    ar: "الواجهة لا تجيب. الحساب يبقى حساب الملف.",
    darija: "El API ma tjawbech. El compte yeb9a mta3 el fichier.",
  },
  farmer: { fr: "Agriculteur", ar: "فلاح", darija: "Fellah" },
  buyer: { fr: "Acheteur", ar: "مشتري", darija: "Chari" },
  farmerPath: { fr: "Parcours agriculteur", ar: "مسار الفلاح", darija: "Masar el fellah" },
  buyerPath: { fr: "Parcours acheteur", ar: "مسار المشتري", darija: "Masar el chari" },
  back: { fr: "Retour", ar: "رجوع", darija: "Rja3" },
  screen1: { fr: "Accueil agriculteur", ar: "رئيسية الفلاح", darija: "Accueil el fellah" },
  screen2: { fr: "Ma parcelle", ar: "قطعتي", darija: "Qit3ti" },
  screen3: { fr: "Analyse de la terre", ar: "تحليل التربة", darija: "Tahlil et-torba" },
  screen4: { fr: "Que planter ?", ar: "شنو نزرعو؟", darija: "Chnou nezra3ou?" },
  screen5: { fr: "Simulateur", ar: "المحاكي", darija: "El simulateur" },
  screen6: { fr: "Assistant vocal", ar: "المساعد الصوتي", darija: "El assistant b sout" },
  screen7: { fr: "Label de la ferme", ar: "علامة الضيعة", darija: "Label el ferma" },
  screen8: { fr: "Énergie et pompage solaire", ar: "الطاقة والضخ الشمسي", darija: "Energie w pompage solaire" },
  screen9: { fr: "Suivi satellite et alertes", ar: "المتابعة والتنبيهات", darija: "Suivi satellite" },
  screen10: { fr: "Mes ventes", ar: "مبيعاتي", darija: "Bi3ati" },
  screen11: { fr: "Notifications", ar: "الإشعارات", darija: "Les notifications" },
} satisfies Record<string, Localized>;
