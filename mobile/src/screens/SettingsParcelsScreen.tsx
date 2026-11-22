import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";

import fixture from "../../../fixtures/sprint-17.json";
import { colors, spacing, touchTarget } from "../theme";

export function SettingsParcelsScreen() {
  const [language, setLanguage] = useState(fixture.profil.language);
  const [notifications, setNotifications] = useState(fixture.profil.notification_preferences);
  const [selectedId, setSelectedId] = useState(fixture.parcelles[0].id);
  const [priceVersion, setPriceVersion] = useState("typical");
  const [name, setName] = useState(fixture.profil.name);

  const selected = fixture.parcelles.find((parcel) => parcel.id === selectedId) ?? fixture.parcelles[0];

  async function saveSettings() {
    await AsyncStorage.setItem("ardi.settings.sprint17", JSON.stringify({
      name,
      language,
      notifications,
    }));
  }

  function toggleNotification(kind: string) {
    setNotifications((current) =>
      current.includes(kind)
        ? current.filter((item) => item !== kind)
        : [...current, kind],
    );
  }

  const ranking = fixture.prix
    .map((price) => {
      const revenue = (
        price.rendement_t_ha
        * price[priceVersion as "min" | "typical" | "max"]
        * 1000
        - price.couts_tnd_ha
      ) / fixture.hypotheses.eau_m3;
      return { culture: price.culture, dt_m3: revenue };
    })
    .sort((a, b) => b.dt_m3 - a.dt_m3);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Réglages et parcelles</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profil</Text>
          <TextInput value={name} onChangeText={setName} style={styles.input} />
          <View style={styles.languageRow}>
            {["fr", "ar", "darija"].map((item) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                style={[styles.languageButton, language === item && styles.languageSelected]}
                onPress={() => setLanguage(item)}
              >
                <Text style={[styles.languageText, language === item && styles.languageTextSelected]}>
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
          {["irrigation", "commande", "label"].map((item) => (
            <View key={item} style={styles.switchRow}>
              <Text style={styles.switchLabel}>{item}</Text>
              <Switch
                value={notifications.includes(item)}
                onValueChange={() => toggleNotification(item)}
                trackColor={{ false: colors.border, true: colors.secondary }}
                thumbColor={notifications.includes(item) ? colors.primary : "#fff"}
              />
            </View>
          ))}
          <Pressable accessibilityRole="button" style={styles.button} onPress={saveSettings}>
            <Text style={styles.buttonText}>Enregistrer les réglages</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mes parcelles</Text>
          {fixture.parcelles.map((parcel) => (
            <Pressable
              key={parcel.id}
              accessibilityRole="button"
              style={[styles.parcel, selectedId === parcel.id && styles.parcelSelected]}
              onPress={() => setSelectedId(parcel.id)}
            >
              <Text style={[styles.parcelName, selectedId === parcel.id && styles.parcelNameSelected]}>
                {parcel.name}
              </Text>
              <Text style={[styles.meta, selectedId === parcel.id && styles.parcelNameSelected]}>
                {parcel.surface_hectares} ha · {parcel.sol}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Classement · {selected.name}</Text>
          <View style={styles.priceRow}>
            {["min", "typical", "max"].map((item) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                style={[styles.priceButton, priceVersion === item && styles.priceSelected]}
                onPress={() => setPriceVersion(item)}
              >
                <Text style={[styles.priceText, priceVersion === item && styles.priceTextSelected]}>
                  {item === "typical" ? "Typique" : item === "min" ? "Minimum" : "Maximum"}
                </Text>
              </Pressable>
            ))}
          </View>
          {ranking.map((item) => (
            <View key={item.culture} style={styles.rankingRow}>
              <Text style={styles.rankingName}>{item.culture}</Text>
              <Text style={styles.rankingValue}>{item.dt_m3.toFixed(2)} DT/m³</Text>
            </View>
          ))}
          {selected.plan_fige && (
            <View style={styles.frozen}>
              <Text style={styles.frozenTitle}>Plan adopté conservé</Text>
              <Text style={styles.meta}>
                {selected.plan?.culture} · Label {selected.plan?.label} · Prix enregistré {selected.plan?.prix_enregistre_tnd_kg} TND/kg
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 28, fontWeight: "900" },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.lg, gap: spacing.sm },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: "900", marginBottom: spacing.sm },
  input: { minHeight: touchTarget, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: "#fff", paddingHorizontal: spacing.md },
  languageRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  languageButton: { minHeight: touchTarget, minWidth: 88, borderWidth: 1, borderColor: colors.border, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  languageSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  languageText: { color: colors.text, fontWeight: "800" },
  languageTextSelected: { color: "#fff" },
  switchRow: { minHeight: touchTarget, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  switchLabel: { color: colors.text, fontWeight: "800", textTransform: "capitalize" },
  button: { minHeight: touchTarget, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#fff", fontWeight: "900" },
  parcel: { minHeight: 72, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: spacing.md, justifyContent: "center" },
  parcelSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  parcelName: { color: colors.text, fontWeight: "900" },
  parcelNameSelected: { color: "#fff" },
  meta: { color: colors.muted, marginTop: 4 },
  priceRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  priceButton: { minHeight: touchTarget, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.sm },
  priceSelected: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  priceText: { color: colors.text, fontWeight: "800" },
  priceTextSelected: { color: "#fff" },
  rankingRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.sm },
  rankingName: { color: colors.text, fontWeight: "800" },
  rankingValue: { color: colors.primary, fontWeight: "900" },
  frozen: { backgroundColor: "#dcfce7", borderWidth: 1, borderColor: "#86efac", borderRadius: 12, padding: spacing.md },
  frozenTitle: { color: colors.primary, fontWeight: "900" },
});
