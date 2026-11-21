import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { LanguageSwitch } from "../components/LanguageSwitch";
import { Tap } from "../components/Tap";
import { API_URL, fixture } from "../fixture";
import { formatNumber, useI18n } from "../i18n";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const { lang, t, direction } = useI18n();
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const parcelle = fixture.parcelle;
  const produit = fixture.produit;

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    fetch(`${API_URL}/health`, { signal: controller.signal })
      .then((response) => setApiOk(response.ok))
      .catch(() => setApiOk(false))
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const align = direction === "rtl" ? "right" : "left";
  const rows = [
    [t("region"), fixture.ferme.region],
    [t("parcel"), parcelle.nom],
    [t("surface"), `${formatNumber(parcelle.surface_ha, lang, 1)} ${t("unitHa")}`],
    [t("well"), `${formatNumber(parcelle.profondeur_puits_m, lang, 0)} ${t("unitM")}`],
    [t("flow"), `${formatNumber(parcelle.debit_m3_h, lang, 0)} ${t("unitFlow")}`],
    [t("energy"), t(parcelle.energie)],
    [t("crop"), parcelle.culture_actuelle.nom[lang]],
    [t("product"), produit.nom[lang]],
    [t("price"), `${formatNumber(produit.prix_dt, lang, 1)} ${t("unitDt")}`],
    [t("stock"), `${formatNumber(produit.stock, lang, 0)} ${produit.unite}`],
    [t("label"), `${produit.label.note} · ${t("example")}`],
  ];

  return (
    <SafeAreaView style={[styles.safe, { direction }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {navigation.canGoBack() ? (
          <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={[styles.backText, { textAlign: align }]}>{t("back")}</Text>
          </Pressable>
        ) : null}
        <Text style={[styles.mark, { textAlign: align }]}>Ardi</Text>
        <Text style={[styles.tagline, { textAlign: align }]}>{t("tagline")}</Text>
        <Text style={[styles.section, { textAlign: align }]}>{t("chooseLanguage")}</Text>
        <LanguageSwitch />

        <View style={styles.card}>
          <Text style={[styles.eyebrow, { textAlign: align }]}>{t("farm")}</Text>
          <Text style={[styles.farmName, { textAlign: align }]}>{fixture.ferme.nom}</Text>
          <Text style={[styles.owner, { textAlign: align }]}>{fixture.ferme.agriculteur.nom}</Text>
          {rows.map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text style={styles.rowLabel}>{label}</Text>
              <Text style={styles.rowValue}>{value}</Text>
            </View>
          ))}
          <Text style={styles.note}>
            {t("hypothesis")} — {produit.label.hypothese[lang]}
          </Text>
          <Text style={styles.note}>{fixture.hypotheses[0][lang]}</Text>
        </View>

        <Text style={styles.api}>
          {apiOk ? t("apiOk") : t("apiFile")}
        </Text>

        <Tap label={t("farmer")} onPress={() => navigation.navigate("Farmer")} />
        <Tap label={t("screen2")} variant="secondary" onPress={() => navigation.navigate("Parcelle")} />
        <Tap label={t("screen3")} variant="secondary" onPress={() => navigation.navigate("Analyse")} />
        <Tap label={t("culturesTitle")} variant="secondary" onPress={() => navigation.navigate("Cultures")} />
        <Tap label={t("buyer")} variant="secondary" onPress={() => navigation.navigate("Buyer")} />

        <Text style={[styles.section, { textAlign: align }]}>{t("scenario")}</Text>
        {fixture.scenario.map((step) => (
          <View key={step.etape} style={styles.step}>
            <View style={styles.stepIndex}>
              <Text style={styles.stepIndexText}>{step.etape}</Text>
            </View>
            <Text style={styles.stepText}>{step.texte[lang]}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  back: {
    alignSelf: "flex-start",
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
  },
  backText: {
    width: "100%",
    color: colors.olive,
    fontWeight: "700",
    fontSize: 16,
  },
  mark: {
    width: "100%",
    fontSize: 36,
    fontWeight: "800",
    color: colors.olive,
  },
  tagline: {
    width: "100%",
    fontSize: 16,
    color: colors.ink,
    marginBottom: 8,
  },
  section: {
    width: "100%",
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  eyebrow: {
    width: "100%",
    color: colors.clay,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },
  farmName: {
    width: "100%",
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink,
  },
  owner: {
    width: "100%",
    color: colors.muted,
    marginBottom: 4,
  },
  row: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  rowLabel: {
    color: colors.muted,
    flex: 1,
  },
  rowValue: {
    color: colors.ink,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "auto",
  },
  note: {
    width: "100%",
    textAlign: "auto",
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginVertical: 8,
  },
  api: {
    width: "100%",
    textAlign: "auto",
    color: colors.olive,
    fontWeight: "600",
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 44,
  },
  stepIndex: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.oliveSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  stepIndexText: {
    color: colors.olive,
    fontWeight: "800",
  },
  stepText: {
    flex: 1,
    color: colors.ink,
    fontSize: 15,
  },
});
