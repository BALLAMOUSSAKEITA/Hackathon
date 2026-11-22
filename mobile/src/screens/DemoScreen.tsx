import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import fixture from "../../../fixtures/sprint-12.json";
import { colors, spacing, touchTarget } from "../theme";

export function DemoScreen() {
  const [selected, setSelected] = useState(0);
  const card = fixture.cartes[selected];

  function previous() {
    setSelected((current) => Math.max(0, current - 1));
  }

  function next() {
    setSelected((current) => Math.min(fixture.cartes.length - 1, current + 1));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Démo Ardi</Text>
        <View style={styles.progressRow}>
          {fixture.cartes.map((item, index) => (
            <Pressable
              key={item.step}
              accessibilityRole="button"
              style={[styles.progress, selected === index && styles.progressSelected]}
              onPress={() => setSelected(index)}
            >
              <Text style={[styles.progressText, selected === index && styles.progressTextSelected]}>
                {item.step}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.step}>Étape {card.step} / 8</Text>
          <Text style={styles.cardTitle}>{card.title}</Text>
          <Text style={styles.darija}>{card.message}</Text>
          <Text style={styles.translation}>FR · {card.fr}</Text>
        </View>

        {selected === 2 && (
          <View style={styles.metricGrid}>
            <View style={styles.metric}><Text style={styles.metricValue}>{fixture.analyse.water_m3}</Text><Text style={styles.metricLabel}>m³ disponibles</Text></View>
            <View style={styles.metric}><Text style={styles.metricValue}>{fixture.analyse.kwh_m3}</Text><Text style={styles.metricLabel}>kWh/m³</Text></View>
          </View>
        )}
        {selected === 3 && (
          <View style={styles.metricGrid}>
            {fixture.classement.map((item) => (
              <View key={item.name} style={styles.metric}>
                <Text style={styles.metricValue}>{item.name}</Text>
                <Text style={styles.metricLabel}>{item.dt_m3} DT/m³ · {item.label}</Text>
              </View>
            ))}
          </View>
        )}
        {selected === 5 && (
          <View style={styles.metricGrid}>
            <View style={styles.metric}><Text style={styles.metricValue}>{fixture.plan.water_saved_m3}</Text><Text style={styles.metricLabel}>m³ économisés</Text></View>
            <View style={styles.metric}><Text style={styles.metricValue}>{fixture.plan.energy_saved_kwh}</Text><Text style={styles.metricLabel}>kWh économisés</Text></View>
            <View style={styles.metric}><Text style={styles.metricValue}>{fixture.plan.label}</Text><Text style={styles.metricLabel}>Label</Text></View>
          </View>
        )}
        {selected === 6 && (
          <View style={styles.questionCard}>
            <Text style={styles.question}>{fixture.question.darija}</Text>
            <Text style={styles.answer}>{fixture.question.answer_darija}</Text>
            <Text style={styles.translation}>FR · {fixture.question.answer_fr}</Text>
          </View>
        )}
        {selected === 7 && (
          <View style={styles.questionCard}>
            <Text style={styles.answer}>{fixture.produit.name}</Text>
            <Text style={styles.translation}>{fixture.produit.price_tnd} TND · Label {fixture.produit.label}</Text>
            <Text style={styles.translation}>QR · {fixture.produit.qr}</Text>
            <Text style={styles.answer}>{fixture.produit.payment}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <Pressable accessibilityRole="button" style={[styles.button, selected === 0 && styles.disabled]} onPress={previous}>
            <Text style={styles.buttonText}>Précédent</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={[styles.button, selected === 7 && styles.disabled]} onPress={next}>
            <Text style={styles.buttonText}>Suivant</Text>
          </Pressable>
        </View>

        <View style={styles.pitch}>
          <Text style={styles.pitchTitle}>Notes de pitch</Text>
          {fixture.pitch.map((item) => (
            <Text key={item.theme} style={styles.pitchLine}>• {item.phrase}</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 30, fontWeight: "900" },
  progressRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  progress: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  progressSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  progressText: { color: colors.text, fontWeight: "900" },
  progressTextSelected: { color: "#fff" },
  card: { backgroundColor: colors.primary, borderRadius: 16, padding: spacing.lg },
  step: { color: "#dcfce7", textTransform: "uppercase", fontWeight: "800" },
  cardTitle: { color: "#fff", fontSize: 24, fontWeight: "900", marginTop: spacing.sm },
  darija: { color: "#fff", fontSize: 18, marginTop: spacing.md, lineHeight: 26, textAlign: "right", writingDirection: "rtl" },
  translation: { color: "#e5e7eb", marginTop: spacing.sm },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metric: { flexGrow: 1, minWidth: 100, minHeight: 72, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", padding: spacing.sm },
  metricValue: { color: colors.primary, fontWeight: "900", textAlign: "center" },
  metricLabel: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 4 },
  questionCard: { backgroundColor: "#dcfce7", borderWidth: 1, borderColor: "#86efac", borderRadius: 16, padding: spacing.lg },
  question: { color: colors.text, fontWeight: "800" },
  answer: { color: colors.primary, fontSize: 18, fontWeight: "900", marginTop: spacing.sm },
  actions: { flexDirection: "row", gap: spacing.sm },
  button: { flex: 1, minHeight: touchTarget, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  disabled: { backgroundColor: colors.muted },
  buttonText: { color: "#fff", fontWeight: "900" },
  pitch: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.lg },
  pitchTitle: { color: colors.text, fontSize: 18, fontWeight: "900", marginBottom: spacing.sm },
  pitchLine: { color: colors.text, marginTop: 6 },
});
