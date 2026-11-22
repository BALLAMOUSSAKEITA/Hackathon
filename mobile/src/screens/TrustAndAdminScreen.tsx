import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";

import fixture from "../../../fixtures/sprint-18.json";
import { colors, spacing, touchTarget } from "../theme";

export function TrustAndAdminScreen() {
  const [photo, setPhoto] = useState("");
  const [moderationMessage, setModerationMessage] = useState("");

  async function contest() {
    await AsyncStorage.setItem("ardi.label-contestation.sprint18", JSON.stringify({
      photo,
      latitude: 35.67,
      longitude: 9.83,
    }));
    setModerationMessage("Photo de contestation enregistrée");
  }

  function moderate(target: string) {
    setModerationMessage(`${target} traité par modération`);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Confiance du label</Text>

        {fixture.labels.map((label) => (
          <View key={label.qr} style={[styles.labelCard, label.status === "suspendu" && styles.suspended]}>
            <View style={styles.labelHeader}>
              <View style={styles.badge}><Text style={styles.badgeText}>{label.status === "suspendu" ? "—" : label.note}</Text></View>
              <View style={styles.labelInfo}>
                <Text style={styles.farmName}>{label.ferme}</Text>
                <Text style={styles.labelStatus}>{label.status.replace("_", " ")}</Text>
              </View>
            </View>
            {label.status === "suspendu" && (
              <Text style={styles.suspension}>Label suspendu · aucune note publique affichée.</Text>
            )}
            {label.status === "conteste" && (
              <Text style={styles.contested}>Contesté · photo géolocalisée attendue.</Text>
            )}
          </View>
        ))}

        <View style={styles.contestation}>
          <Text style={styles.cardTitle}>Contester un label</Text>
          <TextInput
            value={photo}
            onChangeText={setPhoto}
            placeholder="Photo géolocalisée"
            style={styles.input}
          />
          <Pressable accessibilityRole="button" style={styles.button} onPress={contest}>
            <Text style={styles.buttonText}>Envoyer la photo</Text>
          </Pressable>
        </View>

        <View style={styles.adminCard}>
          <Text style={styles.cardTitle}>File admin</Text>
          {fixture.admin_queue.map((item) => (
            <View key={item.id} style={styles.queueItem}>
              <View style={styles.queueInfo}>
                <Text style={styles.queueType}>{item.type}</Text>
                <Text style={styles.meta}>{item.message}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                style={styles.moderateButton}
                onPress={() => moderate(item.target)}
              >
                <Text style={styles.moderateText}>Traiter</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.impactCard}>
          <Text style={styles.cardTitle}>Pilote · {fixture.pilot.region}</Text>
          <View style={styles.metrics}>
            <View style={styles.metric}><Text style={styles.metricValue}>{fixture.impact_pilote.agriculteurs}</Text><Text style={styles.metricLabel}>Agriculteurs</Text></View>
            <View style={styles.metric}><Text style={styles.metricValue}>{fixture.impact_pilote.eau_m3}</Text><Text style={styles.metricLabel}>m³</Text></View>
            <View style={styles.metric}><Text style={styles.metricValue}>{fixture.impact_pilote.energie_kwh}</Text><Text style={styles.metricLabel}>kWh</Text></View>
            <View style={styles.metric}><Text style={styles.metricValue}>{fixture.impact_pilote.labels_actifs}</Text><Text style={styles.metricLabel}>Labels actifs</Text></View>
          </View>
          <Text style={styles.note}>{fixture.pilot.note}</Text>
        </View>

        <View style={styles.terrainCard}>
          <Text style={styles.cardTitle}>Contrôle terrain</Text>
          {fixture.terrain.map((item) => (
            <Text key={item} style={styles.terrainLine}>• {item}</Text>
          ))}
        </View>

        {moderationMessage !== "" && (
          <Text style={styles.status}>{moderationMessage}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 28, fontWeight: "900" },
  labelCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.lg },
  suspended: { borderColor: "#ef4444", backgroundColor: "#fff7f7" },
  labelHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  badge: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#fff", fontWeight: "900" },
  labelInfo: { flex: 1 },
  farmName: { color: colors.text, fontWeight: "900" },
  labelStatus: { color: colors.muted, marginTop: 4, textTransform: "capitalize" },
  suspension: { color: "#991b1b", marginTop: spacing.sm, fontWeight: "800" },
  contested: { color: "#6b21a8", marginTop: spacing.sm, fontWeight: "800" },
  contestation: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.lg, gap: spacing.sm },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  input: { minHeight: touchTarget, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: "#fff", paddingHorizontal: spacing.md },
  button: { minHeight: touchTarget, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#fff", fontWeight: "900" },
  adminCard: { backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#93c5fd", borderRadius: 16, padding: spacing.lg, gap: spacing.sm },
  queueItem: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: "#bfdbfe", paddingTop: spacing.sm, gap: spacing.sm },
  queueInfo: { flex: 1 },
  queueType: { color: colors.text, fontWeight: "900", textTransform: "capitalize" },
  meta: { color: colors.muted, marginTop: 4 },
  moderateButton: { minHeight: 44, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.sm },
  moderateText: { color: "#fff", fontWeight: "900" },
  impactCard: { backgroundColor: colors.primary, borderRadius: 16, padding: spacing.lg },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  metric: { flexGrow: 1, minWidth: 100, minHeight: 72, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", padding: spacing.sm },
  metricValue: { color: colors.primary, fontWeight: "900", textAlign: "center" },
  metricLabel: { color: colors.muted, fontSize: 12, marginTop: 4 },
  note: { color: "#dcfce7", marginTop: spacing.md },
  terrainCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.lg },
  terrainLine: { color: colors.text, marginTop: 6 },
  status: { color: colors.primary, textAlign: "center", fontWeight: "900" },
});
