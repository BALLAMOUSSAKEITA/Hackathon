import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";

import fixture from "../../../fixtures/sprint-07.json";
import { colors, spacing, touchTarget } from "../theme";

type Allocations = Record<string, number>;

export function SimulatorScreen() {
  const [allocations, setAllocations] = useState<Allocations>({
    olivier: 1.5,
    cables: 0.5,
    figuier_barbarie: 0.69,
    pois_chiche: 1.0,
  });
  const [adopted, setAdopted] = useState(false);

  const result = useMemo(() => {
    let surface = 0;
    let water = 0;
    let energy = 0;
    let weightedRevenue = 0;
    let costs = 0;

    fixture.cultures_proposees.forEach((culture) => {
      const hectares = allocations[culture.id] ?? 0;
      surface += hectares;
      water += hectares * culture.m3_ha;
      energy += hectares * culture.m3_ha * culture.kwh_m3;
      weightedRevenue += hectares * culture.rendement_t_ha * culture.prix_tnd_kg * 1000;
      costs += hectares * culture.couts_tnd_ha;
    });

    const revenue = weightedRevenue - costs;
    const dt = water > 0 ? revenue / water : 0;
    const label = dt >= 2.2 ? "A" : dt >= 1.5 ? "B" : dt >= 1.1 ? "C" : dt >= 0.8 ? "D" : "E";
    const current = fixture.situation_actuelle;
    return {
      surface,
      water,
      energy,
      revenue,
      dt,
      label,
      surfaceExceeded: surface > fixture.parcelle.surface_hectares,
      wellExceeded: water > fixture.parcelle.capacity_puit_m3,
      current,
    };
  }, [allocations]);

  function adjust(cultureId: string, delta: number) {
    setAllocations((current) => ({
      ...current,
      [cultureId]: Math.max(0, Math.round(((current[cultureId] ?? 0) + delta) * 100) / 100),
    }));
  }

  async function adoptPlan() {
    if (result.surfaceExceeded || result.wellExceeded) {
      return;
    }
    await AsyncStorage.setItem("ardi.plan.sprint7", JSON.stringify({
      allocations,
      result,
    }));
    setAdopted(true);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Simulateur</Text>

        {fixture.cultures_proposees.map((culture) => (
          <View key={culture.id} style={styles.sliderCard}>
            <View style={styles.sliderHeader}>
              <Text style={styles.cultureName}>{culture.name}</Text>
              <Text style={styles.hectares}>{(allocations[culture.id] ?? 0).toFixed(2)} ha</Text>
            </View>
            <View style={styles.controls}>
              <Pressable accessibilityRole="button" style={styles.control} onPress={() => adjust(culture.id, -0.25)}>
                <Text style={styles.controlText}>−</Text>
              </Pressable>
              <View style={styles.track}>
                <View style={[styles.trackFill, { width: `${Math.min(100, ((allocations[culture.id] ?? 0) / 3.69) * 100)}%` }]} />
              </View>
              <Pressable accessibilityRole="button" style={styles.control} onPress={() => adjust(culture.id, 0.25)}>
                <Text style={styles.controlText}>+</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {(result.surfaceExceeded || result.wellExceeded) && (
          <View style={styles.alert}>
            <Text style={styles.alertTitle}>Dépassement à corriger</Text>
            {result.surfaceExceeded && <Text style={styles.alertText}>Surface dépassée : {result.surface.toFixed(2)} / {fixture.parcelle.surface_hectares} ha</Text>}
            {result.wellExceeded && <Text style={styles.alertText}>Puits dépassé : {result.water.toFixed(0)} / {fixture.parcelle.capacity_puit_m3} m³</Text>}
          </View>
        )}

        <View style={styles.results}>
          <Text style={styles.sectionTitle}>Résultats du plan</Text>
          <View style={styles.metrics}>
            <View style={styles.metric}><Text style={styles.metricValue}>{result.revenue.toFixed(0)}</Text><Text style={styles.metricLabel}>TND</Text></View>
            <View style={styles.metric}><Text style={styles.metricValue}>{result.water.toFixed(0)}</Text><Text style={styles.metricLabel}>m³</Text></View>
            <View style={styles.metric}><Text style={styles.metricValue}>{result.energy.toFixed(0)}</Text><Text style={styles.metricLabel}>kWh</Text></View>
            <View style={styles.metric}><Text style={styles.metricValue}>{result.label}</Text><Text style={styles.metricLabel}>{result.dt.toFixed(2)} DT/m³</Text></View>
          </View>
          <Text style={styles.comparison}>
            Aujourd'hui : {result.current.eau_m3} m³ · {result.current.energie_kwh} kWh · {result.current.dt_m3} DT/m³ · {result.current.label}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          style={[styles.adopt, (result.surfaceExceeded || result.wellExceeded) && styles.adoptDisabled]}
          onPress={adoptPlan}
        >
          <Text style={styles.adoptText}>{adopted ? "Plan adopté" : "Adopter ce plan"}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  sliderCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.md },
  sliderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  cultureName: { color: colors.text, fontWeight: "800" },
  hectares: { color: colors.primary, fontWeight: "800" },
  controls: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  control: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  controlText: { color: "#fff", fontSize: 24, lineHeight: 28, fontWeight: "800" },
  track: { flex: 1, height: 12, borderRadius: 6, backgroundColor: colors.border, overflow: "hidden" },
  trackFill: { height: 12, borderRadius: 6, backgroundColor: colors.secondary },
  alert: { backgroundColor: "#fee2e2", borderWidth: 1, borderColor: "#ef4444", borderRadius: 16, padding: spacing.lg },
  alertTitle: { color: "#991b1b", fontWeight: "900", marginBottom: 4 },
  alertText: { color: "#991b1b" },
  results: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.lg },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "800", marginBottom: spacing.sm },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metric: { minWidth: 78, minHeight: 68, flexGrow: 1, borderRadius: 12, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: spacing.sm },
  metricValue: { color: colors.primary, fontSize: 18, fontWeight: "900" },
  metricLabel: { color: colors.muted, fontSize: 12, textAlign: "center" },
  comparison: { color: colors.muted, marginTop: spacing.md },
  adopt: { minHeight: touchTarget, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  adoptDisabled: { backgroundColor: colors.muted },
  adoptText: { color: "#fff", fontWeight: "900" },
});
