import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { LanguageSwitch } from "../components/LanguageSwitch";
import { API_URL, sprint06 } from "../fixture";
import { formatNumber, useI18n, type CopyKey } from "../i18n";
import type { RootStackParamList } from "../navigation/types";
import type { Localized } from "../types";
import { colors, tap } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Planter">;
type Tri = "revenu" | "eau" | "delai";

type Ligne = {
  id: string;
  nom: Localized;
  dt_m3: number;
  eau_m3_ha: number;
  kwh_ha: number;
  delai: Localized;
  label: string;
  intercalaire: boolean;
  pourquoi: Localized;
};

type Classement = {
  tri: Tri;
  cultures: Ligne[];
  culture_actuelle: {
    nom: Localized;
    incluse: boolean;
    motifs: string[];
    ecart_dt_m3: number | null;
    meilleure: Localized | null;
  };
};

const TRIS: { id: Tri; label: CopyKey }[] = [
  { id: "revenu", label: "sortRevenue" },
  { id: "eau", label: "sortWater" },
  { id: "delai", label: "sortDelay" },
];

const MOTIFS: Record<string, CopyKey> = {
  sol: "reasonSoil",
  sel: "reasonSalt",
  chaleur: "reasonHeat",
  eau: "reasonWater",
};

export function PlanterScreen(_props: Props) {
  const { lang, t, direction } = useI18n();
  const [tri, setTri] = useState<Tri>("revenu");
  const [classement, setClassement] = useState<Classement | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);
  const align = direction === "rtl" ? "right" : "left";

  useEffect(() => {
    const controller = new AbortController();
    setChargement(true);
    setErreur(false);
    fetch(`${API_URL}/parcelles/${sprint06.parcelle_id}/recommandations?tri=${tri}`, { signal: controller.signal })
      .then((reponse) => {
        if (!reponse.ok) {
          throw new Error("classement");
        }
        return reponse.json();
      })
      .then((corps: Classement) => setClassement(corps))
      .catch((erreurFetch: Error) => {
        if (erreurFetch.name !== "AbortError") {
          setErreur(true);
          setClassement(null);
        }
      })
      .finally(() => setChargement(false));
    return () => controller.abort();
  }, [tri]);

  const actuelle = classement?.culture_actuelle;
  const motifs = actuelle?.motifs.map((motif) => t(MOTIFS[motif] ?? "reasonSoil")).join(", ");

  return (
    <ScrollView style={{ direction }} contentContainerStyle={styles.content}>
      <LanguageSwitch />
      <Text style={[styles.title, { textAlign: align }]}>{t("screen4")}</Text>
      <View style={styles.choices}>
        {TRIS.map((choix) => (
          <Pressable
            key={choix.id}
            accessibilityRole="button"
            onPress={() => setTri(choix.id)}
            style={[styles.choice, tri === choix.id && styles.choiceOn]}
          >
            <Text style={[styles.choiceText, tri === choix.id && styles.choiceTextOn]}>{t(choix.label)}</Text>
          </Pressable>
        ))}
      </View>
      {chargement ? <Text style={[styles.status, { textAlign: align }]}>{t("loadingAnalysis")}</Text> : null}
      {erreur ? <Text style={[styles.erreur, { textAlign: align }]}>{t("analysisError")}</Text> : null}

      {actuelle ? (
        <View style={styles.banner}>
          <Text style={[styles.bannerTitle, { textAlign: align }]}>{t("crop")}</Text>
          <Text style={[styles.bannerName, { textAlign: align }]}>{actuelle.nom[lang]}</Text>
          {actuelle.incluse ? (
            <Text style={[styles.bannerText, { textAlign: align }]}>
              {t("gap")} {formatNumber(actuelle.ecart_dt_m3 ?? 0, lang, 2)} DT/m³
            </Text>
          ) : (
            <Text style={[styles.bannerText, { textAlign: align }]}>
              {t("excludedCrop")} · {motifs}
            </Text>
          )}
          {actuelle.meilleure ? (
            <Text style={[styles.bannerText, { textAlign: align }]}>
              {t("bestOption")} · {actuelle.meilleure[lang]}
            </Text>
          ) : null}
        </View>
      ) : null}

      {classement ? (
        <Text style={[styles.count, { textAlign: align }]}>
          {classement.cultures.length} {t("compatibleCount")}
        </Text>
      ) : null}

      {classement?.cultures.map((culture, index) => (
        <View key={culture.id} style={styles.card}>
          <View style={styles.ligne}>
            <Text style={styles.rang}>{index + 1}</Text>
            <View style={styles.corps}>
              <Text style={[styles.nom, { textAlign: align }]}>{culture.nom[lang]}</Text>
              {culture.intercalaire ? <Text style={[styles.badge, { textAlign: align }]}>{t("intercrop")}</Text> : null}
            </View>
            <Text style={styles.lettre}>{culture.label}</Text>
          </View>
          <Text style={[styles.detail, { textAlign: align }]}>
            {formatNumber(culture.dt_m3, lang, 2)} DT/m³ · {formatNumber(culture.eau_m3_ha, lang, 0)} m³/ha ·{" "}
            {formatNumber(culture.kwh_ha, lang, 0)} kWh/ha
          </Text>
          <Text style={[styles.detail, { textAlign: align }]}>{culture.delai[lang]}</Text>
          <Text style={[styles.pourquoi, { textAlign: align }]}>{culture.pourquoi[lang]}</Text>
        </View>
      ))}
      <Text style={[styles.note, { textAlign: align }]}>{sprint06.hypothese[lang]}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, backgroundColor: colors.bg },
  title: { width: "100%", fontSize: 28, fontWeight: "800", color: colors.ink },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: {
    minHeight: tap.minHeight,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  choiceOn: { backgroundColor: colors.olive, borderColor: colors.olive },
  choiceText: { color: colors.ink, fontWeight: "700" },
  choiceTextOn: { color: colors.white },
  status: { width: "100%", color: colors.olive, fontWeight: "700" },
  erreur: { width: "100%", color: colors.clay, fontWeight: "700" },
  banner: { backgroundColor: colors.oliveSoft, borderRadius: 16, padding: 16, gap: 4 },
  bannerTitle: { width: "100%", color: colors.olive, fontWeight: "700" },
  bannerName: { width: "100%", fontSize: 22, fontWeight: "800", color: colors.ink },
  bannerText: { width: "100%", color: colors.ink },
  count: { width: "100%", color: colors.muted, fontWeight: "700" },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 6,
  },
  ligne: { flexDirection: "row", alignItems: "center", gap: 10 },
  rang: { width: 28, fontWeight: "800", color: colors.muted, fontSize: 18 },
  corps: { flex: 1, gap: 2 },
  nom: { width: "100%", fontSize: 18, fontWeight: "800", color: colors.ink },
  badge: { width: "100%", color: colors.clay, fontWeight: "700" },
  lettre: {
    minWidth: 36,
    minHeight: 36,
    textAlign: "center",
    textAlignVertical: "center",
    backgroundColor: colors.olive,
    color: colors.white,
    fontWeight: "800",
    borderRadius: 10,
    overflow: "hidden",
    paddingTop: 6,
  },
  detail: { width: "100%", color: colors.ink },
  pourquoi: { width: "100%", color: colors.muted, lineHeight: 18 },
  note: { width: "100%", color: colors.muted, lineHeight: 18 },
});
