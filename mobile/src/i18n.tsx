import { I18nManager } from "react-native";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { ACHETEUR } from "./i18n/acheteur";
import { APP } from "./i18n/app";
import { ECRAN0 } from "./i18n/ecran0";
import { MAQUETTE_A } from "./i18n/maquetteA";
import { MAQUETTE_B } from "./i18n/maquetteB";
import { MAQUETTE_C } from "./i18n/maquetteC";
import { MAQUETTE_D } from "./i18n/maquetteD";
import { SUITE } from "./i18n/suite";
import { lireLangue, ecrireLangue } from "./session";
import type { Lang, Localized } from "./types";

const STRINGS = {
  ...ECRAN0,
  ...APP,
  ...ACHETEUR,
  ...SUITE,
  ...MAQUETTE_A,
  ...MAQUETTE_B,
  ...MAQUETTE_C,
  ...MAQUETTE_D,
  tagline: {
    fr: "La bonne culture sur la bonne terre",
    ar: "الزراعة المناسبة للأرض المناسبة",
    darija: "El culture l-mnasba 3al ard l-mnasba",
  },
  farm: { fr: "Ferme", ar: "الضيعة", darija: "El ferma" },
  region: { fr: "Région", ar: "الجهة", darija: "El jiha" },
  parcel: { fr: "Parcelle", ar: "القطعة", darija: "El parcelle" },
  surface: { fr: "Surface", ar: "المساحة", darija: "El mesa7a" },
  well: { fr: "Puits", ar: "البئر", darija: "El bir" },
  flow: { fr: "Débit", ar: "التدفق", darija: "El debit" },
  energy: { fr: "Énergie", ar: "الطاقة", darija: "El energie" },
  crop: { fr: "Culture actuelle", ar: "الزراعة الحالية", darija: "El culture l-7alya" },
  product: { fr: "Produit", ar: "المنتج", darija: "El produit" },
  price: { fr: "Prix", ar: "السعر", darija: "Es-sa3er" },
  stock: { fr: "Stock", ar: "المخزون", darija: "El stock" },
  label: { fr: "Label", ar: "العلامة", darija: "El label" },
  example: { fr: "exemple", ar: "مثال", darija: "exemple" },
  hypothesis: { fr: "Hypothèse", ar: "فرضية", darija: "Hypothese" },
  emptyBody: {
    fr: "Cette coquille est prête. Le contenu de cet écran arrive avec son sprint.",
    ar: "هذه الهيكلة جاهزة. محتوى هذه الشاشة يصل مع سبرنتها.",
    darija: "Had l-coquille wajda. Contenu el ecran yiji m3a sprintou.",
  },
  buyerBody: {
    fr: "Le parcours acheteur s'ouvre ici. Le marché, le scan et le panier arrivent avec leur sprint.",
    ar: "مسار المشتري يفتح هنا. السوق والمسح والسلة تصل مع سبرنتها.",
    darija: "Masar el chari yot7el hna. Es-souk, el scan w el panier yijiw m3a sprint-hom.",
  },
  scenario: { fr: "Scénario de démo", ar: "سيناريو العرض", darija: "Scenario demo" },
  apiOk: { fr: "L'API répond", ar: "الواجهة تجيب", darija: "El API tjaweb" },
  apiFile: {
    fr: "Ferme lue dans fixtures/sprint-01.json",
    ar: "الضيعة مقروءة من fixtures/sprint-01.json",
    darija: "El ferma ma9rouya men fixtures/sprint-01.json",
  },
  gasoil: { fr: "Gasoil", ar: "غازوال", darija: "Gasoil" },
  reseau: { fr: "Réseau STEG", ar: "شبكة ستاغ", darija: "Reseau STEG" },
  solaire: { fr: "Solaire", ar: "شمسي", darija: "Solaire" },
  puits: { fr: "Puits", ar: "بئر", darija: "Bir" },
  gda: { fr: "GDA ou barrage", ar: "مجمع أو سد", darija: "GDA wala sadd" },
  reseauEau: { fr: "Réseau", ar: "شبكة", darija: "Reseau" },
  waterSource: { fr: "Source d'eau", ar: "مصدر الماء", darija: "Source el ma" },
  drawHint: {
    fr: "Touchez la carte pour poser les coins, puis fermez le tracé.",
    ar: "المس الخريطة لوضع الزوايا، ثم أغلق الرسم.",
    darija: "Dos 3al carte bach t7ot el coinat, w sakker el tracé.",
  },
  closeShape: { fr: "Fermer le tracé", ar: "إغلاق الرسم", darija: "Sakker el tracé" },
  clearShape: { fr: "Effacer", ar: "مسح", darija: "Emsa7" },
  loadDemo: { fr: "Charger la parcelle de démo", ar: "تحميل قطعة العرض", darija: "Charge el parcelle demo" },
  saveParcel: { fr: "Enregistrer la parcelle", ar: "تسجيل القطعة", darija: "Sajjel el parcelle" },
  parcelSaved: { fr: "Parcelle enregistrée.", ar: "القطعة تسجلت.", darija: "El parcelle t-sajlet." },
  adoptPlan: { fr: "Adopter ce plan", ar: "اعتماد هذه الخطة", darija: "Tbenna had el plan" },
  planRefused: {
    fr: "Ce plan dépasse la parcelle ou le puits. Il n'est pas enregistré.",
    ar: "هذه الخطة تتجاوز القطعة أو البئر. لم تُسجَّل.",
    darija: "Had el plan yfout el parcelle wala el bir. Ma t-sajjelch.",
  },
  surfaceSame: {
    fr: "La surface affichée est celle renvoyée par l'API.",
    ar: "المساحة المعروضة هي التي رجعتها الواجهة.",
    darija: "El mesa7a elli tetwarra hiya elli raj3etha el API.",
  },
  needPoints: {
    fr: "Il faut au moins trois coins.",
    ar: "يلزم ثلاث زوايا على الأقل.",
    darija: "Lazem 3 coinat 3al a9al.",
  },
  polygonInvalid: {
    fr: "Ce tracé n'est pas un polygone valable.",
    ar: "هذا الرسم ليس مضلعا صالحا.",
    darija: "Had el tracé ma hwach polygone shih.",
  },
  photoSoil: { fr: "Photo du sol, facultative", ar: "صورة التربة، اختيارية", darija: "Taswira el torba, ikhtiyari" },
  photoReady: { fr: "Photo prête", ar: "الصورة جاهزة", darija: "El taswira wajda" },
  photoIgnored: {
    fr: "Photo ignorée, la parcelle est quand même enregistrée.",
    ar: "الصورة تُركت، والقطعة تسجلت رغم ذلك.",
    darija: "El taswira t-khallet, el parcelle t-sajlet meme hekka.",
  },
  parcelOffline: {
    fr: "L'API ne répond pas. La surface reste celle calculée sur le téléphone.",
    ar: "الواجهة لا تجيب. المساحة تبقى المحسوبة على الهاتف.",
    darija: "El API ma tjawbech. El mesa7a teb9a elli tethsbet 3al telephone.",
  },
  relaunch: { fr: "Relancer l'analyse", ar: "إعادة التحليل", darija: "3awed el tahlil" },
  loadingAnalysis: { fr: "Analyse en cours…", ar: "التحليل جار…", darija: "El tahlil 9a3ed…" },
  analysisError: {
    fr: "L'API ne répond pas. L'analyse affichée est celle du fichier.",
    ar: "الواجهة لا تجيب. التحليل المعروض هو تحليل الملف.",
    darija: "El API ma tjawbech. El tahlil elli tetwarra howa mta3 el fichier.",
  },
  texture: { fr: "Texture", ar: "القوام", darija: "El texture" },
  ph: { fr: "pH", ar: "الحموضة", darija: "pH" },
  organic: { fr: "Matière organique", ar: "المادة العضوية", darija: "El madde organique" },
  rain: { fr: "Pluie", ar: "المطر", darija: "El chtar" },
  temperature: { fr: "Température", ar: "الحرارة", darija: "El 7arara" },
  et0: { fr: "ET0", ar: "ET0", darija: "ET0" },
  sunshine: { fr: "Ensoleillement", ar: "التشمس", darija: "El chams" },
  waterAvailable: { fr: "Eau disponible", ar: "الماء المتاح", darija: "El ma el moujoued" },
  energyPerM3: { fr: "Énergie", ar: "الطاقة", darija: "El energie" },
  frozenExample: { fr: "exemple figé", ar: "مثال مثبّت", darija: "exemple mthabbet" },
  sand: { fr: "sable", ar: "رمل", darija: "raml" },
  silt: { fr: "limon", ar: "طمي", darija: "limon" },
  clay: { fr: "argile", ar: "طين", darija: "tin" },
  sortRevenue: { fr: "Revenu / m³", ar: "الدخل / م³", darija: "Revenu / m³" },
  sortWater: { fr: "Eau", ar: "الماء", darija: "El ma" },
  sortDelay: { fr: "Rapidité", ar: "السرعة", darija: "El sor3a" },
  gap: { fr: "Écart avec la meilleure", ar: "الفرق مع الأفضل", darija: "El far9 m3a el a7sen" },
  excludedCrop: { fr: "Culture actuelle exclue", ar: "الزراعة الحالية مستبعدة", darija: "El culture l-7alya t-khallet" },
  bestOption: { fr: "Meilleure option", ar: "أفضل خيار", darija: "A7sen khtiyar" },
  intercrop: { fr: "Culture intercalaire", ar: "زراعة بينية", darija: "Culture bin el sdar" },
  reasonSoil: { fr: "sol", ar: "تربة", darija: "torba" },
  reasonSalt: { fr: "sel", ar: "ملح", darija: "mel7" },
  reasonHeat: { fr: "chaleur", ar: "حرارة", darija: "skhana" },
  reasonWater: { fr: "eau", ar: "ماء", darija: "ma" },
  compatibleCount: { fr: "cultures compatibles", ar: "زراعات مناسبة", darija: "cultures mnasbin" },
  unitHa: { fr: "ha", ar: "هك", darija: "ha" },
  unitM: { fr: "m", ar: "م", darija: "m" },
  unitFlow: { fr: "m³/h", ar: "م³/س", darija: "m³/h" },
  unitDt: { fr: "DT", ar: "د.ت", darija: "DT" },
} satisfies Record<string, Localized>;

