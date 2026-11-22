import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import fixture from "../../../fixtures/sprint-06.json";
import { colors, spacing, touchTarget } from "../theme";

type SortMode = "revenu" | "eau" | "rapidite";

export function RecommendationsScreen() {
  const [sortMode, setSortMode] = useState<SortMode>("revenu");

  const cultures = useMemo(() => {
    const compatible = [
      ...fixture.cultures,
      ...fixture.cultures_intercalaires,
    ].filter((culture) => culture.compatible);

    if (sortMode === "eau") {
      return [...compatible].sort((a, b) => a.m3_ha - b.m3_ha);
    }
    if (sortMode === "rapidite") {
      return [...compatible].sort((a, b) => a.duree_mois - b.duree_mois);
    }
    return [...compatible].sort((a, b) => b.dt_m3 - a.dt_m3);
  }, [sortMode]);

  const current = fixture.culture_actuelle;
  const best = cultures[0];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Que planter ?</Text>

        <View style={styles.currentCard}>
          <Text style={styles.label}>Culture actuelle</Text>
          <Text style={styles.currentName}>{current.name}</Text>
          <Text style={styles.meta}>
            {current.dt_m3} DT/m³ · {current.m3_ha} m³/ha · Label {current.label}
          </Text>
        </View>

        <View style={styles.gapCard}>
          <Text style={styles.label}>Meilleure option</Text>
          <Text style={styles.bestName}>{best.name}</Text>
          <Text style={styles.meta}>
            Écart : +{(best.dt_m3 - current.dt_m3).toFixed(2)} DT/m³
          </Text>
        </View>

        <View style={styles.sortRow}>
          {([
            ["revenu", "Revenu"],
            ["eau", "Eau"],
            ["rapidite", "Rapidité"],
          ] as [SortMode, string][]).map(([mode, label]) => (
            <Pressable
              key={mode}
              accessibilityRole="button"
              onPress={() => setSortMode(mode)}
              style={[styles.sortButton, sortMode === mode && styles.sortSelected]}
            >
              <Text style={[styles.sortText, sortMode === mode && styles.sortTextSelected]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {cultures.map((culture, index) => (
          <View key={culture.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.rank}>#{index + 1}</Text>
              <Text style={styles.name}>{culture.name}</Text>
              <View style={styles.labelBadge}>
                <Text style={styles.labelBadgeText}>{culture.label}</Text>
              </View>
            </View>
            <Text style={styles.value}>{culture.dt_m3} DT/m³</Text>
            <Text style={styles.meta}>
              {culture.m3_ha} m³/ha · {culture.kwh_ha} kWh/ha · {culture.duree_mois} mois
            </Text>
            <Text style={styles.reason}>{culture.explication}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  currentCard: { backgroundColor: "#fef3c7", borderRadius: 16, padding: spacing.lg, borderWidth: 1, borderColor: "#f59e0b" },
  gapCard: { backgroundColor: "#dcfce7", borderRadius: 16, padding: spacing.lg, borderWidth: 1, borderColor: "#86efac" },
  label: { color: colors.muted, fontSize: 13, textTransform: "uppercase" },
  currentName: { color: colors.text, fontSize: 21, fontWeight: "800", marginTop: 4 },
  bestName: { color: colors.primary, fontSize: 21, fontWeight: "800", marginTop: 4 },
  sortRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  sortButton: { minHeight: touchTarget, minWidth: 96, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  sortSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  sortText: { color: colors.text, fontWeight: "700" },
  sortTextSelected: { color: "#ffffff" },
  card: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rank: { color: colors.muted, fontWeight: "800" },
  name: { flex: 1, color: colors.text, fontSize: 18, fontWeight: "800" },
  labelBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  labelBadgeText: { color: "#ffffff", fontSize: 16, fontWeight: "900" },
  value: { color: colors.primary, fontSize: 20, fontWeight: "800", marginTop: spacing.sm },
  meta: { color: colors.muted, marginTop: 4 },
  reason: { color: colors.text, marginTop: spacing.sm },
});
