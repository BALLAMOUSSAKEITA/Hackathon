import { I18nManager } from "react-native";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { ECRAN0 } from "./i18n/ecran0";
import { lireLangue, ecrireLangue } from "./session";
import type { Lang, Localized } from "./types";

const STRINGS = {
  ...ECRAN0,
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
  unitHa: { fr: "ha", ar: "هك", darija: "ha" },
  unitM: { fr: "m", ar: "م", darija: "m" },
  unitFlow: { fr: "m³/h", ar: "م³/س", darija: "m³/h" },
  unitDt: { fr: "DT", ar: "د.ت", darija: "DT" },
} satisfies Record<string, Localized>;

export type CopyKey = keyof typeof STRINGS;

type I18nValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: CopyKey) => string;
  direction: "rtl" | "ltr";
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("fr");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    lireLangue()
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
    ecrireLangue(lang);
    const rtl = lang === "ar";
    I18nManager.allowRTL(true);
    if (I18nManager.isRTL !== rtl) {
      I18nManager.forceRTL(rtl);
    }
  }, [lang, ready]);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      t: (key) => STRINGS[key][lang],
      direction: lang === "ar" ? "rtl" : "ltr",
    }),
    [lang],
  );

  if (!ready) {
    return null;
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
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
