import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import fixture from "../../../fixtures/sprint-01.json";
import { colors, spacing, touchTarget } from "../theme";

export function FarmerHomeScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.brand}>ARDI</Text>
        <Text style={styles.title}>{fixture.demo.name}</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Parcelle</Text>
          <Text style={styles.value}>{fixture.parcelle.name}</Text>
          <Text style={styles.meta}>{fixture.parcelle.surface_hectares} ha</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Puits</Text>
          <Text style={styles.value}>{fixture.well.depth_m} m</Text>
          <Text style={styles.meta}>
            {fixture.well.energy_kwh_per_m3} kWh/m³ · η = {fixture.well.pump_efficiency}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Culture actuelle</Text>
          <Text style={styles.value}>{fixture.culture_current.names.fr}</Text>
          <Text style={styles.meta}>Besoin en eau : {fixture.culture_current.water_need}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Produit labellisé</Text>
          <Text style={styles.value}>{fixture.product.name}</Text>
          <Text style={styles.meta}>Label {fixture.product.label} · QR {fixture.product.qr}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          style={styles.primaryButton}
          onPress={() => navigation.navigate("Welcome")}
        >
          <Text style={styles.primaryButtonText}>Changer la langue</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md },
  brand: { color: colors.primary, letterSpacing: 3, fontWeight: "800" },
  title: { color: colors.text, fontSize: 28, fontWeight: "800", marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  label: { color: colors.muted, fontSize: 13, textTransform: "uppercase" },
  value: { color: colors.text, fontSize: 20, fontWeight: "800", marginTop: 4 },
  meta: { color: colors.muted, marginTop: 6 },
  primaryButton: {
    minHeight: touchTarget,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: "#ffffff", fontWeight: "800" },
});
