import type { Localized } from "../types";

/** Libellés communs de la refonte : navigation, bienvenue, accueil et parcours agriculteur principal. */
export const APP = {
  // Onglets
  tabHome: { fr: "Accueil", ar: "الرئيسية", darija: "Accueil" },
  tabParcel: { fr: "Parcelle", ar: "القطعة", darija: "Parcelle" },
  tabAdvice: { fr: "Conseils", ar: "نصائح", darija: "Nsay7" },
  tabAssistant: { fr: "Assistant", ar: "المساعد", darija: "Assistant" },
  tabLabel: { fr: "Label", ar: "العلامة", darija: "Label" },
  tabMarket: { fr: "Marché", ar: "السوق", darija: "Souk" },
  tabScan: { fr: "Scanner", ar: "مسح", darija: "Scanner" },
  tabCart: { fr: "Panier", ar: "السلة", darija: "Panier" },
  tabProfile: { fr: "Profil", ar: "الملف", darija: "Profil" },

  // Commun
  retry: { fr: "Réessayer", ar: "أعد المحاولة", darija: "3awed" },
  offline: {
    fr: "Hors connexion : données d'exemple affichées.",
    ar: "دون اتصال : تُعرض بيانات المثال.",
    darija: "Bla connexion : data exemple.",
  },
  networkError: {
    fr: "L'API ne répond pas. Vérifie la connexion puis réessaie.",
    ar: "الواجهة لا تجيب. تحقق من الاتصال ثم أعد المحاولة.",
    darija: "El API ma tjawbech. Chouf el connexion w 3awed.",
  },
  loading: { fr: "Chargement…", ar: "جار التحميل…", darija: "9a3ed ychargi…" },
  seeAll: { fr: "Tout voir", ar: "عرض الكل", darija: "Chouf kol chay" },
  perSeason: { fr: "par saison", ar: "في الموسم", darija: "fel mousem" },
  more: { fr: "Plus", ar: "المزيد", darija: "Akther" },

  // Bienvenue
  heroTitle: {
    fr: "La bonne culture sur la bonne terre.",
    ar: "الزراعة المناسبة للأرض المناسبة.",
    darija: "El culture el mnasba lel ard el mnasba.",
  },
  heroBody: {
    fr: "Gagne plus avec moins d'eau et moins d'électricité, et fais-le savoir à tes acheteurs.",
    ar: "اربح أكثر بماء وكهرباء أقل، وعرّف مشتريك بذلك.",
    darija: "Erba7 akther b ma w dhaw a9al, w khalli el chariya ya3rfou.",
  },
  point1: { fr: "Analyse ta terre par satellite", ar: "حلّل أرضك بالقمر الصناعي", darija: "7allel ardek bel satellite" },
  point2: {
    fr: "Choisis la culture la plus rentable par m³",
    ar: "اختر الزراعة الأكثر ربحا لكل م³",
    darija: "Ekhtar el culture elli tjib akther flous lel m³",
  },
  point3: { fr: "Obtiens un label et vends mieux", ar: "احصل على علامة وبِع أفضل", darija: "Khoudh label w bi3 khir" },
  chooseLang: { fr: "Choisis ta langue", ar: "اختر لغتك", darija: "Ekhtar lou8tek" },
  iAmFarmer: { fr: "Je suis agriculteur", ar: "أنا فلاح", darija: "Ana fellah" },
  iAmBuyer: { fr: "Je suis acheteur", ar: "أنا مشتري", darija: "Ana chari" },
  demoLogin: {
    fr: "Connexion de démo par SMS, code fixe.",
    ar: "دخول تجريبي برسالة، رمز ثابت.",
    darija: "Connexion demo b SMS, code thebet.",
  },

  // Accueil agriculteur
  hello: { fr: "Bonjour,", ar: "صباح الخير،", darija: "Sbah el khir," },
  potentialTitle: {
    fr: "Ta ferme peut obtenir le Label Eau",
    ar: "ضيعتك تنجم تحصل على علامة الماء",
    darija: "Fermtek tnajjem ta7sel Label Ma",
  },
  potentialBody: {
    fr: "En remplaçant la {culture} : {eau} m³ d'eau et {kwh} kWh économisés chaque saison.",
    ar: "بتعويض {culture} : {eau} م³ ماء و{kwh} ك.واط.س موفرة كل موسم.",
    darija: "Ki tbaddel {culture} : {eau} m³ ma w {kwh} kWh tewaffarhom kol mousem.",
  },
  seeReco: { fr: "Voir les recommandations", ar: "شوف التوصيات", darija: "Chouf el nsay7" },
  currentSeason: { fr: "Ta saison actuelle", ar: "موسمك الحالي", darija: "Mousmek tawa" },
  waterSeason: { fr: "Eau / saison", ar: "ماء / موسم", darija: "Ma / mousem" },
  pumping: { fr: "Pompage", ar: "الضخ", darija: "Pompage" },
  revenueEst: { fr: "Revenu estimé", ar: "الدخل المقدر", darija: "Dakhl mta9addar" },
  quickActions: { fr: "Raccourcis", ar: "اختصارات", darija: "Raccourcis" },
  shortAnalysis: { fr: "Analyse", ar: "التحليل", darija: "Tahlil" },
  shortSim: { fr: "Simulateur", ar: "المحاكي", darija: "Simulateur" },
  shortSolar: { fr: "Solaire", ar: "الطاقة الشمسية", darija: "Solaire" },
  shortTracking: { fr: "Suivi", ar: "المتابعة", darija: "Suivi" },
  shortSales: { fr: "Ventes", ar: "المبيعات", darija: "Bi3at" },
  shortCrops: { fr: "Cultures", ar: "الزراعات", darija: "Cultures" },
  notifUnread: { fr: "{n} notifications non lues", ar: "{n} إشعارات غير مقروءة", darija: "{n} notifications ma t9rawech" },
  profileSettings: { fr: "Profil et réglages", ar: "الملف والإعدادات", darija: "Profil w réglages" },
  tipTitle: { fr: "Conseil du jour", ar: "نصيحة اليوم", darija: "Nasi7a el youm" },
  tipBody: {
    fr: "Pompe entre 11 h et 15 h, quand le soleil est au plus haut, puis arrose le soir au goutte-à-goutte : moins d'évaporation.",
    ar: "اضخ بين 11 و15 لما تكون الشمس في أعلاها، ثم اسقِ مساء بالتقطير : تبخر أقل.",
    darija: "Pompi bin 11 w 15 ki tkoun el chams fou9, w osgi fel 3chiya bel goutte-à-goutte : a9al tabakhor.",
  },
  seeTracking: { fr: "Voir le suivi satellite", ar: "شوف المتابعة بالقمر", darija: "Chouf el suivi satellite" },

  // Parcelle
  parcelTitle: { fr: "Ma parcelle", ar: "قطعتي", darija: "Parcelti" },
  parcelDrawn: { fr: "Parcelle tracée", ar: "قطعة مرسومة", darija: "Parcelle mrasma" },
  parcelDrawing: { fr: "Tracé en cours", ar: "الرسم جار", darija: "Tracé 9a3ed" },
  corners: { fr: "coins", ar: "زوايا", darija: "coinat" },
  redraw: { fr: "Redessiner", ar: "إعادة الرسم", darija: "3awed orsom" },
  talkWater: { fr: "Parle-nous de ton eau", ar: "احكيلنا على الماء متاعك", darija: "A7kilna 3al ma mte3ek" },
  talkWaterBody: {
    fr: "Le sol et le climat, on s'en occupe par satellite.",
    ar: "التربة والمناخ نتكفلو بيهم بالقمر الصناعي.",
    darija: "El torba w el climat, n9oumou bihom bel satellite.",
  },
  undoPoint: { fr: "Annuler le dernier coin", ar: "إلغاء آخر زاوية", darija: "Na77i ekher coin" },
  energySource: { fr: "Énergie de la pompe", ar: "طاقة المضخة", darija: "Energie el pompe" },
  savedThenAnalyse: {
    fr: "Parcelle enregistrée. Lance l'analyse de ta terre.",
    ar: "القطعة تسجلت. ابدأ تحليل أرضك.",
    darija: "El parcelle t-sajlet. Ebda tahlil ardek.",
  },
  wellDepth: { fr: "Profondeur du puits", ar: "عمق البئر", darija: "3om9 el bir" },
  pumpFlow: { fr: "Débit de la pompe", ar: "تدفق المضخة", darija: "Debit el pompe" },
  photoHint: { fr: "L'IA affine l'analyse de texture", ar: "الذكاء الاصطناعي يدقق تحليل القوام", darija: "El IA tdaqqe9 tahlil el texture" },
  analyseMyLand: { fr: "Analyser ma terre", ar: "حلّل أرضي", darija: "7allel ardi" },
  invalidNumbers: {
    fr: "Indique une profondeur et un débit valables.",
    ar: "أدخل عمقا وتدفقا صالحين.",
    darija: "Hot 3om9 w debit shah.",
  },

  // Analyse
  analysisTitle: { fr: "Analyse de ta terre", ar: "تحليل أرضك", darija: "Tahlil ardek" },
  soil: { fr: "Sol", ar: "التربة", darija: "Torba" },
  climate: { fr: "Climat", ar: "المناخ", darija: "Climat" },
  water: { fr: "Eau", ar: "الماء", darija: "Ma" },
  ndviTitle: { fr: "Santé de la végétation (NDVI)", ar: "صحة الغطاء النباتي (NDVI)", darija: "Sa7t el nabet (NDVI)" },
  seeCrops: { fr: "Voir les cultures recommandées", ar: "شوف الزراعات المقترحة", darija: "Chouf el cultures el mo9tar7a" },
  seeSolar: { fr: "Voir la pompe solaire", ar: "شوف المضخة الشمسية", darija: "Chouf el pompe solaire" },
  sources: { fr: "Sources", ar: "المصادر", darija: "Sources" },
  pumpToLift: { fr: "pour pomper 1 m³", ar: "لضخ 1 م³", darija: "bach tpompi 1 m³" },

  // Que planter
  plantTitle: { fr: "Que planter ?", ar: "شنو نزرع؟", darija: "Chnou nezra3?" },
  plantSubtitle: {
    fr: "Adapté à ton sol, ton puits et ton climat",
    ar: "مناسب لتربتك وبئرك ومناخك",
    darija: "Mnaseb l torbtek, birek w climatek",
  },
  perM3Water: { fr: "par m³ d'eau", ar: "لكل م³ ماء", darija: "lel m³ ma" },
  production: { fr: "Production", ar: "الإنتاج", darija: "Intaj" },
  simulateMix: { fr: "Simuler un mélange de cultures", ar: "حاكي خليط زراعات", darija: "Simuli khlit cultures" },
  notSuited: { fr: "Ne convient pas : {motifs}", ar: "غير مناسبة : {motifs}", darija: "Ma tnasebch : {motifs}" },
  whyThis: { fr: "Pourquoi ?", ar: "علاش؟", darija: "3lech?" },
  yourCrop: { fr: "Ta culture actuelle", ar: "زراعتك الحالية", darija: "Culturtek tawa" },

  // Simulateur
  simTitle: { fr: "Simulateur", ar: "المحاكي", darija: "Simulateur" },
  simSubtitle: {
    fr: "Répartis tes {ha} ha et vois le résultat",
    ar: "وزّع {ha} هك وشوف النتيجة",
    darija: "Wazza3 {ha} ha w chouf el natija",
  },
  surfaceUsed: { fr: "Surface utilisée", ar: "المساحة المستعملة", darija: "Mesa7a mesta3mla" },
  resultMaturity: { fr: "Résultat à maturité", ar: "النتيجة عند النضج", darija: "Natija 3and el nodj" },
  revenue: { fr: "Revenu", ar: "الدخل", darija: "Dakhl" },
  wellCapacity: { fr: "Capacité de ton puits", ar: "طاقة بئرك", darija: "Ta9et birek" },
  comparedToday: {
    fr: "Comparé à aujourd'hui : {ha} ha de {culture}, label {label}.",
    ar: "مقارنة باليوم : {ha} هك {culture}، علامة {label}.",
    darija: "M9arna b tawa : {ha} ha {culture}, label {label}.",
  },
  vsToday: { fr: "vs aujourd'hui", ar: "مقارنة باليوم", darija: "m9arna b tawa" },
  surfaceOver: {
    fr: "Tu dépasses la surface de la parcelle.",
    ar: "تجاوزت مساحة القطعة.",
    darija: "Fett mesa7t el parcelle.",
  },
  wellOver: {
    fr: "Ce plan demande plus d'eau que ton puits.",
    ar: "هذه الخطة تطلب ماء أكثر من بئرك.",
    darija: "Had el plan yest7a9 ma akther men birek.",
  },
  planAdopted: {
    fr: "Plan adopté : label {label}, {dt} DT/m³.",
    ar: "الخطة معتمدة : علامة {label}، {dt} د.ت/م³.",
    darija: "Plan t-adopta : label {label}, {dt} DT/m³.",
  },
  emptyPlan: { fr: "Ajoute au moins une culture.", ar: "أضف زراعة واحدة على الأقل.", darija: "Zid culture wa7da 3al a9al." },

  // Assistant
  assistantTitle: { fr: "Assistant Ardi", ar: "مساعد أردي", darija: "Assistant Ardi" },
  assistantSubtitle: {
    fr: "Parle en darija ou en français",
    ar: "تكلم بالدارجة أو بالفرنسية",
    darija: "A7ki b derja wala b fransawi",
  },
  assistantIntro: {
    fr: "Pose une question sur ta parcelle : surface, puits, eau, meilleure culture…",
    ar: "اسأل على قطعتك : المساحة، البئر، الماء، أفضل زراعة…",
    darija: "Es2el 3la parceltek : mesa7a, bir, ma, a7sen culture…",
  },
  message: { fr: "Message", ar: "رسالة", darija: "Message" },
  listen: { fr: "Écouter", ar: "استمع", darija: "Esma3" },
  suggestions: { fr: "Questions fréquentes", ar: "أسئلة متكررة", darija: "As2la tetkarrer" },
  openSimulator: { fr: "Ouvrir dans le simulateur", ar: "افتح في المحاكي", darija: "7ell fel simulateur" },
  openSolar: { fr: "Voir l'énergie solaire", ar: "شوف الطاقة الشمسية", darija: "Chouf el solaire" },
  thinking: { fr: "Ardi réfléchit…", ar: "أردي يفكر…", darija: "Ardi ykhammem…" },
  offTopic: { fr: "Hors sujet", ar: "خارج الموضوع", darija: "Bara el sujet" },

  // Label Eau
  myLabel: { fr: "Mon label", ar: "علامتي", darija: "Label mte3i" },
  labelArdi: { fr: "Label Ardi", ar: "علامة أردي", darija: "Label Ardi" },
  labelEauTitle: { fr: "Label Eau", ar: "علامة الماء", darija: "Label Ma" },
  noLabel: { fr: "Sans label", ar: "بدون علامة", darija: "Bla label" },
  labelEauActive: { fr: "Ta ferme a le Label Eau", ar: "ضيعتك حاصلة على علامة الماء", darija: "Fermtek 3andha Label Ma" },
  labelEauPotential: { fr: "Ta ferme peut obtenir le Label Eau", ar: "ضيعتك تنجم تحصل على علامة الماء", darija: "Fermtek tnajjem ta7sel Label Ma" },
  waterSaved: { fr: "d'eau économisés / saison", ar: "ماء موفر / موسم", darija: "ma mwaffar / mousem" },
  energySaved: { fr: "d'énergie économisés / saison", ar: "طاقة موفرة / موسم", darija: "energie mwaffra / mousem" },
  satelliteCheck: { fr: "Vérification par satellite", ar: "التحقق بالقمر الصناعي", darija: "Verification bel satellite" },
  qrTitle: { fr: "QR code de tes produits", ar: "رمز QR لمنتجاتك", darija: "QR mta3 produits mte3ek" },
  buyerView: { fr: "Voir ce que voit l'acheteur", ar: "شوف شنو يرى المشتري", darija: "Chouf chnou ychouf el chari" },
  manageSales: { fr: "Gérer mes ventes", ar: "تصرف في مبيعاتي", darija: "Dabber bi3ati" },
  labelActive: { fr: "Actif", ar: "نشطة", darija: "Actif" },
  labelSuspended: { fr: "Suspendu", ar: "معلقة", darija: "Mwaqqef" },
  labelChecking: { fr: "En vérification", ar: "قيد التحقق", darija: "Fel verification" },
  labelScale: {
    fr: "A ≥ 2,2 DT/m³ · B ≥ 1,5 · C ≥ 1,1 · D ≥ 0,8 · E en dessous",
    ar: "A ≥ 2,2 د.ت/م³ · B ≥ 1,5 · C ≥ 1,1 · D ≥ 0,8 · E أقل",
    darija: "A ≥ 2,2 DT/m³ · B ≥ 1,5 · C ≥ 1,1 · D ≥ 0,8 · E ta7t",
  },
} satisfies Record<string, Localized>;
