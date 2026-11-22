import type { Localized } from "../types";

/** Libellés ajoutés pour coller aux maquettes (groupe B). Préfixe « b » pour éviter les doublons. */
export const MAQUETTE_B = {
  // Que planter
  bSortLessWater: { fr: "Moins d'eau", ar: "ماء أقل", darija: "Ma a9al" },
  bSortFast: { fr: "Production rapide", ar: "إنتاج سريع", darija: "Intaj sri3" },
  bCropPerennial: { fr: "Culture pérenne", ar: "زراعة دائمة", darija: "Culture dayma" },
  bCropSeasonal: { fr: "Culture de saison", ar: "زراعة موسمية", darija: "Culture mta3 mousem" },
  bOpenFiche: { fr: "Voir la fiche de la culture", ar: "شوف بطاقة الزراعة", darija: "Chouf fiche el culture" },
  bTapForDetail: { fr: "Touche pour voir le détail", ar: "المس لرؤية التفاصيل", darija: "Dos bach tchouf el tafasil" },
  bExcludedTitle: {
    fr: "Ta culture actuelle n'est pas conseillée",
    ar: "زراعتك الحالية غير منصوح بها",
    darija: "Culturtek tawa mich mansou7 biha",
  },

  // Simulateur
  bComparedShort: {
    fr: "Comparé à aujourd'hui : {ha} ha de {culture}.",
    ar: "مقارنة باليوم : {ha} هك {culture}.",
    darija: "M9arna b tawa : {ha} ha {culture}.",
  },
  bSeeMyLabel: { fr: "Voir mon label", ar: "شوف علامتي", darija: "Chouf label mte3i" },

  // Assistant
  bTranslate: { fr: "Traduire", ar: "ترجم", darija: "Traduire" },
  bShowOriginal: { fr: "Darija", ar: "بالدارجة", darija: "Derja" },
  bTranslatedFr: { fr: "Traduit en français", ar: "مترجم إلى الفرنسية", darija: "Mtarjem b fransawi" },
  bWriteOrSpeak: { fr: "Écris ou parle…", ar: "اكتب أو تكلم…", darija: "Ekteb wala a7ki…" },
  bSpeakToAssistant: { fr: "Parler à l'assistant", ar: "تكلم مع المساعد", darija: "A7ki m3a el assistant" },
  bSend: { fr: "Envoyer", ar: "أرسل", darija: "Ab3ath" },
  bListenAnswer: { fr: "Écouter la réponse", ar: "استمع للإجابة", darija: "Esma3 el jaweb" },
  bProposedPlan: { fr: "Plan proposé", ar: "الخطة المقترحة", darija: "Plan mo9tara7" },
  bSolarPump: { fr: "Pompe solaire", ar: "مضخة شمسية", darija: "Pompe solaire" },
  bPctWater: { fr: "{v} d'eau", ar: "{v} ماء", darija: "{v} ma" },
  bPctRevenue: { fr: "{v} de revenu", ar: "{v} دخل", darija: "{v} dakhl" },
  bListening: {
    fr: "J'écoute… touche le micro pour arrêter.",
    ar: "نسمع… المس الميكروفون للتوقف.",
    darija: "Nesma3… dos 3al micro bach to9ef.",
  },
  bVoiceUnavailable: {
    fr: "La dictée vocale n'est pas disponible sur cet appareil. Écris ta question.",
    ar: "الإملاء الصوتي غير متاح على هذا الجهاز. اكتب سؤالك.",
    darija: "El dictée bel sout mahich mawjouda 3la had el jhaz. Ekteb so2alek.",
  },
  bVoiceError: {
    fr: "Je n'ai pas compris. Réessaie ou écris ta question.",
    ar: "لم أفهم. أعد المحاولة أو اكتب سؤالك.",
    darija: "Ma fhemtch. 3awed wala ekteb so2alek.",
  },
  bVoiceDenied: {
    fr: "Le micro est bloqué. Autorise-le dans le navigateur ou écris ta question.",
    ar: "الميكروفون محجوب. اسمح به في المتصفح أو اكتب سؤالك.",
    darija: "El micro msakker. 7allou fel navigateur wala ekteb so2alek.",
  },
  bPlayVoice: { fr: "Réécouter le message", ar: "أعد سماع الرسالة", darija: "3awed esma3 el message" },

  // Label
  bVerifCulture: { fr: "Cultures déclarées confirmées", ar: "الزراعات المصرّح بها مؤكدة", darija: "El cultures elli 9olt 3lihom m2akda" },
  bVerifIrrigation: { fr: "Irrigation cohérente avec le plan", ar: "الري متوافق مع الخطة", darija: "El ray mtabe9 lel plan" },
  bVerifIrrigationDetail: { fr: "Humidité du sol dans la cible", ar: "رطوبة التربة في الهدف", darija: "Rtoubet el torba fel cible" },
  bNextCheck: { fr: "Prochaine vérification", ar: "التحقق القادم", darija: "El verification el jaya" },
  bPrintLabels: { fr: "Imprimer les étiquettes", ar: "اطبع الملصقات", darija: "Etba3 el étiquettes" },
  bPrintShare: {
    fr: "Étiquette {ferme} · Label Eau · code {qr} · {lien}",
    ar: "ملصق {ferme} · علامة الماء · الرمز {qr} · {lien}",
    darija: "Étiquette {ferme} · Label Ma · code {qr} · {lien}",
  },
  bPrintError: {
    fr: "Impossible d'imprimer ou de partager. Réessaie.",
    ar: "تعذرت الطباعة أو المشاركة. أعد المحاولة.",
    darija: "Ma njemtch netba3 wala nparteji. 3awed.",
  },
  bPrintDone: { fr: "Étiquettes envoyées.", ar: "الملصقات تبعثت.", darija: "El étiquettes tba3thou." },
} satisfies Record<string, Localized>;
