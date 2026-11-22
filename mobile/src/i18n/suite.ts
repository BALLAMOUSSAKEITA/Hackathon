import type { Localized } from "../types";

/** Libellés de la refonte (écrans secondaires et outils). */
export const SUITE = {
  // Solaire
  solarTitle: { fr: "Énergie de pompage", ar: "طاقة الضخ", darija: "Energie el pompage" },
  solarSubtitle: { fr: "Pompe solaire pour ton puits", ar: "مضخة شمسية لبئرك", darija: "Pompe solaire l birek" },
  calculate: { fr: "Calculer", ar: "احسب", darija: "A7seb" },
  invalidDepth: { fr: "Indique une profondeur valable, en mètres.", ar: "أدخل عمقا صالحا بالمتر.", darija: "Hot 3om9 shih bel metro." },
  solarAdvised: { fr: "Pompe solaire conseillée", ar: "المضخة الشمسية المقترحة", darija: "Pompe solaire mo9tar7a" },
  power: { fr: "puissance", ar: "القدرة", darija: "puissance" },
  panels: { fr: "panneaux", ar: "ألواح", darija: "panneaux" },
  tank: { fr: "réservoir", ar: "خزان", darija: "réservoir" },
  solarBasis: {
    fr: "Calculé pour {kwh} kWh/m³ et l'ensoleillement de Sidi Bouzid.",
    ar: "محسوب على {kwh} ك.واط.س/م³ وتشمس سيدي بوزيد.",
    darija: "Mahsoub 3la {kwh} kWh/m³ w chams Sidi Bouzid.",
  },
  costPerYear: { fr: "Comparer les coûts", ar: "مقارنة التكاليف", darija: "9aren el couts" },
  perYearDt: { fr: "{v} DT/an", ar: "{v} د.ت/سنة", darija: "{v} DT/3am" },
  investment: { fr: "investissement", ar: "استثمار", darija: "investissement" },
  payback: { fr: "Solaire amorti en {n} ans face au gasoil.", ar: "الشمسي يتخلص في {n} سنوات مقارنة بالغازوال.", darija: "El solaire yetkhallas fi {n} snin 9odem el gasoil." },
  whenPump: { fr: "Quand pomper aujourd'hui", ar: "وقتاش نضخ اليوم", darija: "Wa9tech npompi el youm" },
  whenPumpBody: {
    fr: "Pompe quand le soleil est fort pour remplir le réservoir, puis arrose le soir au goutte-à-goutte.",
    ar: "اضخ لما تكون الشمس قوية لملء الخزان، ثم اسقِ مساء بالتقطير.",
    darija: "Pompi ki tkoun el chams 9wiya bach t3abbi el réservoir, w osgi fel 3chiya bel goutte-à-goutte.",
  },

  // Suivi
  trackTitle: { fr: "Suivi par satellite", ar: "المتابعة بالقمر الصناعي", darija: "Suivi bel satellite" },
  trackSubtitle: { fr: "Images Sentinel-2 de ta parcelle", ar: "صور Sentinel-2 لقطعتك", darija: "Tsawer Sentinel-2 mta3 parceltek" },
  oneImage: { fr: "1 image", ar: "صورة واحدة", darija: "Taswira wa7da" },
  twoImages: { fr: "2 images", ar: "صورتان", darija: "Zouz tsawer" },
  zoneHealth: { fr: "Santé par zone", ar: "الصحة حسب المنطقة", darija: "Sa7a 7asb el zone" },
  waterUsedSeason: { fr: "Eau utilisée cette saison", ar: "الماء المستعمل هذا الموسم", darija: "El ma elli esta3meltou had el mousem" },
  statusConforme: { fr: "Dans les clous de ton plan.", ar: "مطابق لخطتك.", darija: "Mtabe9 l planek." },
  statusAConfirmer: {
    fr: "Écart vu sur une image : à confirmer par la prochaine.",
    ar: "فرق في صورة واحدة : يتأكد بالصورة الجاية.",
    darija: "Far9 f taswira wa7da : yetakked bel jeya.",
  },
  statusEcart: {
    fr: "Écart confirmé par deux images : le label peut être revu.",
    ar: "فرق مؤكد بصورتين : العلامة يمكن مراجعتها.",
    darija: "Far9 mwakked b zouz tsawer : el label ynajjem yetbaddel.",
  },
  alerts: { fr: "Alertes", ar: "التنبيهات", darija: "Alertes" },
  noAlert: { fr: "Aucune alerte pour l'instant.", ar: "لا تنبيه حاليا.", darija: "Ma famma 7atta alerte tawa." },
  contest: { fr: "Contester avec une photo", ar: "اعترض بصورة", darija: "E3tared b taswira" },
  contestSent: { fr: "Contestation envoyée avec ta photo.", ar: "الاعتراض تبعث بصورتك.", darija: "El contestation tba3thet b taswirtek." },

  // Ventes
  salesTitle: { fr: "Mes ventes", ar: "مبيعاتي", darija: "Bi3ati" },
  salesSubtitle: { fr: "Produits labellisés {label}", ar: "منتجات بعلامة {label}", darija: "Produits b label {label}" },
  salesPending: { fr: "Ventes en cours", ar: "مبيعات جارية", darija: "Bi3 9a3ed" },
  avgVsMarket: { fr: "Prix vs marché", ar: "السعر مقارنة بالسوق", darija: "Sa3er vs souk" },
  statusPending: { fr: "À confirmer", ar: "للتأكيد", darija: "Lel ta2kid" },
  statusAccepted: { fr: "Acceptée", ar: "مقبولة", darija: "Ma9boula" },
  statusCounter: { fr: "Contre-offre envoyée", ar: "عرض مضاد مرسل", darija: "Contre-offre tba3thet" },
  orderLine: { fr: "{q} kg · {m} DT", ar: "{q} كغ · {m} د.ت", darija: "{q} kg · {m} DT" },
  accept: { fr: "Accepter", ar: "قبول", darija: "A9bel" },
  proposePrice: { fr: "Proposer un prix", ar: "اقترح سعرا", darija: "E9tara7 sa3er" },
  newPrice: { fr: "Nouveau prix par kg", ar: "سعر جديد للكغ", darija: "Sa3er jdid lel kg" },
  sendOffer: { fr: "Envoyer l'offre", ar: "أرسل العرض", darija: "Ab3ath el offre" },
  quoteRequest: { fr: "Demande de devis", ar: "طلب عرض سعر", darija: "Talab devis" },
  publishProduct: { fr: "Publier un produit", ar: "انشر منتجا", darija: "Onchor produit" },
  productName: { fr: "Nom du produit", ar: "اسم المنتج", darija: "Esm el produit" },
  priceKg: { fr: "Prix", ar: "السعر", darija: "Sa3er" },
  stockKg: { fr: "Stock", ar: "المخزون", darija: "Stock" },
  published: { fr: "Publié sur le marché · label {label}", ar: "نُشر في السوق · علامة {label}", darija: "Tnchar fel souk · label {label}" },
  invalidSale: { fr: "Indique un nom, un prix et un stock valables.", ar: "أدخل اسما وسعرا ومخزونا صالحين.", darija: "Hot esm, sa3er w stock shah." },
  invalidPriceOnly: { fr: "Indique un prix valable.", ar: "أدخل سعرا صالحا.", darija: "Hot sa3er shih." },
  publish: { fr: "Publier", ar: "انشر", darija: "Onchor" },

  // Notifications
  markAllRead: { fr: "Tout lire", ar: "قراءة الكل", darija: "E9ra kol chay" },
  unreadCount: { fr: "{n} non lues", ar: "{n} غير مقروءة", darija: "{n} mazelou ma t9raw" },
  allRead: { fr: "Tout est lu", ar: "الكل مقروء", darija: "Kol chay t9ra" },
  notifIrrigation: { fr: "Irrigation", ar: "الري", darija: "El ray" },
  notifPompage: { fr: "Pompage solaire", ar: "الضخ الشمسي", darija: "Pompage solaire" },
  notifCommande: { fr: "Nouvelle commande", ar: "طلب جديد", darija: "Commande jdida" },
  notifLabel: { fr: "Label", ar: "العلامة", darija: "Label" },
  notifOther: { fr: "Information", ar: "معلومة", darija: "Ma3louma" },
  noNotif: { fr: "Aucune notification.", ar: "لا إشعارات.", darija: "Ma famma 7atta notification." },

  // Réglages
  settingsTitle: { fr: "Profil et réglages", ar: "الملف والإعدادات", darija: "Profil w réglages" },
  myFarm: { fr: "Ma ferme", ar: "ضيعتي", darija: "Fermti" },
  frozen: { fr: "plan figé", ar: "خطة مثبتة", darija: "plan mthabbet" },
  frozenPlan: { fr: "Plan figé : label {label}", ar: "الخطة المثبتة : علامة {label}", darija: "Plan mthabbet : label {label}" },
  ranking: { fr: "Classement actuel", ar: "الترتيب الحالي", darija: "Tartib tawa" },
  applyPrice: { fr: "Prix olivier à 12 DT (ONAGRI)", ar: "سعر الزيتون 12 د.ت (ONAGRI)", darija: "Sa3er zitoun 12 DT (ONAGRI)" },
  priceApplied: { fr: "Prix mis à jour. Le plan figé garde sa lettre.", ar: "السعر تحدّث. الخطة المثبتة تحافظ على حرفها.", darija: "Es-sa3er tbaddel. El plan mthabbet yeb9a b 7arfou." },
  tools: { fr: "Outils", ar: "أدوات", darija: "Outils" },
  toolCultures: { fr: "Catalogue des cultures", ar: "دليل الزراعات", darija: "Catalogue el cultures" },
  toolOffline: { fr: "Mode hors ligne", ar: "وضع دون اتصال", darija: "Mode bla connexion" },
  toolAdmin: { fr: "Administration", ar: "الإدارة", darija: "Administration" },
  logout: { fr: "Se déconnecter", ar: "تسجيل الخروج", darija: "Okhrej" },

  // Démo
  demoSubtitle: { fr: "Le parcours en {n} étapes", ar: "المسار في {n} مراحل", darija: "El masar fi {n} marahel" },
  pitchTitle: { fr: "Le pitch", ar: "العرض", darija: "El pitch" },
  pitchSale: { fr: "Vente", ar: "البيع", darija: "Bi3" },
  startDemo: { fr: "Lancer la démo", ar: "ابدأ العرض", darija: "Ebda el demo" },

  // Hors ligne
  offlineTitle: { fr: "Mode hors ligne", ar: "وضع دون اتصال", darija: "Mode bla connexion" },
  offlineBody: {
    fr: "Ces données sont enregistrées sur le téléphone et restent visibles sans réseau.",
    ar: "هذه البيانات محفوظة في الهاتف وتبقى ظاهرة دون شبكة.",
    darija: "Had el data m7foudha fel telephone w teb9a bayna bla reseau.",
  },
  savedAnalysis: { fr: "Analyse enregistrée", ar: "التحليل المحفوظ", darija: "Tahlil m7fouth" },
  savedRanking: { fr: "Classement enregistré", ar: "الترتيب المحفوظ", darija: "Tartib m7fouth" },
  sendParcel: { fr: "Envoyer la parcelle", ar: "أرسل القطعة", darija: "Ab3ath el parcelle" },
  parcelSent: { fr: "Parcelle envoyée.", ar: "القطعة تبعثت.", darija: "El parcelle tba3thet." },
  consentRequired: {
    fr: "Accord requis : coche la case pour envoyer la position.",
    ar: "الموافقة مطلوبة : أشّر على الخانة لإرسال الموقع.",
    darija: "Lazem accord : cochi el case bach tab3ath el position.",
  },
  waitingNetwork: {
    fr: "En attente du réseau : la parcelle partira dès que possible.",
    ar: "في انتظار الشبكة : القطعة تتبعث في أقرب وقت.",
    darija: "Nestannew el reseau : el parcelle temchi ki yerja3.",
  },
  photoCompressed: { fr: "Photo {nom} compressée : {a} o → {b} o", ar: "الصورة {nom} مضغوطة : {a} ب → {b} ب", darija: "Taswira {nom} mdhghouta : {a} o → {b} o" },

  // Admin
  adminTitle: { fr: "Administration", ar: "الإدارة", darija: "Administration" },
  adminSubtitle: { fr: "Pilote de {lieu} · {n} agriculteurs", ar: "تجربة {lieu} · {n} فلاح", darija: "Pilote {lieu} · {n} fellah" },
  labelsTitle: { fr: "Labels", ar: "العلامات", darija: "Labels" },
  labelContested: { fr: "Contesté", ar: "معترض عليه", darija: "Contesté" },
  openSuspended: { fr: "Ouvrir le QR suspendu", ar: "افتح الرمز المعلق", darija: "7ell el QR el mwaqqef" },
  publicShows: { fr: "La fiche publique affiche : {note}", ar: "البطاقة العامة تعرض : {note}", darija: "El fiche publique twarri : {note}" },
  suspendedNotice: {
    fr: "Label suspendu : la fiche publique ne montre plus de lettre.",
    ar: "العلامة معلقة : البطاقة العامة لم تعد تعرض الحرف.",
    darija: "Label mwaqqef : el fiche publique ma 3adech twarri 7arf.",
  },
  moderation: { fr: "File de modération", ar: "قائمة المراجعة", darija: "File el modération" },
  modLabel: { fr: "Label à revoir", ar: "علامة للمراجعة", darija: "Label lel mouraja3a" },
  modProduit: { fr: "Produit signalé", ar: "منتج مبلّغ عنه", darija: "Produit msignali" },
  modCompte: { fr: "Compte à modérer", ar: "حساب للمراجعة", darija: "Compte lel modération" },
  thresholds: { fr: "Seuils à calibrer", ar: "عتبات للضبط", darija: "Seuils lel calibrage" },

  // Cultures
  searchCropHint: { fr: "Olivier, câpres, grenadier…", ar: "زيتون، كبّار، رمان…", darija: "Zitoun, kebbar, rommen…" },
  searchCrop: { fr: "Rechercher une culture", ar: "ابحث عن زراعة", darija: "Lawwej 3la culture" },
  cropsCount: { fr: "{n} cultures", ar: "{n} زراعة", darija: "{n} cultures" },
  noCrop: { fr: "Aucune culture ne correspond.", ar: "لا توجد زراعة مطابقة.", darija: "Ma famma 7atta culture." },
  typicalPrice: { fr: "Prix typique", ar: "السعر المعتاد", darija: "Sa3er 3adi" },
} satisfies Record<string, Localized>;
