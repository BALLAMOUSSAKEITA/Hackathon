import type { Localized } from "../types";

/** Libellés ajoutés pour coller aux maquettes (groupe A). Préfixe « mqa » pour éviter les doublons. */
export const MAQUETTE_A = {
  // Accueil
  mqaHeroBody: {
    fr: "En remplaçant la culture de {culture} : **+{rev} % de revenu** à maturité et **{eau} % d'eau en moins**.",
    ar: "بتعويض زراعة {culture} : **+{rev} % في المدخول** عند النضج و**{eau} % ماء أقل**.",
    darija: "Ki tbeddel culture {culture} : **+{rev} % fel dakhla** ki tkammel w **{eau} % ma a9al**.",
  },
  mqaTipBody: {
    fr: "Le soleil donne le plus vers {heure}. Pompe à ce moment-là, puis arrose le soir au goutte-à-goutte : moins d'eau perdue par évaporation.",
    ar: "الشمس في أقواها حوالي {heure}. اضخ في هذا الوقت، ثم اسقِ مساء بالتقطير : ماء أقل يضيع بالتبخر.",
    darija: "El chams a9wa 7awali {heure}. Pompi fi wa9tha, w osgi fel 3chiya bel goutte-à-goutte : ma a9al yetbakhar.",
  },
  mqaOpenNotifs: { fr: "Ouvrir les notifications", ar: "فتح الإشعارات", darija: "7el el notifications" },
  // Parcelle
  mqaGda: { fr: "GDA / barrage", ar: "مجمع / سد", darija: "GDA / sadd" },
  mqaUnitLs: { fr: "L/s", ar: "ل/ث", darija: "L/s" },
  mqaPhotoSoil: { fr: "Photo du sol (optionnel)", ar: "صورة التربة (اختيارية)", darija: "Taswira el torba (ikhtiyari)" },
  mqaPhotoAdded: {
    fr: "Photo ajoutée : touche pour la changer",
    ar: "الصورة مضافة : المس لتغييرها",
    darija: "Taswira tzadet : dos bach tbeddelha",
  },
  mqaPhotoFrom: { fr: "D'où vient la photo ?", ar: "من أين الصورة؟", darija: "Mnin el taswira?" },
  mqaPhotoCamera: { fr: "Appareil photo", ar: "الكاميرا", darija: "Camera" },
  mqaPhotoGallery: { fr: "Galerie", ar: "المعرض", darija: "Galerie" },
  mqaPhotoRemove: { fr: "Retirer", ar: "إزالة", darija: "Na77i" },
  mqaCancel: { fr: "Annuler", ar: "إلغاء", darija: "Batel" },
  mqaPhotoDenied: {
    fr: "Accès refusé. Autorise la caméra ou les photos dans les réglages du téléphone.",
    ar: "تم رفض الوصول. اسمح بالكاميرا أو الصور في إعدادات الهاتف.",
    darija: "El accès trfadh. 3ti el 7a9 lel camera wala el tsawer fel réglages mta3 el telifoun.",
  },
  mqaPhotoError: { fr: "Impossible d'ouvrir la photo. Réessaie.", ar: "تعذر فتح الصورة. أعد المحاولة.", darija: "Ma njemnech n7ellou el taswira. 3awed." },
  mqaParcelDrawingPill: { fr: "Tracé en cours · {n} coins", ar: "الرسم جار · {n} زوايا", darija: "Tracé 9a3ed · {n} coinat" },
  mqaClose: { fr: "Fermer", ar: "إغلاق", darija: "Sakker" },
  mqaUndo: { fr: "Annuler le coin", ar: "إلغاء الزاوية", darija: "Na77i el coin" },
  mqaDemoShort: { fr: "Parcelle de démo", ar: "قطعة العرض", darija: "Parcelle demo" },
  mqaSearchPlace: { fr: "Lieu de la parcelle", ar: "مكان القطعة", darija: "Blaset el parcelle" },
  // Analyse
  mqaToday: { fr: "aujourd'hui", ar: "اليوم", darija: "lyoum" },
  mqaArid: { fr: "Aride", ar: "جاف", darija: "Jef" },
  mqaSemiArid: { fr: "Semi-aride", ar: "شبه جاف", darija: "Chbah jef" },
  mqaSubHumid: { fr: "Subhumide", ar: "شبه رطب", darija: "Chbah rteb" },
  mqaHumid: { fr: "Humide", ar: "رطب", darija: "Rteb" },
  mqaRainYear: { fr: "{n} mm de pluie/an", ar: "{n} مم مطر/سنة", darija: "{n} mm chta/3am" },
  mqaRainWindow: { fr: "{n} mm de pluie en {j} j", ar: "{n} مم مطر في {j} يوما", darija: "{n} mm chta f {j} youm" },
  mqaAvgTemp: { fr: "{n} °C en moyenne", ar: "{n} °م في المعدل", darija: "{n} °C fel moyenne" },
  mqaSunDay: { fr: "{n} kWh/m²/j de soleil", ar: "{n} ك.واط/م²/يوم شمس", darija: "{n} kWh/m²/youm chams" },
  mqaOrganicG: { fr: "matière organique {n} g/kg", ar: "مادة عضوية {n} غ/كغ", darija: "madde organique {n} g/kg" },
  mqaWellOf: { fr: "puits de {n} m", ar: "بئر بعمق {n} م", darija: "bir {n} m" },
  mqaEta: { fr: "rendement de pompe {n}", ar: "مردود المضخة {n}", darija: "rendement el pompe {n}" },
  mqaMonths: { fr: "{n} mois", ar: "{n} شهرا", darija: "{n} chhar" },
  mqaStressRange: { fr: "Stress hydrique de {a} à {b}", ar: "إجهاد مائي من {a} إلى {b}", darija: "Stress mte3 ma men {a} l {b}" },
  mqaStressOne: { fr: "Stress hydrique en {a}", ar: "إجهاد مائي في {a}", darija: "Stress mte3 ma f {a}" },
  mqaStressBody: {
    fr: " : ta culture actuelle demande plus d'eau que ton puits n'en fournit.",
    ar: " : زراعتك الحالية تطلب ماء أكثر مما يعطيه بئرك.",
    darija: " : el culture mte3ek tawa testa7a9 ma akther mel bir mte3ek.",
  },
  mqaNoStress: {
    fr: "Pas de période de stress marquée sur l'année.",
    ar: "لا توجد فترة إجهاد واضحة خلال السنة.",
    darija: "Ma famech fatra stress wadh7a 3al 3am.",
  },
  mqaNdviLabel: { fr: "NDVI mensuel", ar: "NDVI الشهري", darija: "NDVI kol chhar" },
} satisfies Record<string, Localized>;
