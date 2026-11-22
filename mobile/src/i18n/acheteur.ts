import type { Localized } from "../types";

/** Libellés de la refonte (parcours acheteur). */
export const ACHETEUR = {
  // Marché
  marketTitle: { fr: "Marché responsable", ar: "السوق المسؤول", darija: "Souk responsable" },
  marketSubtitle: {
    fr: "Des produits qui économisent l'eau",
    ar: "منتجات توفر الماء",
    darija: "Produits ywaffrou el ma",
  },
  searchPlaceholder: { fr: "Huile, câpres, région, ferme…", ar: "زيت، كبّار، جهة، ضيعة…", darija: "Zit, kebbar, jiha, ferma…" },
  filterAll: { fr: "Tous", ar: "الكل", darija: "Kol chay" },
  scanProduct: { fr: "Scanner un produit", ar: "امسح منتجا", darija: "Scanni produit" },
  noProduct: {
    fr: "Aucun produit ne correspond à ta recherche.",
    ar: "لا يوجد منتج يطابق بحثك.",
    darija: "Ma fama 7atta produit ywafe9 recherche mte3ek.",
  },
  productsCount: { fr: "{n} produits", ar: "{n} منتجات", darija: "{n} produits" },
  perUnit: { fr: "/ {unite}", ar: "/ {unite}", darija: "/ {unite}" },

  // Produit
  productVerified: { fr: "Produit vérifié", ar: "منتج موثق", darija: "Produit mwatthe9" },
  productNotFound: { fr: "Produit introuvable.", ar: "المنتج غير موجود.", darija: "Produit ma l9inahch." },
  labelArdiNote: { fr: "Label Eau", ar: "علامة الماء", darija: "Label Ma" },
  labelExplain: {
    fr: "Culture adaptée à son sol, eau et énergie de pompage économisées. Vérifié par satellite.",
    ar: "زراعة مناسبة لتربتها، ماء وطاقة ضخ موفرة. متحقق منها بالقمر الصناعي.",
    darija: "Culture mnasba l torbetha, ma w energie pompage mwaffra. Mwatth9a bel satellite.",
  },
  waterPerKg: { fr: "d'eau par {unite}", ar: "ماء لكل {unite}", darija: "ma lel {unite}" },
  energyPerKg: { fr: "d'énergie par {unite}", ar: "طاقة لكل {unite}", darija: "energie lel {unite}" },
  farmStory: { fr: "L'histoire de la ferme", ar: "قصة الضيعة", darija: "7kayet el ferma" },
  quantity: { fr: "Quantité", ar: "الكمية", darija: "El kammiya" },
  addToCart: { fr: "Ajouter au panier · {total} DT", ar: "أضف إلى السلة · {total} د.ت", darija: "Zid lel panier · {total} DT" },
  addedToCart: { fr: "Ajouté au panier.", ar: "أضيف إلى السلة.", darija: "Tzad lel panier." },
  seeCart: { fr: "Voir le panier", ar: "شوف السلة", darija: "Chouf el panier" },

  // Scanner
  scannerTitle: { fr: "Scanner un produit", ar: "مسح منتج", darija: "Scanni produit" },
  scannerBody: {
    fr: "Vise le QR code Ardi sur l'étiquette pour voir l'histoire du produit, l'eau économisée et le label.",
    ar: "وجّه الكاميرا نحو رمز أردي على الملصق لترى قصة المنتج والماء الموفر والعلامة.",
    darija: "Wajjah 3al QR Ardi fel etiquette bach tchouf 7kayet el produit, el ma el mwaffar w el label.",
  },
  simulateScan: { fr: "Simuler le scan du QR de démo", ar: "محاكاة مسح رمز العرض", darija: "Simuli scan el QR demo" },
  qrManual: { fr: "Ou saisis le code QR", ar: "أو أدخل رمز QR", darija: "Wala ekteb el code QR" },
  search: { fr: "Rechercher", ar: "بحث", darija: "Lawwej" },
  productDetected: { fr: "Produit détecté · voir la fiche", ar: "تم اكتشاف المنتج · شوف البطاقة", darija: "Produit tel9a · chouf el fiche" },
  qrUnknown: {
    fr: "Ce code QR ne correspond à aucun produit Ardi.",
    ar: "هذا الرمز لا يطابق أي منتج أردي.",
    darija: "Had el QR ma ywafe9 7atta produit Ardi.",
  },
  cameraNote: {
    fr: "Caméra non disponible dans cette version de démo.",
    ar: "الكاميرا غير متوفرة في نسخة العرض هذه.",
    darija: "El camera mich mawjouda f version el demo.",
  },

  // Panier
  cartTitle: { fr: "Mon panier", ar: "سلتي", darija: "Panier mte3i" },
  cartEmpty: { fr: "Ton panier est vide", ar: "سلتك فارغة", darija: "Panier mte3ek fergh" },
  cartEmptyBody: {
    fr: "Ajoute des produits labellisés depuis le marché.",
    ar: "أضف منتجات ذات علامة من السوق.",
    darija: "Zid produits b label men el souk.",
  },
  goMarket: { fr: "Aller au marché", ar: "اذهب إلى السوق", darija: "Emchi lel souk" },
  cartImpact: {
    fr: "Avec cette commande, tu soutiens {eau} m³ d'eau économisée",
    ar: "بهذا الطلب، تدعم {eau} م³ من الماء الموفر",
    darija: "B had el commande, t3awen {eau} m³ ma mwaffar",
  },
  cartImpactNote: {
    fr: "par rapport à des cultures non labellisées (estimation).",
    ar: "مقارنة بزراعات دون علامة (تقدير).",
    darija: "m9arna b cultures bla label (ta9dir).",
  },
  payment: { fr: "Paiement", ar: "الدفع", darija: "Khlass" },
  payDelivery: { fr: "À la livraison", ar: "عند التسليم", darija: "3and el livraison" },
  payCard: { fr: "Carte (simulée)", ar: "بطاقة (تجريبية)", darija: "Carte (simulée)" },
  products: { fr: "Produits", ar: "المنتجات", darija: "Produits" },
  delivery: { fr: "Livraison", ar: "التوصيل", darija: "Livraison" },
  total: { fr: "Total", ar: "المجموع", darija: "El majmou3" },
  order: { fr: "Commander · {total} DT", ar: "اطلب · {total} د.ت", darija: "Commandi · {total} DT" },
  orderDone: { fr: "Commande envoyée", ar: "تم إرسال الطلب", darija: "El commande tba3thet" },
  orderDoneBody: {
    fr: "Commande {id} · {montant} DT. La ferme va la confirmer.",
    ar: "الطلب {id} · {montant} د.ت. الضيعة ستؤكده.",
    darija: "Commande {id} · {montant} DT. El ferma bech t2akkedha.",
  },
  orderError: {
    fr: "La commande n'a pas pu être envoyée. Ton panier est conservé.",
    ar: "تعذر إرسال الطلب. سلتك محفوظة.",
    darija: "El commande ma tba3thetch. Panier mte3ek mazel.",
  },
  remove: { fr: "Retirer", ar: "حذف", darija: "Na77i" },

  // Impact / profil
  buyerSince: { fr: "Acheteur responsable depuis mars", ar: "مشتري مسؤول منذ مارس", darija: "Chari responsable men mars" },
  accountPersonal: { fr: "Particulier", ar: "فردي", darija: "Particulier" },
  accountPro: { fr: "Professionnel", ar: "مهني", darija: "Pro" },
  waterSupported: { fr: "Eau soutenue par tes achats", ar: "الماء المدعوم بمشترياتك", darija: "El ma elli t3awnou b chriwatek" },
  waterSupportedNote: {
    fr: "estimation, par rapport à des produits non labellisés",
    ar: "تقدير، مقارنة بمنتجات دون علامة",
    darija: "ta9dir, m9arna b produits bla label",
  },
  farmsSupported: { fr: "fermes soutenues", ar: "ضيعات مدعومة", darija: "fermat m3awna" },
  labelAShare: { fr: "d'achats label A", ar: "مشتريات بعلامة A", darija: "chriwat label A" },
  ordersCount: { fr: "commandes", ar: "طلبات", darija: "commandes" },
  spent: { fr: "dépensés", ar: "مصروفة", darija: "masrouf" },
  yourFarms: { fr: "Tes fermes", ar: "ضيعاتك", darija: "Fermatek" },
  farmOrders: { fr: "{n} commande(s)", ar: "{n} طلب", darija: "{n} commande" },
  proTitle: { fr: "Compte pro", ar: "حساب مهني", darija: "Compte pro" },
  proBody: {
    fr: "Supermarchés et exportateurs : achats en gros, traçabilité et rapport RSE.",
    ar: "المساحات الكبرى والمصدرون : شراء بالجملة، تتبع وتقرير المسؤولية.",
    darija: "Supermarchés w exportateurs : chri bel gros, traçabilité w rapport RSE.",
  },
  switchPro: { fr: "Passer pro", ar: "انتقل إلى المهني", darija: "Walli pro" },
  downloadReport: { fr: "Télécharger le rapport", ar: "تحميل التقرير", darija: "Telechargi el rapport" },
  settingsLang: { fr: "Réglages et langue", ar: "الإعدادات واللغة", darija: "Reglages w lou8a" },
  logout: { fr: "Se déconnecter", ar: "تسجيل الخروج", darija: "Okhrej" },
} satisfies Record<string, Localized>;
