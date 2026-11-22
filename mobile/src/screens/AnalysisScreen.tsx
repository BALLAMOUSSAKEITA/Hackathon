import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";

import fixture from "../../../fixtures/sprint-05.json";
import { colors, spacing, touchTarget } from "../theme";

type Analysis = typeof fixture;

export function AnalysisScreen() {
  const [analysis, setAnalysis] = useState<Analysis>(fixture);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadAnalysis() {
    setLoading(true);
    setError("");
    try {
      const saved = await AsyncStorage.getItem("ardi.analysis.sprint5");
      await new Promise((resolve) => setTimeout(resolve, 250));
      setAnalysis(saved ? JSON.parse(saved) : fixture);
    } catch {
      setError("Impossible de charger l'analyse. Les données du fichier restent affichées.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalysis();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Analyse de la terre</Text>
        {loading && (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Analyse en cours</Text>
          </View>
        )}
        {error !== "" && <Text style={styles.error}>{error}</Text>}

        <View style={styles.card}>
          <Text style={styles.label}>Sol · {analysis.sol.source}</Text>
          <Text style={styles.value}>{analysis.sol.texture}</Text>
          <Text style={styles.meta}>pH {analysis.sol.ph} · Matière organique {analysis.sol.matiere_organique_pct} %</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Climat · {analysis.climat.sources.join(" + ")}</Text>
          <Text style={styles.value}>{analysis.climat.temperature_moy_c} °C</Text>
          <Text style={styles.meta}>
            Pluie {analysis.climat.pluie_mm_saison} mm · ET0 {analysis.climat.et0_mm} mm
          </Text>
          <Text style={styles.meta}>
            Ensoleillement {analysis.climat.ensoleillement_kwh_m2} kWh/m²
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Eau · puits de {analysis.eau.profondeur_m} m</Text>
          <Text style={styles.value}>{analysis.eau.eau_disponible_m3} m³ disponibles</Text>
          <Text style={styles.meta}>
            Débit {analysis.eau.debit_m3_h} m³/h · Pompage {analysis.eau.heures_pompage_saison} h
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Énergie · {analysis.energie.source}</Text>
          <Text style={styles.value}>{analysis.energie.kwh_m3} kWh/m³</Text>
          <Text style={styles.meta}>Hypothèse : η = {analysis.energie.efficacite_pompe}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>NDVI · série figée</Text>
          <Text style={styles.value}>{analysis.ndvi_12_mois.at(-1)?.valeur}</Text>
          <Text style={styles.meta}>
            12 mois · dernier mois {analysis.ndvi_12_mois.at(-1)?.mois}
          </Text>
        </View>

        <Pressable accessibilityRole="button" style={styles.button} onPress={loadAnalysis}>
          <Text style={styles.buttonText}>Relancer l'analyse</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 28, fontWeight: "800", marginBottom: spacing.sm },
  loading: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  loadingText: { color: colors.muted },
  error: { color: colors.error, backgroundColor: "#fee2e2", borderRadius: 12, padding: spacing.md },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.lg },
  label: { color: colors.muted, fontSize: 13, textTransform: "uppercase" },
  value: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: 4 },
  meta: { color: colors.muted, marginTop: 6 },
  button: { minHeight: touchTarget, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#ffffff", fontWeight: "800" },
});
