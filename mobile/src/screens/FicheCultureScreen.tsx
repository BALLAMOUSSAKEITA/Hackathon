import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { LanguageSwitch } from "../components/LanguageSwitch";
import { API_URL, sprint03, type CultureFiche } from "../fixture";
import { formatNumber, useI18n, type CopyKey } from "../i18n";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Fiche">;

const SOLS: Record<string, CopyKey> = {
  sableux: "solSableux",
  limoneux: "solLimoneux",
  argileux: "solArgileux",
  calcaire: "solCalcaire",
  salin: "solSalin",
};

const TOLERANCES: Record<string, CopyKey> = {
  faible: "tolFaible",
  moyenne: "tolMoyenne",
  elevee: "tolElevee",
};

export function FicheCultureScreen({ route }: Props) {
  const { lang, t, direction } = useI18n();
  const locale = sprint03.cultures.find((culture) => culture.id === route.params.cultureId) ?? null;
  const [culture, setCulture] = useState<CultureFiche | null>(locale);
  const align = direction === "rtl" ? "right" : "left";

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/cultures/${route.params.cultureId}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((corps: CultureFiche | null) => {
        if (corps?.nom) {
          setCulture(corps);
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [route.params.cultureId]);

  if (!culture) {
    return null;
  }

  const sols = culture.sols.map((sol) => t(SOLS[sol] ?? "soils")).join(", ");
  const rows: [string, string][] = [
    [t("waterNeed"), `${formatNumber(culture.besoin_eau_m3_ha, lang, 0)} m³/ha`],
    [t("yield"), `${formatNumber(culture.rendement_t_ha, lang, 1)} ${t("perHectare")}`],
    [
      t("priceRange"),
      `${formatNumber(culture.prix.min, lang, 1)} – ${formatNumber(culture.prix.typique, lang, 1)} – ${formatNumber(culture.prix.max, lang, 1)} ${culture.prix.unite}`,
    ],
    [t("costs"), `${formatNumber(culture.couts_dt_ha, lang, 0)} ${t("perHectareDt")}`],
    [t("delay"), culture.delai[lang]],
    [t("soils"), sols],
    [t("salt"), t(TOLERANCES[culture.tolerance_sel])],
    [t("heat"), t(TOLERANCES[culture.tolerance_chaleur])],
    [t("kcLabel"), `${culture.kc.initial} / ${culture.kc.developpement} / ${culture.kc.mi_saison} / ${culture.kc.fin}`],
  ];

  return (
    <ScrollView style={{ direction }} contentContainerStyle={styles.content}>
      <LanguageSwitch />
      <Text style={[styles.title, { textAlign: align }]}>{culture.nom[lang]}</Text>
      <View style={styles.card}>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text style={[styles.value, { textAlign: align }]}>{value}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.note, { textAlign: align }]}>{culture.source_prix[lang]}</Text>
      <Text style={[styles.note, { textAlign: align }]}>{sprint03.hypothese[lang]}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, backgroundColor: colors.bg },
  title: { width: "100%", fontSize: 28, fontWeight: "800", color: colors.ink },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
  },
  row: { minHeight: 44, justifyContent: "center", borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: 8 },
  label: { color: colors.muted, fontSize: 13 },
  value: { width: "100%", color: colors.ink, fontWeight: "700", fontSize: 16 },
  note: { width: "100%", color: colors.muted, lineHeight: 18 },
});
