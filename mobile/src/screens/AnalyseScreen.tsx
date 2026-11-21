import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { LanguageSwitch } from "../components/LanguageSwitch";
import { Tap } from "../components/Tap";
import { API_URL, sprint05, type AnalyseDemo } from "../fixture";
import { formatNumber, useI18n } from "../i18n";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Analyse">;

function ligneSource(source: string, fige: boolean, exemple: string): string {
  return fige ? `${source} · ${exemple}` : source;
}

export function AnalyseScreen(_props: Props) {
  const { lang, t, direction } = useI18n();
  const [analyse, setAnalyse] = useState<AnalyseDemo>(sprint05.analyse);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const align = direction === "rtl" ? "right" : "left";

  async function relancer() {
    setChargement(true);
    setErreur(null);
    try {
      const reponse = await fetch(`${API_URL}/parcelles/${sprint05.parcelle.id}/analyse`, { method: "POST" });
      if (!reponse.ok) {
        throw new Error("analyse");
      }
      const corps = (await reponse.json()) as AnalyseDemo;
      setAnalyse(corps);
    } catch {
      setAnalyse(sprint05.analyse);
      setErreur(t("analysisError"));
    } finally {
      setChargement(false);
    }
  }

  const sol = analyse.sol;
  const climat = analyse.climat;
  const soleil = analyse.ensoleillement;

  return (
    <ScrollView style={{ direction }} contentContainerStyle={styles.content}>
      <LanguageSwitch />
      <Text style={[styles.title, { textAlign: align }]}>{t("screen3")}</Text>
      <Tap label={t("relaunch")} onPress={() => void relancer()} style={chargement ? styles.attente : undefined} />
      {chargement ? <Text style={[styles.status, { textAlign: align }]}>{t("loadingAnalysis")}</Text> : null}
      {erreur ? <Text style={[styles.erreur, { textAlign: align }]}>{erreur}</Text> : null}

      <View style={styles.card}>
        <Text style={[styles.cardTitle, { textAlign: align }]}>{t("texture")}</Text>
        <Text style={[styles.value, { textAlign: align }]}>{sol.texture[lang]}</Text>
        <Text style={[styles.detail, { textAlign: align }]}>
          {formatNumber(sol.sable_pct, lang, 0)} % {t("sand")} · {formatNumber(sol.limon_pct, lang, 0)} % {t("silt")} ·{" "}
          {formatNumber(sol.argile_pct, lang, 0)} % {t("clay")}
        </Text>
        <Text style={[styles.detail, { textAlign: align }]}>
          {t("ph")} {formatNumber(sol.ph, lang, 1)}
        </Text>
        <Text style={[styles.detail, { textAlign: align }]}>
          {t("organic")} {formatNumber(sol.matiere_organique_g_kg, lang, 1)} g/kg
        </Text>
        <Text style={[styles.source, { textAlign: align }]}>{ligneSource(sol.source, sol.fige, t("frozenExample"))}</Text>
      </View>

      <View style={styles.card}>
        <Text style={[styles.detail, { textAlign: align }]}>
          {t("rain")} {formatNumber(climat.pluie_mm, lang, 0)} mm
          {climat.fenetre_jours ? ` · ${climat.fenetre_jours} j` : ""}
        </Text>
        <Text style={[styles.detail, { textAlign: align }]}>
          {t("temperature")} {formatNumber(climat.temperature_c, lang, 1)} °C
        </Text>
        <Text style={[styles.detail, { textAlign: align }]}>
          {t("et0")} {formatNumber(climat.et0_mm_jour, lang, 1)} mm
        </Text>
        <Text style={[styles.source, { textAlign: align }]}>
          {ligneSource(climat.source, climat.fige, t("frozenExample"))}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={[styles.detail, { textAlign: align }]}>
          {t("sunshine")} {formatNumber(soleil.kwh_m2_jour, lang, 1)} kWh/m²
        </Text>
        <Text style={[styles.source, { textAlign: align }]}>
          {ligneSource(soleil.source, soleil.fige, t("frozenExample"))}
        </Text>
      </View>

      <View style={styles.highlight}>
        <Text style={styles.kicker}>{t("energyPerM3")}</Text>
        <Text style={styles.kwh}>{formatNumber(analyse.kwh_m3, lang, 2)} kWh/m³</Text>
        <Text style={styles.detail}>
          0,00272 × {formatNumber(analyse.profondeur_puits_m, lang, 0)} m / {formatNumber(analyse.eta, lang, 1)}
        </Text>
        <Text style={styles.kicker}>{t("waterAvailable")}</Text>
        <Text style={styles.kwh}>{formatNumber(analyse.eau_disponible_m3, lang, 0)} m³</Text>
        <Text style={styles.detail}>
          {formatNumber(analyse.debit_m3_h, lang, 0)} m³/h × {analyse.heures_pompage_par_jour} h × {analyse.jours_saison}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={[styles.cardTitle, { textAlign: align }]}>NDVI</Text>
        {analyse.ndvi.map((point) => (
          <View key={point.mois.fr} style={styles.ndvi}>
            <Text style={styles.mois}>{point.mois[lang]}</Text>
            <View style={styles.piste}>
              <View style={[styles.barre, { width: `${Math.round(point.valeur * 100)}%` }]} />
            </View>
            <Text style={styles.ndviValeur}>{formatNumber(point.valeur, lang, 2)}</Text>
          </View>
        ))}
        <Text style={[styles.source, { textAlign: align }]}>{t("frozenExample")}</Text>
      </View>

      <Text style={[styles.note, { textAlign: align }]}>{sprint05.hypothese[lang]}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, backgroundColor: colors.bg },
  title: { width: "100%", fontSize: 28, fontWeight: "800", color: colors.ink },
  attente: { opacity: 0.45 },
  status: { width: "100%", color: colors.olive, fontWeight: "700" },
  erreur: { width: "100%", color: colors.clay, fontWeight: "700", lineHeight: 20 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 6,
  },
  cardTitle: { width: "100%", fontWeight: "800", color: colors.ink, fontSize: 16 },
  value: { width: "100%", fontSize: 22, fontWeight: "800", color: colors.ink },
  detail: { width: "100%", color: colors.ink, fontSize: 16 },
  source: { width: "100%", color: colors.muted, marginTop: 4 },
  highlight: { backgroundColor: colors.oliveSoft, borderRadius: 16, padding: 16, gap: 4 },
  kicker: { color: colors.olive, fontWeight: "700" },
  kwh: { fontSize: 28, fontWeight: "800", color: colors.ink },
  ndvi: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 28 },
  mois: { width: 52, color: colors.muted },
  piste: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.sand, overflow: "hidden" },
  barre: { height: 8, backgroundColor: colors.olive },
  ndviValeur: { width: 36, textAlign: "right", color: colors.ink, fontWeight: "700" },
  note: { width: "100%", color: colors.muted, lineHeight: 18 },
});
