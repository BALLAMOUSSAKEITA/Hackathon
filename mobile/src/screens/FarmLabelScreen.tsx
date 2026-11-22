import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

import fixture from "../../../fixtures/sprint-08.json";
import { colors, spacing } from "../theme";

export function FarmLabelScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Label de la ferme</Text>

        <View style={styles.header}>
          <View style={styles.badge}><Text style={styles.badgeText}>{fixture.label.active}</Text></View>
          <View style={styles.headerInfo}>
            <Text style={styles.farmName}>{fixture.ferme.name}</Text>
            <Text style={styles.status}>Label actif</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Économies de saison</Text>
          <Text style={styles.value}>{fixture.plan.eau_economisee_m3} m³ d'eau</Text>
          <Text style={styles.value}>{fixture.plan.energie_economisee_kwh} kWh</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Vérifications</Text>
          {fixture.verifications.map((item) => (
            <View key={item.kind} style={styles.verification}>
              <Text style={styles.check}>✓</Text>
              <View style={styles.verificationInfo}>
                <Text style={styles.verificationTitle}>{item.status}</Text>
                <Text style={styles.meta}>{item.detail}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.qrCard}>
          <QRCode value={fixture.ferme.qr} size={180} />
          <Text style={styles.qrTitle}>{fixture.ferme.name}</Text>
          <Text style={styles.qrMeta}>Label {fixture.label.active} · {fixture.ferme.qr}</Text>
          <Text style={styles.productMeta}>{fixture.produit.name} · {fixture.produit.qr}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  header: { backgroundColor: colors.primary, borderRadius: 16, padding: spacing.lg, flexDirection: "row", alignItems: "center", gap: spacing.lg },
  badge: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  badgeText: { color: colors.primary, fontSize: 38, fontWeight: "900" },
  headerInfo: { flex: 1 },
  farmName: { color: "#fff", fontSize: 20, fontWeight: "800" },
  status: { color: "#dcfce7", marginTop: 4 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.lg },
  cardLabel: { color: colors.muted, fontSize: 13, textTransform: "uppercase", marginBottom: spacing.sm },
  value: { color: colors.text, fontSize: 20, fontWeight: "800", marginTop: 4 },
  verification: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, paddingVertical: spacing.sm },
  check: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#dcfce7", color: colors.primary, textAlign: "center", textAlignVertical: "center", fontWeight: "900", lineHeight: 44 },
  verificationInfo: { flex: 1 },
  verificationTitle: { color: colors.text, fontWeight: "800" },
  meta: { color: colors.muted, marginTop: 4 },
  qrCard: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, alignItems: "center" },
  qrTitle: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: spacing.md },
  qrMeta: { color: colors.primary, fontWeight: "700", marginTop: 4 },
  productMeta: { color: colors.muted, marginTop: 4, textAlign: "center" },
});
