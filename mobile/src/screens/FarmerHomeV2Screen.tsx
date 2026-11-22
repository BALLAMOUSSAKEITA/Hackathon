import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import fixture from "../../../fixtures/sprint-08.json";
import { colors, spacing, touchTarget } from "../theme";

export function FarmerHomeV2Screen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{fixture.ferme.name}</Text>

        <View style={styles.labelCard}>
          <Text style={styles.labelTitle}>Label actif</Text>
          <View style={styles.labelRow}>
            <View style={styles.labelBadge}><Text style={styles.labelText}>{fixture.label.active}</Text></View>
            <View style={styles.labelInfo}>
              <Text style={styles.labelPotential}>Potentiel : {fixture.label.potentiel}</Text>
              <Text style={styles.labelMeta}>{fixture.plan.dt_m3} DT/m³</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Bilan de saison</Text>
          <Text style={styles.cardValue}>{fixture.plan.eau_economisee_m3} m³ économisés</Text>
          <Text style={styles.meta}>{fixture.plan.energie_economisee_kwh} kWh économisés</Text>
        </View>

        <View style={styles.adviceCard}>
          <Text style={styles.cardLabel}>Conseil du jour</Text>
          <Text style={styles.adviceTitle}>{fixture.conseil.culture}</Text>
          <Text style={styles.meta}>{fixture.conseil.message_fr}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          style={styles.button}
          onPress={() => navigation.navigate("FarmLabel")}
        >
          <Text style={styles.buttonText}>Voir le label et le QR</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  labelCard: { backgroundColor: colors.primary, borderRadius: 16, padding: spacing.lg },
  labelTitle: { color: "#dcfce7", fontSize: 13, textTransform: "uppercase", fontWeight: "800" },
  labelRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm, gap: spacing.lg },
  labelBadge: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  labelText: { color: colors.primary, fontSize: 38, fontWeight: "900" },
  labelInfo: { flex: 1 },
  labelPotential: { color: "#fff", fontSize: 18, fontWeight: "800" },
  labelMeta: { color: "#dcfce7", marginTop: 4 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.lg },
  cardLabel: { color: colors.muted, fontSize: 13, textTransform: "uppercase" },
  cardValue: { color: colors.text, fontSize: 20, fontWeight: "800", marginTop: 4 },
  meta: { color: colors.muted, marginTop: 6 },
  adviceCard: { backgroundColor: "#dcfce7", borderWidth: 1, borderColor: "#86efac", borderRadius: 16, padding: spacing.lg },
  adviceTitle: { color: colors.primary, fontSize: 21, fontWeight: "800", marginTop: 4 },
  button: { minHeight: touchTarget, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#fff", fontWeight: "900" },
});
