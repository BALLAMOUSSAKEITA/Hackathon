import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import fixture from "../../../fixtures/sprint-13.json";
import { colors, spacing, touchTarget } from "../theme";

export function SolarEnergyScreen() {
  const [depthText, setDepthText] = useState(String(fixture.parcelle.puits_profondeur_m));

  const depth = Number(depthText);
  const result = useMemo(() => {
    if (!depthText || !Number.isFinite(depth) || depth <= 0) return null;
    const flow = fixture.parcelle.debit_m3_h;
    const power = 0.00272 * depth * flow / fixture.hypotheses.eta;
    const panelCount = Math.ceil(power / fixture.dimensionnement.puissance_panneau_kw);
    const reservoir = flow * fixture.parcelle.pompage_heures_jour;
    const fossilAverage = (
      fixture.dimensionnement.cout_annuel_gasoil_tnd
      + fixture.dimensionnement.cout_annuel_steg_tnd
    ) / 2;
    return {
      power,
      panelCount,
      reservoir,
      payback: fixture.dimensionnement.cout_solaire_tnd / fossilAverage,
    };
  }, [depth, depthText]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Énergie et pompage solaire</Text>

        <Text style={styles.label}>Profondeur du puits (m)</Text>
        <TextInput
          value={depthText}
          onChangeText={setDepthText}
          keyboardType="decimal-pad"
          style={styles.input}
        />

        {!result ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Donnée manquante</Text>
            <Text style={styles.emptyText}>Saisissez une profondeur de puits pour dimensionner l'installation.</Text>
          </View>
        ) : (
          <>
            <View style={styles.metricGrid}>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{result.power.toFixed(2)} kW</Text>
                <Text style={styles.metricLabel}>Puissance proposée</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{result.panelCount}</Text>
                <Text style={styles.metricLabel}>Panneaux de {fixture.dimensionnement.puissance_panneau_kw} kW</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{result.reservoir} m³</Text>
                <Text style={styles.metricLabel}>Réservoir conseillé</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Comparatif annuel</Text>
              <Text style={styles.cost}>Gasoil : {fixture.dimensionnement.cout_annuel_gasoil_tnd} TND/an</Text>
              <Text style={styles.cost}>STEG : {fixture.dimensionnement.cout_annuel_steg_tnd} TND/an</Text>
              <Text style={styles.costPrimary}>Installation solaire : {fixture.dimensionnement.cout_solaire_tnd} TND</Text>
              <Text style={styles.meta}>Amortissement indicatif : {result.payback.toFixed(1)} ans</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Meilleures heures</Text>
              <View style={styles.hoursRow}>
                {fixture.pompage.meilleures_heures.map((hour) => (
                  <View key={hour} style={styles.hour}><Text style={styles.hourText}>{hour}</Text></View>
                ))}
              </View>
              <Text style={styles.meta}>{fixture.pompage.production_solaire}</Text>
            </View>

            <View style={styles.aides}>
              <Text style={styles.cardTitle}>Aides disponibles</Text>
              {fixture.aides.map((aide) => (
                <View key={aide.name} style={styles.aide}>
                  <Text style={styles.aideName}>{aide.name}</Text>
                  <Text style={styles.meta}>{aide.detail}</Text>
                  <Text style={styles.informative}>Information uniquement · aucune promesse de dossier.</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 28, fontWeight: "900" },
  label: { color: colors.text, fontWeight: "800" },
  input: { minHeight: touchTarget, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, paddingHorizontal: spacing.md, color: colors.text },
  empty: { backgroundColor: "#fee2e2", borderWidth: 1, borderColor: "#ef4444", borderRadius: 16, padding: spacing.lg },
  emptyTitle: { color: "#991b1b", fontWeight: "900" },
  emptyText: { color: "#991b1b", marginTop: 4 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metric: { flexGrow: 1, minWidth: 100, minHeight: 76, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", padding: spacing.sm },
  metricValue: { color: colors.primary, fontSize: 18, fontWeight: "900", textAlign: "center" },
  metricLabel: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 4 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.lg },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: "900", marginBottom: spacing.sm },
  cost: { color: colors.text, marginTop: 4 },
  costPrimary: { color: colors.primary, fontWeight: "900", marginTop: spacing.sm },
  meta: { color: colors.muted, marginTop: 6 },
  hoursRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  hour: { minHeight: 44, minWidth: 68, borderRadius: 12, backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.sm },
  hourText: { color: colors.primary, fontWeight: "900" },
  aides: { backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#93c5fd", borderRadius: 16, padding: spacing.lg },
  aide: { borderTopWidth: 1, borderTopColor: "#bfdbfe", paddingTop: spacing.sm, marginTop: spacing.sm },
  aideName: { color: colors.text, fontWeight: "900" },
  informative: { color: "#1e40af", fontSize: 12, marginTop: 4 },
});
