import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";

import fixture from "../../../fixtures/sprint-03.json";
import { colors, spacing, touchTarget } from "../theme";

type Language = "fr" | "ar" | "darija";

export function CulturesScreen() {
  const [language, setLanguage] = useState<Language>("fr");
  const [soil, setSoil] = useState<string>("all");

  useEffect(() => {
    AsyncStorage.getItem("ardi.language").then((saved) => {
      if (saved === "fr" || saved === "ar" || saved === "darija") {
        setLanguage(saved);
      }
    });
  }, []);

  const cultures = fixture.cultures.filter(
    (culture) => soil === "all" || culture.soils.includes(soil),
  );

  const soils = ["all", "limoneux", "argileux", "calcaire", "sableux"];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Que planter ?</Text>
        <Text style={styles.subtitle}>
          {cultures.length} cultures adaptées à la Tunisie
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {soils.map((item) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                onPress={() => setSoil(item)}
                style={[styles.filter, soil === item && styles.filterSelected]}
              >
                <Text style={[styles.filterText, soil === item && styles.filterTextSelected]}>
                  {item === "all" ? "Tous les sols" : item}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {cultures.map((culture) => (
          <View key={culture.id} style={styles.card}>
            <Text style={[styles.name, language === "ar" && styles.rtl]}>
              {culture.names[language]}
            </Text>
            <Text style={styles.meta}>
              Rendement : {culture.yield_t_ha} t/ha · Production : {culture.duration_months} mois
            </Text>
            <Text style={styles.price}>
              Prix : {culture.price.min}–{culture.price.max} TND · typique {culture.price.typical} TND
            </Text>
            <Text style={styles.source}>
              Source : {culture.price.source} · Coûts : {culture.costs_tnd_ha} TND/ha
            </Text>
            <Text style={styles.soils}>Sols : {culture.soils.join(", ")}</Text>
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
  subtitle: { color: colors.muted, marginBottom: spacing.sm },
  filterRow: { flexDirection: "row", gap: spacing.sm, paddingBottom: spacing.sm },
  filter: {
    minHeight: touchTarget,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  filterSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.text, fontWeight: "700" },
  filterTextSelected: { color: "#ffffff" },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.lg,
  },
  name: { color: colors.text, fontSize: 21, fontWeight: "800" },
  rtl: { textAlign: "right", writingDirection: "rtl" },
  meta: { color: colors.muted, marginTop: spacing.sm },
  price: { color: colors.primary, fontWeight: "700", marginTop: 4 },
  source: { color: colors.muted, marginTop: 4 },
  soils: { color: colors.text, marginTop: spacing.sm },
});
