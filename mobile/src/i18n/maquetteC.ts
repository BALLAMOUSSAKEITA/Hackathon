import type { Localized } from "../types";

/** Libellés ajoutés pour coller aux maquettes (groupe C). */
export const MAQUETTE_C = {
  // Commun
  mcCancel: { fr: "Annuler", ar: "إلغاء", darija: "Batel" },
  mcYearsN: { fr: "{n} ans", ar: "{n} سنوات", darija: "{n} snin" },

  // Solaire (maquette 08)
  mcSolarForWell: { fr: "Pour ton puits de {m} m", ar: "لبئرك بعمق {m} م", darija: "L-bir mte3ek {m} m" },
  mcSolarNeedDepth: {
    fr: "Indique la profondeur de ton puits pour calculer la pompe solaire.",
    ar: "أدخل عمق بئرك لحساب المضخة الشمسية.",
    darija: "A3tina 3ma9 el bir bach n7asbou el pompe solaire.",
  },
  mcSolarCalcBasis: {
    fr: "Calculé avec ton besoin ({m3} m³/jour, {kwh} kWh/jour), un puits de {p} m et {h} h de plein soleil par jour.",
    ar: "محسوب حسب حاجتك ({m3} م³/يوم، {kwh} ك.و.س/يوم)، بئر بعمق {p} م و{h} ساعات شمس كاملة يوميا.",
    darija: "M7soub 3la 7ajtek ({m3} m³/nhar, {kwh} kWh/nhar), bir {p} m w {h} se3at chams kol nhar.",
  },
  mcCompareWith: { fr: "Comparer avec", ar: "قارن مع", darija: "9aren m3a" },
  mcPumpGasoil: { fr: "Pompe au gasoil", ar: "مضخة بالغازوال", darija: "Pompe b-el gasoil" },
  mcPumpSteg: { fr: "Pompe sur le réseau STEG", ar: "مضخة على شبكة ستاغ", darija: "Pompe 3al STEG" },
  mcSolarInvestment: { fr: "Investissement solaire estimé", ar: "الاستثمار الشمسي التقديري", darija: "Investissement solaire ta9ribi" },
  mcPaybackIn: { fr: "Amorti en", ar: "يُسترجع في", darija: "Yrajja3 flousou f" },
  mcPumpWindow: { fr: "Pompe de {a} h à {b} h", ar: "اضخ من {a} إلى {b}", darija: "Pompi men {a} h l {b} h" },
  mcPumpWindowRest: {
    fr: "pour remplir le réservoir, puis arrose le soir au goutte-à-goutte.",
    ar: "لملء الخزان، ثم اسق في المساء بالتقطير.",
    darija: "bach tma3mer el réservoir, w ba3d osgi fel 3chiya b goutte-à-goutte.",
  },
  mcEditDepth: { fr: "Modifier la profondeur du puits ({m} m)", ar: "تعديل عمق البئر ({m} م)", darija: "Baddel 3ma9 el bir ({m} m)" },

  // Suivi (maquette 09)
  mcImageDates: { fr: "Image du {a} · prochaine le {b}", ar: "صورة {a} · القادمة {b}", darija: "Taswira {a} · el jeya {b}" },
  mcVegetation: { fr: "Végétation", ar: "الغطاء النباتي", darija: "Nabat" },
  mcHumidity: { fr: "Humidité", ar: "الرطوبة", darija: "Rtouba" },
  mcLegendStress: { fr: "Orange : stress", ar: "برتقالي : إجهاد", darija: "Orange : stress" },
  mcLegendHealthy: { fr: "Vert foncé : en bonne santé", ar: "أخضر داكن : بصحة جيدة", darija: "A5dher ghame9 : b-sa77tou" },
  mcLegendDry: { fr: "Orange : sol sec", ar: "برتقالي : تربة جافة", darija: "Orange : torba nechfa" },
  mcLegendWet: { fr: "Bleu foncé : bien humide", ar: "أزرق داكن : رطبة جيدا", darija: "Azra9 ghame9 : mriguel" },
  mcGridStress: { fr: "Carte de végétation : stress en zone {zones}", ar: "خريطة النبات : إجهاد في منطقة {zones}", darija: "Carte nabat : stress f zone {zones}" },
  mcGridDry: { fr: "Carte d'humidité : sol sec en zone {zones}", ar: "خريطة الرطوبة : تربة جافة في منطقة {zones}", darija: "Carte rtouba : torba nechfa f zone {zones}" },
  mcGridHealthy: { fr: "Toutes les zones sont en bonne santé", ar: "كل المناطق بصحة جيدة", darija: "El zones lkol b-sa77t-hom" },
  mcHumidityNote: {
    fr: "L'humidité est estimée à partir de la même image satellite.",
    ar: "الرطوبة مقدرة من نفس صورة القمر الصناعي.",
    darija: "El rtouba m9addra men nafs taswira satellite.",
  },
  mcZoneStressTitle: { fr: "Zone {zone} : stress hydrique", ar: "منطقة {zone} : إجهاد مائي", darija: "Zone {zone} : stress mte3 ma" },
  mcZoneStressBody: {
    fr: "NDVI {ndvi}. Vérifie les goutteurs de cette zone, ils sont peut-être bouchés.",
    ar: "NDVI {ndvi}. افحص القطارات في هذه المنطقة، ربما هي مسدودة.",
    darija: "NDVI {ndvi}. Chouf el goutteurs f zone hedhi, yemken msakrin.",
  },
  mcTakePhoto: { fr: "Prendre une photo", ar: "التقاط صورة", darija: "Saouer" },
  mcFromGallery: { fr: "Galerie", ar: "المعرض", darija: "Galerie" },
  mcChangePhoto: { fr: "Changer", ar: "تغيير", darija: "Baddel" },
  mcSendContest: { fr: "Envoyer", ar: "إرسال", darija: "Ab3ath" },
  mcPhotoGps: { fr: "Position GPS : {p}", ar: "الموقع GPS : {p}", darija: "Position GPS : {p}" },
  mcPhotoNoGps: { fr: "Photo sans position GPS", ar: "صورة دون موقع GPS", darija: "Taswira bla position GPS" },
  mcCameraDenied: {
    fr: "Accès à l'appareil photo refusé. Autorise-le dans les réglages ou choisis une photo de la galerie.",
    ar: "تم رفض الوصول إلى الكاميرا. اسمح به في الإعدادات أو اختر صورة من المعرض.",
    darija: "El camera mamnou3a. 7allha fel réglages wala ekhtar taswira mel galerie.",
  },
  mcPhotoError: { fr: "Impossible d'ouvrir la photo. Réessaie.", ar: "تعذر فتح الصورة. أعد المحاولة.", darija: "Ma njemnech n7ellou taswira. 3awed." },
  mcContestKept: {
    fr: "Pas de réseau : ta photo est gardée, réessaie l'envoi plus tard.",
    ar: "لا توجد شبكة : صورتك محفوظة، أعد الإرسال لاحقا.",
    darija: "Ma famech réseau : taswirtek ma7fouda, 3awed ab3athha ba3d.",
  },

  // Ventes (maquette 10)
  mcOrdersOfMonth: { fr: "Commandes de {mois}", ar: "طلبات {mois}", darija: "Commandes {mois}" },
  mcOrdersTab: { fr: "Commandes ({n})", ar: "الطلبات ({n})", darija: "Commandes ({n})" },
  mcMyProducts: { fr: "Mes produits", ar: "منتجاتي", darija: "Produits mte3i" },
  mcOrderDetail: { fr: "{q} kg de {produit} · {m} DT", ar: "{q} كغ {produit} · {m} د", darija: "{q} kg {produit} · {m} DT" },
  mcQuoteBadge: { fr: "Devis", ar: "عرض سعر", darija: "Devis" },
  mcOrderAccepted: { fr: "Commande acceptée. L'acheteur est prévenu.", ar: "تم قبول الطلب. تم إعلام المشتري.", darija: "El commande t9eblet. El chari 3raf." },
  mcOfferSent: { fr: "Ton prix est envoyé à l'acheteur.", ar: "تم إرسال سعرك إلى المشتري.", darija: "Sa3rek tba3ath lel chari." },
  mcOnMarket: { fr: "En ligne", ar: "معروض", darija: "Fel souk" },
  mcInStock: { fr: "{n} {u} en stock", ar: "{n} {u} في المخزون", darija: "{n} {u} fel stock" },
  mcNoProductYet: { fr: "Aucun produit publié pour l'instant.", ar: "لا يوجد منتج منشور حاليا.", darija: "Mazel ma nchart 7atta produit." },

  // Notifications (maquette 11)
  mcToday: { fr: "Aujourd'hui", ar: "اليوم", darija: "Lyoum" },
  mcThisWeek: { fr: "Cette semaine", ar: "هذا الأسبوع", darija: "El jem3a hedhi" },
  mcAgoMin: { fr: "il y a {n} min", ar: "منذ {n} د", darija: "9bal {n} d" },
  mcAgoHour: { fr: "il y a {n} h", ar: "منذ {n} س", darija: "9bal {n} s" },
  mcAgoDay: { fr: "il y a {n} j", ar: "منذ {n} يوم", darija: "9bal {n} ayem" },
  mcUnread: { fr: "Non lue", ar: "غير مقروءة", darija: "Mouch ma9rouya" },
  mcNotifTitleIrrigation: { fr: "Conseil d'arrosage", ar: "نصيحة الري", darija: "Nasi7a mte3 ray" },
  mcNotifTitlePompage: { fr: "Grand soleil : moment de pomper", ar: "شمس قوية : وقت الضخ", darija: "Chams 9wiya : wa9t el pompage" },
  mcNotifTitleLabel: { fr: "Label {label} confirmé", ar: "تأكيد العلامة {label}", darija: "Label {label} mwakked" },
  mcNotifTitleAlert: { fr: "Alerte sur ta parcelle", ar: "تنبيه على قطعتك", darija: "Alerte 3la parcelle mte3ek" },

  // Administration
  mcSuspendLabel: { fr: "Suspendre ce label", ar: "تعليق هذه العلامة", darija: "Waqqef el label hedha" },
  mcLabelSuspendedDone: {
    fr: "Label {qr} suspendu : la fiche publique n'affiche plus sa lettre.",
    ar: "تم تعليق العلامة {qr} : البطاقة العامة لم تعد تعرض حرفها.",
    darija: "El label {qr} twaqqef : el fiche publique ma3adech twarri el 7arf.",
  },
} satisfies Record<string, Localized>;
