import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MapView, { Polygon } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import fixture from "../../../fixtures/sprint-04.json";
import { colors, spacing, touchTarget } from "../theme";

type Coordinate = { latitude: number; longitude: number };

export function ParcelScreen() {
  const [waterSource, setWaterSource] = useState(fixture.parcelle.water_source);
  const [depth, setDepth] = useState(String(fixture.parcelle.well_depth_m));
  const [flow, setFlow] = useState(String(fixture.parcelle.pump_flow_m3_h));
  const [crop, setCrop] = useState(fixture.parcelle.current_crop);
  const [energy, setEnergy] = useState(fixture.parcelle.energy);
  const [surface, setSurface] = useState(fixture.parcelle.surface_hectares);
  const [points, setPoints] = useState<Coordinate[]>([
    { latitude: 36.806, longitude: 10.165 },
    { latitude: 36.806, longitude: 10.166 },
    { latitude: 36.802277, longitude: 10.166 },
    { latitude: 36.802277, longitude: 10.165 },
  ]);
  const [status, setStatus] = useState("");

  const region = {
    latitude: 36.8041385,
    longitude: 10.1655,
    latitudeDelta: 0.006,
    longitudeDelta: 0.006,
  };

  function resetToFixture() {
    setPoints([
      { latitude: 36.806, longitude: 10.165 },
      { latitude: 36.806, longitude: 10.166 },
      { latitude: 36.802277, longitude: 10.166 },
      { latitude: 36.802277, longitude: 10.165 },
    ]);
    setSurface(fixture.parcelle.surface_hectares);
  }

  async function saveParcel() {
    await AsyncStorage.setItem("ardi.parcelle.sprint4", JSON.stringify({
      ...fixture.parcelle,
      water_source: waterSource,
      well_depth_m: Number(depth),
      pump_flow_m3_h: Number(flow),
      current_crop: crop,
      energy,
      surface_hectares: surface,
    }));
    setStatus("Parcelle enregistrée hors ligne");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{fixture.translations.fr.title}</Text>

        <View style={styles.mapCard}>
          <MapView
            style={styles.map}
            initialRegion={region}
            onPress={(event) => {
              if (points.length < 10) {
                setPoints((current) => [...current, event.nativeEvent.coordinate]);
              }
            }}
          >
            {points.length >= 3 && (
              <Polygon
                coordinates={points}
                fillColor="rgba(101,163,13,0.28)"
                strokeColor={colors.primary}
                strokeWidth={3}
              />
            )}
          </MapView>
          <View style={styles.mapActions}>
            <Pressable accessibilityRole="button" style={styles.secondary} onPress={resetToFixture}>
              <Text style={styles.secondaryText}>Jeu préchargé</Text>
            </Pressable>
            <View style={styles.surfaceBadge}>
              <Text style={styles.surfaceText}>{surface} ha</Text>
            </View>
          </View>
        </View>

        <Text style={styles.label}>{fixture.translations.fr.water}</Text>
        <TextInput value={waterSource} onChangeText={setWaterSource} style={styles.input} />
        <Text style={styles.label}>{fixture.translations.fr.depth}</Text>
        <TextInput value={depth} onChangeText={setDepth} style={styles.input} keyboardType="decimal-pad" />
        <Text style={styles.label}>{fixture.translations.fr.flow}</Text>
        <TextInput value={flow} onChangeText={setFlow} style={styles.input} keyboardType="decimal-pad" />
        <Text style={styles.label}>{fixture.translations.fr.crop}</Text>
        <TextInput value={crop} onChangeText={setCrop} style={styles.input} />
        <Text style={styles.label}>{fixture.translations.fr.energy}</Text>
        <TextInput value={energy} onChangeText={setEnergy} style={styles.input} />

        <Pressable accessibilityRole="button" style={styles.primary} onPress={saveParcel}>
          <Text style={styles.primaryText}>{fixture.translations.fr.save}</Text>
        </Pressable>
        {status !== "" && <Text style={styles.status}>{status}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.sm },
  title: { color: colors.text, fontSize: 28, fontWeight: "800", marginBottom: spacing.sm },
  mapCard: { borderRadius: 16, overflow: "hidden", backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  map: { height: 260 },
  mapActions: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.sm },
  secondary: { minHeight: touchTarget, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1, borderColor: colors.primary, paddingHorizontal: spacing.md },
  secondaryText: { color: colors.primary, fontWeight: "800" },
  surfaceBadge: { minHeight: touchTarget, minWidth: 76, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.sm },
  surfaceText: { color: "#fff", fontWeight: "800" },
  label: { color: colors.text, fontWeight: "700", marginTop: spacing.sm },
  input: { minHeight: touchTarget, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, paddingHorizontal: spacing.md, color: colors.text },
  primary: { minHeight: touchTarget, marginTop: spacing.md, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#fff", fontWeight: "800" },
  status: { color: colors.primary, textAlign: "center", marginTop: spacing.sm },
});
