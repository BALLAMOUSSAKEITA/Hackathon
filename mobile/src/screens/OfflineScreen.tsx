import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";

import fixture from "../../../fixtures/sprint-16.json";
import { colors, spacing, touchTarget } from "../theme";

export function OfflineScreen() {
  const [network, setNetwork] = useState(false);
  const [consent, setConsent] = useState(fixture.parcelle_a_envoyer.location_consent);
  const [queueStatus, setQueueStatus] = useState("en_attente");
  const [cacheStatus, setCacheStatus] = useState("Données chargées");

  useEffect(() => {
    AsyncStorage.setItem("ardi.offline.sprint16", JSON.stringify(fixture));
  }, []);

  async function sendQueue() {
    if (!network) {
      setQueueStatus("En attente de connexion");
      await AsyncStorage.setItem("ardi.queue.sprint16", JSON.stringify({
        ...fixture.parcelle_a_envoyer,
        location_consent: consent,
        status: "en_attente",
      }));
      return;
    }
    setQueueStatus("envoyee");
  }

  async function clearCacheCheck() {
    setCacheStatus("Analyse et classement disponibles hors ligne");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineTitle}>{fixture.translations.darija.offline}</Text>
          <Text style={styles.offlineMeta}>{fixture.translations.fr.offline}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Analyse hors ligne</Text>
          <Text style={styles.value}>{fixture.analyse.texture}</Text>
          <Text style={styles.meta}>
            pH {fixture.analyse.ph} · Matière organique {fixture.analyse.matiere_organique_pct} %
          </Text>
          <Text style={styles.meta}>
            Eau {fixture.analyse.eau_disponible_m3} m³ · Énergie {fixture.analyse.kwh_m3} kWh/m³
          </Text>
          <Text style={styles.source}>
            Source : {fixture.analyse.source} · Hypothèse : {fixture.analyse.hypothese}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Classement hors ligne</Text>
          {fixture.classement.map((culture) => (
            <View key={culture.name} style={styles.rankingRow}>
              <Text style={styles.cultureName}>{culture.name}</Text>
              <Text style={styles.cultureValue}>{culture.dt_m3} DT/m³ · Label {culture.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Photo et compression</Text>
          <Text style={styles.meta}>
            {fixture.photo.size_kb} ko → {fixture.photo.compressed_size_kb} ko
          </Text>
          <Text style={styles.source}>
            {fixture.photo.format} · qualité {fixture.photo.quality_pct} %
          </Text>
        </View>

        <View style={styles.queueCard}>
          <Text style={styles.cardTitle}>File d'envoi</Text>
          <Text style={styles.meta}>{fixture.parcelle_a_envoyer.name} · {fixture.parcelle_a_envoyer.surface_hectares} ha</Text>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Connexion disponible</Text>
            <Switch
              value={network}
              onValueChange={setNetwork}
              trackColor={{ false: colors.border, true: colors.secondary }}
              thumbColor={network ? colors.primary : "#fff"}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Consentement localisation</Text>
            <Switch
              value={consent}
              onValueChange={setConsent}
              trackColor={{ false: colors.border, true: colors.secondary }}
              thumbColor={consent ? colors.primary : "#fff"}
            />
          </View>

          <Pressable accessibilityRole="button" style={styles.button} onPress={sendQueue}>
            <Text style={styles.buttonText}>Envoyer la parcelle</Text>
          </Pressable>
          <Text style={styles.queueStatus}>Statut : {queueStatus}</Text>
        </View>

        <Pressable accessibilityRole="button" style={styles.cacheButton} onPress={clearCacheCheck}>
          <Text style={styles.cacheButtonText}>{cacheStatus}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md },
  offlineBanner: { backgroundColor: colors.primary, borderRadius: 16, padding: spacing.lg },
  offlineTitle: { color: "#fff", fontSize: 20, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  offlineMeta: { color: "#dcfce7", marginTop: 4 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.lg },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: "900", marginBottom: spacing.sm },
  value: { color: colors.primary, fontSize: 20, fontWeight: "900" },
  meta: { color: colors.muted, marginTop: 6 },
  source: { color: colors.text, marginTop: spacing.sm, fontSize: 12 },
  rankingRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.sm },
  cultureName: { color: colors.text, fontWeight: "900" },
  cultureValue: { color: colors.primary, marginTop: 4 },
  queueCard: { backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#93c5fd", borderRadius: 16, padding: spacing.lg, gap: spacing.sm },
  switchRow: { minHeight: touchTarget, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  switchLabel: { color: colors.text, fontWeight: "800", flex: 1 },
  button: { minHeight: touchTarget, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#fff", fontWeight: "900" },
  queueStatus: { color: colors.primary, textAlign: "center", fontWeight: "800" },
  cacheButton: { minHeight: touchTarget, borderRadius: 12, borderWidth: 1, borderColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
  cacheButtonText: { color: colors.primary, fontWeight: "900", textAlign: "center" },
});