export type CopyKey = keyof typeof STRINGS;

type I18nValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: CopyKey, params?: Record<string, string | number>) => string;
  /** Texte localisé venant des données (fixtures ou API). */
  tx: (texte: Localized | string | null | undefined) => string;
  direction: "rtl" | "ltr";
  align: "left" | "right";
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("fr");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    lireLangue()
      .catch(() => null)
      .then((saved) => {
        if (saved) {
          setLang(saved);
        }
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    void ecrireLangue(lang).catch(() => undefined);
    // Le sens de lecture est porté par le style `direction` de chaque écran.
    // On neutralise le RTL natif, qui ne s'applique qu'après redémarrage et doublerait l'inversion.
    if (I18nManager.isRTL) {
      I18nManager.allowRTL(false);
      I18nManager.forceRTL(false);
    }
  }, [lang, ready]);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      t: (key, params) => remplir(STRINGS[key][lang], params),
      tx: (texte) => (texte == null ? "" : typeof texte === "string" ? texte : texte[lang] ?? texte.fr),
      direction: lang === "ar" ? "rtl" : "ltr",
      align: lang === "ar" ? "right" : "left",
    }),
    [lang],
  );

  if (!ready) {
    return null;
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function remplir(texte: string, params?: Record<string, string | number>): string {
  if (!params) {
    return texte;
  }
  return texte.replace(/\{(\w+)\}/g, (entier, cle: string) => (cle in params ? String(params[cle]) : entier));
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n hors I18nProvider");
  }
  return value;
}

export function formatNumber(value: number, lang: Lang, digits: number): string {
  const locale = lang === "ar" ? "ar-TN" : "fr-TN";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
