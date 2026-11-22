import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import fixture from "../../../fixtures/sprint-14.json";
import { colors, spacing, touchTarget } from "../theme";

export function SatelliteFollowupScreen() {
  const [photo, setPhoto] = useState("");
  const [latitude, setLatitude] = useState("35.67");
  const [longitude, setLongitude] = useState("9.83");
  const [contestStatus, setContestStatus] = useState("");
  const overrun = fixture.parcelle.eau_consomme_m3 - fixture.parcelle.plan_eau_m3;
  const percent = Math.round((fixture.parcelle.eau_consomme_m3 / fixture.parcelle.plan_eau_m3) * 100);

  function contest() {
    if (!photo.trim()) {
      setContestStatus("Photo requise");
      return;
    }
    setContestStatus("Contestée avec géolocalisation");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Suivi satellite</Text>

        <View style={styles.mapCard}>
          {fixture.zones.map((zone) => (
            <View key={zone.id} style={styles.zone}>
              <Text style={styles.zoneName}>{zone.name}</Text>
              <Text style={styles.zoneMeta}>NDVI {zone.ndvi} · Humidité {zone.humidite_pct} %</Text>
              <Text style={styles.zoneWater}>{zone.eau_m3} m³</Text>
            </View>
          ))}
        </View>

        <View style={styles.gaugeCard}>
          <Text style={styles.cardLabel}>Plan d'eau</Text>
          <Text style={styles.gaugeValue}>{fixture.parcelle.eau_consomme_m3} / {fixture.parcelle.plan_eau_m3} m³</Text>
          <View style={styles.gaugeTrack}>
            <View style={[styles.gaugeFill, { width: `${Math.min(100, percent)}%` }]} />
          </View>
          <Text style={styles.overrun}>+{overrun} m³ au-dessus du plan</Text>
        </View>

        <View style={styles.alertCard}>
          <Text style={styles.alertType}>{fixture.alerte.type}</Text>
          <Text style={styles.alertMessage}>{fixture.alerte.message}</Text>
          <Text style={styles.alertStatus}>Écart confirmé · {fixture.alerte.requires_confirmation_images} images concordantes</Text>
          <Text style={styles.audio}>{fixture.alerte.audio_darija}</Text>
        </View>

        <View style={styles.contestation}>
          <Text style={styles.cardTitle}>Contester l'alerte</Text>
          <TextInput
            value={photo}
            onChangeText={setPhoto}
            placeholder="Lien ou nom de la photo"
            style={styles.input}
          />
          <View style={styles.locationRow}>
            <TextInput value={latitude} onChangeText={setLatitude} keyboardType="decimal-pad" style={[styles.input, styles.locationInput]} />
            <TextInput value={longitude} onChangeText={setLongitude} keyboardType="decimal-pad" style={[styles.input, styles.locationInput]} />
          </View>
          <Pressable accessibilityRole="button" style={styles.button} onPress={contest}>
            <Text style={styles.buttonText}>Joindre la contestation</Text>
          </Pressable>
          {contestStatus !== "" && <Text style={styles.contestStatus}>{contestStatus}</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 28, fontWeight: "900" },
  mapCard: { minHeight: 220, borderRadius: 16, backgroundColor: "#dcfce7", borderWidth: 1, borderColor: "#86efac", padding: spacing.sm, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  zone: { flexGrow: 1, minWidth: 140, minHeight: 96, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border, padding: spacing.sm },
  zoneName: { color: colors.text, fontWeight: "900" },
  zoneMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  zoneWater: { color: colors.primary, fontWeight: "900", marginTop: 6 },
  gaugeCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.lg },
  cardLabel: { color: colors.muted, textTransform: "uppercase", fontSize: 13 },
  gaugeValue: { color: colors.text, fontSize: 20, fontWeight: "900", marginTop: 4 },
  gaugeTrack: { height: 16, borderRadius: 8, backgroundColor: colors.border, marginTop: spacing.md, overflow: "hidden" },
  gaugeFill: { height: 16, borderRadius: 8, backgroundColor: "#ef4444" },
  overrun: { color: "#991b1b", fontWeight: "900", marginTop: spacing.sm },
  alertCard: { backgroundColor: "#fee2e2", borderWidth: 1, borderColor: "#ef4444", borderRadius: 16, padding: spacing.lg },
  alertType: { color: "#991b1b", fontWeight: "900", textTransform: "uppercase" },
  alertMessage: { color: "#991b1b", marginTop: spacing.sm },
  alertStatus: { color: "#991b1b", fontWeight: "900", marginTop: spacing.sm },
  audio: { color: colors.text, marginTop: spacing.sm, textAlign: "right", writingDirection: "rtl" },
  contestation: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.lg, gap: spacing.sm },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  input: { minHeight: touchTarget, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: "#fff", paddingHorizontal: spacing.md },
  locationRow: { flexDirection: "row", gap: spacing.sm },
  locationInput: { flex: 1 },
  button: { minHeight: touchTarget, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#fff", fontWeight: "900" },
  contestStatus: { color: colors.primary, textAlign: "center", fontWeight: "800" },
});
