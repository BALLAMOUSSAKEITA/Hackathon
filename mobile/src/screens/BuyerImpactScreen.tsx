import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";

import fixture from "../../../fixtures/sprint-15.json";
import { colors, spacing, touchTarget } from "../theme";

export function BuyerImpactScreen() {
  const [professional, setProfessional] = useState(fixture.acheteur.professional);
  const [quantity, setQuantity] = useState("300");
  const [bulkStatus, setBulkStatus] = useState("");

  useEffect(() => {
    AsyncStorage.getItem("ardi.professional.sprint15").then((saved) => {
      if (saved !== null) setProfessional(saved === "true");
    });
  }, []);

  async function toggleProfessional(value: boolean) {
    setProfessional(value);
    await AsyncStorage.setItem("ardi.professional.sprint15", String(value));
  }

  async function submitBulkOrder() {
    await AsyncStorage.setItem("ardi.bulk-order.sprint15", JSON.stringify({
      produit: "Huile d'olive extra vierge",
      quantite: Number(quantity),
      status: "en_attente",
    }));
    setBulkStatus("Commande en gros créée · sans paiement réel");
  }

  async function downloadReport() {
    await AsyncStorage.setItem("ardi.report.sprint15", JSON.stringify(fixture.rapport));
    setBulkStatus("Rapport d'impact enregistré sur l'appareil");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Mon impact</Text>

        <View style={styles.accountCard}>
          <View style={styles.accountInfo}>
            <Text style={styles.accountName}>{fixture.acheteur.name}</Text>
            <Text style={styles.accountRole}>Compte professionnel</Text>
          </View>
          <Switch
            value={professional}
            onValueChange={toggleProfessional}
            trackColor={{ false: colors.border, true: colors.secondary }}
            thumbColor={professional ? colors.primary : "#fff"}
          />
        </View>

        <View style={styles.metricGrid}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{fixture.totaux.eau_m3} m³</Text>
            <Text style={styles.metricLabel}>Eau soutenue</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{fixture.totaux.energie_kwh} kWh</Text>
            <Text style={styles.metricLabel}>Énergie soutenue</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{fixture.totaux.nombre_fermes}</Text>
            <Text style={styles.metricLabel}>Fermes soutenues</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{fixture.totaux.part_produits_label_a_pct} %</Text>
            <Text style={styles.metricLabel}>Produits label A</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Achats à l'origine de l'impact</Text>
          {fixture.achats.map((purchase) => (
            <View key={purchase.id} style={styles.purchase}>
              <View style={styles.labelBadge}><Text style={styles.labelText}>{purchase.label}</Text></View>
              <View style={styles.purchaseInfo}>
                <Text style={styles.purchaseName}>{purchase.produit}</Text>
                <Text style={styles.meta}>{purchase.ferme} · {purchase.quantite} {purchase.unite}</Text>
              </View>
            </View>
          ))}
        </View>

        {professional && (
          <View style={styles.proCard}>
            <Text style={styles.cardTitle}>Commande en gros</Text>
            <Text style={styles.meta}>Huile d'olive extra vierge</Text>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
              style={styles.input}
            />
            <Pressable accessibilityRole="button" style={styles.button} onPress={submitBulkOrder}>
              <Text style={styles.buttonText}>Créer la commande en gros</Text>
            </Pressable>
          </View>
        )}

        <Pressable accessibilityRole="button" style={styles.reportButton} onPress={downloadReport}>
          <Text style={styles.reportButtonText}>Télécharger le rapport RSE</Text>
        </Pressable>
        {bulkStatus !== "" && <Text style={styles.status}>{bulkStatus}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 28, fontWeight: "900" },
  accountCard: { backgroundColor: colors.primary, borderRadius: 16, padding: spacing.lg, flexDirection: "row", alignItems: "center" },
  accountInfo: { flex: 1 },
  accountName: { color: "#fff", fontSize: 18, fontWeight: "900" },
  accountRole: { color: "#dcfce7", marginTop: 4 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metric: { flexGrow: 1, minWidth: 145, minHeight: 82, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", padding: spacing.sm },
  metricValue: { color: colors.primary, fontSize: 20, fontWeight: "900", textAlign: "center" },
  metricLabel: { color: colors.muted, fontSize: 12, marginTop: 4, textAlign: "center" },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.lg },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: "900", marginBottom: spacing.sm },
  purchase: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.sm },
  labelBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  labelText: { color: "#fff", fontWeight: "900" },
  purchaseInfo: { flex: 1 },
  purchaseName: { color: colors.text, fontWeight: "800" },
  meta: { color: colors.muted, marginTop: 4 },
  proCard: { backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#93c5fd", borderRadius: 16, padding: spacing.lg, gap: spacing.sm },
  input: { minHeight: touchTarget, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: "#fff", paddingHorizontal: spacing.md },
  button: { minHeight: touchTarget, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#fff", fontWeight: "900" },
  reportButton: { minHeight: touchTarget, borderRadius: 12, borderWidth: 1, borderColor: colors.primary, alignItems: "center", justifyContent: "center" },
  reportButtonText: { color: colors.primary, fontWeight: "900" },
  status: { color: colors.primary, textAlign: "center", fontWeight: "800" },
});
