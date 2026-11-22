import type { Localized } from "../types";

/** Libellés ajoutés pour coller aux maquettes (groupe D). */
export const MAQUETTE_D = {
  // Marché
  mdFilterAll: { fr: "Tout", ar: "الكل", darija: "Kol chay" },
  mdLabelNote: { fr: "Label {note}", ar: "علامة {note}", darija: "Label {note}" },
  mdLabelEau: { fr: "Label Eau", ar: "علامة الماء", darija: "Label Ma" },
  mdCatHuile: { fr: "Huile", ar: "زيت", darija: "Zit" },
  mdCatFruit: { fr: "Fruits", ar: "غلال", darija: "Ghlal" },
  mdCatCondiment: { fr: "Condiments", ar: "توابل", darija: "Twabel" },
  mdCatLegume: { fr: "Légumes", ar: "خضر", darija: "Khodra" },
  mdCatCereale: { fr: "Céréales", ar: "حبوب", darija: "7boub" },
  mdCatAutre: { fr: "Autres", ar: "أخرى", darija: "Okhrin" },
  mdFiltersLabel: { fr: "Filtrer les produits", ar: "تصفية المنتجات", darija: "Filtri el produits" },
  mdClearSearch: { fr: "Effacer la recherche", ar: "مسح البحث", darija: "Fasakh el recherche" },
  mdResetFilters: { fr: "Voir tous les produits", ar: "عرض كل المنتجات", darija: "Chouf el produits el kol" },

  // Produit
  mdTileWater: { fr: "d'eau vs moyenne du marché", ar: "ماء مقارنة بمعدل السوق", darija: "ma m9arna b moyenne el souk" },
  mdTileEnergy: { fr: "d'énergie vs moyenne du marché", ar: "طاقة مقارنة بمعدل السوق", darija: "energie m9arna b moyenne el souk" },
  mdTileValue: { fr: "de revenu par m³ d'eau", ar: "مدخول لكل م³ ماء", darija: "dakhl 3la kol m³ ma" },
  mdAddCart: { fr: "Ajouter au panier", ar: "أضف إلى السلة", darija: "Zid lel panier" },
  mdProBuy: { fr: "Achat pro", ar: "شراء مهني", darija: "Chri pro" },
  mdAddedQty: {
    fr: "{n} {unite} ajouté(s) · {total} au panier",
    ar: "أضيف {n} {unite} · {total} في السلة",
    darija: "Tzad {n} {unite} · {total} fel panier",
  },
  mdQuoteTitle: { fr: "Demande de devis pro", ar: "طلب عرض سعر مهني", darija: "Talab devis pro" },
  mdQuoteBody: {
    fr: "Achat en gros auprès de {ferme}. La ferme confirme le prix et la livraison.",
    ar: "شراء بالجملة من {ferme}. الضيعة تؤكد السعر والتوصيل.",
    darija: "Chri bel gros men {ferme}. El ferma t2akked el soum w el livraison.",
  },
  mdQuoteQty: { fr: "Quantité souhaitée ({unite})", ar: "الكمية المطلوبة ({unite})", darija: "El kammiya elli t7ebha ({unite})" },
  mdQuoteEstimate: { fr: "Estimation au prix affiché : {total} DT", ar: "تقدير بالسعر المعروض : {total} د.ت", darija: "Ta9dir bel soum el mektoub : {total} DT" },
  mdQuoteSend: { fr: "Envoyer la demande", ar: "أرسل الطلب", darija: "Ab3ath el talab" },
  mdQuoteCancel: { fr: "Annuler", ar: "إلغاء", darija: "Batel" },
  mdQuoteInvalid: { fr: "Indique une quantité d'au moins 1.", ar: "أدخل كمية لا تقل عن 1.", darija: "Ekteb kammiya 1 3al a9al." },
  mdQuoteSent: { fr: "Demande envoyée", ar: "تم إرسال الطلب", darija: "El talab tba3ath" },
  mdQuoteSentBody: {
    fr: "Référence {id} · {qte} {unite}. La ferme va te répondre avec son prix.",
    ar: "المرجع {id} · {qte} {unite}. الضيعة سترد عليك بسعرها.",
    darija: "Reference {id} · {qte} {unite}. El ferma bech trodd 3lik b soumha.",
  },
  mdQuoteLocal: { fr: "Pas de réseau : demande gardée sur ton téléphone", ar: "لا توجد شبكة : الطلب محفوظ في هاتفك", darija: "Ma fama reseau : el talab ma7fouth f telifounek" },
  mdQuoteLocalBody: {
    fr: "Référence {id} · {qte} {unite}. Elle n'est pas encore transmise à la ferme : renvoie-la quand le réseau revient.",
    ar: "المرجع {id} · {qte} {unite}. لم يُرسل بعد إلى الضيعة : أعد إرساله عند عودة الشبكة.",
    darija: "Reference {id} · {qte} {unite}. Mazel ma wsolch lel ferma : 3awed ab3athou ki yarja3 el reseau.",
  },
  mdQuoteError: {
    fr: "Le serveur a refusé la demande. Vérifie la quantité et réessaie.",
    ar: "رفض الخادم الطلب. تحقق من الكمية وأعد المحاولة.",
    darija: "El serveur rfadh el talab. Thabbet fel kammiya w 3awed.",
  },
  mdClose: { fr: "Fermer", ar: "إغلاق", darija: "Sakker" },

  // Scanner
  mdTorchOn: { fr: "Allumer la lampe", ar: "تشغيل المصباح", darija: "Cha3el el dhaw" },
  mdTorchOff: { fr: "Éteindre la lampe", ar: "إطفاء المصباح", darija: "Tfi el dhaw" },
  mdCamAllow: { fr: "Autoriser la caméra", ar: "السماح بالكاميرا", darija: "Khalli el camera" },
  mdCamAsk: {
    fr: "Ardi a besoin de la caméra pour lire le QR code de l'étiquette.",
    ar: "يحتاج أردي إلى الكاميرا لقراءة رمز QR على الملصق.",
    darija: "Ardi y7eb el camera bech ye9ra el QR mta3 el etiquette.",
  },
  mdCamDenied: {
    fr: "La caméra n'est pas autorisée. Ouvre les réglages, saisis le code ou utilise le QR de démo.",
    ar: "الكاميرا غير مسموح بها. افتح الإعدادات أو أدخل الرمز أو استعمل رمز العرض.",
    darija: "El camera mich msm7a. 7el el reglages, ekteb el code wala esta3mel QR demo.",
  },
  mdCamSettings: { fr: "Ouvrir les réglages", ar: "فتح الإعدادات", darija: "7el el reglages" },
  mdCamUnavailable: {
    fr: "Aucune caméra utilisable sur cet appareil. Saisis le code ou utilise le QR de démo.",
    ar: "لا توجد كاميرا صالحة في هذا الجهاز. أدخل الرمز أو استعمل رمز العرض.",
    darija: "Ma fama 7atta camera f el jhaz hetha. Ekteb el code wala esta3mel QR demo.",
  },
  mdScanAgain: { fr: "Scanner un autre produit", ar: "امسح منتجا آخر", darija: "Scanni produit ekher" },
  mdSearching: { fr: "Recherche du produit…", ar: "جارٍ البحث عن المنتج…", darija: "Nlawjou 3al produit…" },
  mdLabelOnly: { fr: "Label vérifié · aucune fiche en vente", ar: "علامة موثقة · لا يوجد منتج للبيع", darija: "Label mwatthe9 · ma fama 7atta fiche lel bi3" },
  mdLabelSuspended: { fr: "Label suspendu · ne pas se fier à la lettre", ar: "علامة معلقة · لا تعتمد على الحرف", darija: "Label mwaqqef · ma tet9ach fel 7arf" },

  // Panier
  mdCartImpactA: { fr: "Avec cette commande, tu soutiens", ar: "بهذا الطلب، تدعم", darija: "B had el commande, t3awen" },
  mdCartImpactB: { fr: "{eau} m³ d'eau économisés", ar: "{eau} م³ من الماء الموفر", darija: "{eau} m³ ma mwaffar" },
  mdCartImpactC: {
    fr: "par rapport à des cultures non labellisées (estimation).",
    ar: "مقارنة بزراعات دون علامة (تقدير).",
    darija: "m9arna b cultures bla label (ta9dir).",
  },
  mdPayD17: { fr: "D17", ar: "D17", darija: "D17" },
  mdPayCard: { fr: "Carte", ar: "بطاقة", darija: "Carte" },
  mdPaidWith: { fr: "Paiement : {moyen}", ar: "الدفع : {moyen}", darija: "Khlass : {moyen}" },
  mdRemoveOne: { fr: "Retirer une unité de {nom}", ar: "أنقص وحدة من {nom}", darija: "Na99es wa7da men {nom}" },
  mdAddOne: { fr: "Ajouter une unité de {nom}", ar: "أضف وحدة من {nom}", darija: "Zid wa7da men {nom}" },
  mdCartEmptyTitle: { fr: "Ton panier attend ses premiers produits", ar: "سلتك تنتظر أول منتجاتها", darija: "Panier mte3ek yestanna awel produits" },

  // Impact
  mdBuyerSince: { fr: "Acheteur responsable depuis {mois}", ar: "مشترٍ مسؤول منذ {mois}", darija: "Chari responsable men {mois}" },
  mdProSince: { fr: "Acheteur professionnel depuis {mois}", ar: "مشترٍ مهني منذ {mois}", darija: "Chari pro men {mois}" },
  mdProActive: { fr: "Compte pro actif", ar: "الحساب المهني مفعل", darija: "Compte pro me5dem" },
  mdProActiveBody: {
    fr: "Achats en gros et demandes de devis depuis chaque fiche produit.",
    ar: "شراء بالجملة وطلبات عروض أسعار من كل بطاقة منتج.",
    darija: "Chri bel gros w talab devis men kol fiche produit.",
  },
  mdProDone: { fr: "Ton compte est passé en professionnel.", ar: "أصبح حسابك مهنيا.", darija: "Compte mte3ek walla pro." },
  mdPersonalDone: { fr: "Ton compte est revenu en particulier.", ar: "عاد حسابك فرديا.", darija: "Compte mte3ek rja3 particulier." },
  mdBackPersonal: { fr: "Revenir particulier", ar: "العودة إلى الفردي", darija: "Arja3 particulier" },
  mdShareReport: { fr: "Partager le rapport", ar: "مشاركة التقرير", darija: "Partaji el rapport" },
  mdReportText: {
    fr: "Mon impact Ardi : {eau} m³ d'eau soutenus, {fermes} fermes, {commandes} commandes, {partA} % label A.",
    ar: "أثري مع أردي : {eau} م³ ماء مدعوم، {fermes} ضيعات، {commandes} طلبات، {partA} % علامة A.",
    darija: "Impact mte3i m3a Ardi : {eau} m³ ma, {fermes} fermat, {commandes} commandes, {partA} % label A.",
  },
} satisfies Record<string, Localized>;
