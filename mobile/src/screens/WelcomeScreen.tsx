import React, { useState } from "react";
import {
  I18nManager,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import fixture from "../../../fixtures/sprint-01.json";
import { colors, spacing, touchTarget } from "../theme";

type Language = "fr" | "ar" | "darija";

export function WelcomeScreen() {
  const navigation = useNavigation<any>();
  const [language, setLanguage] = useState<Language>("fr");
  const strings = fixture.translations[language];
  const isArabic = language === "ar";

  function chooseLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    I18nManager.forceRTL(nextLanguage === "ar");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.container, isArabic && styles.rtl]}>
        <Text style={styles.brand}>ARDI</Text>
        <Text style={styles.title}>{strings.welcome}</Text>
        <Text style={styles.subtitle}>{strings.demo}</Text>

        <View style={styles.languageRow}>
          {(["fr", "ar", "darija"] as Language[]).map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              onPress={() => chooseLanguage(item)}
              style={[styles.languageButton, language === item && styles.selected]}
            >
              <Text style={[styles.languageText, language === item && styles.selectedText]}>
                {item === "ar" ? "العربية" : item === "darija" ? "Darija" : "Français"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>{fixture.demo.name}</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.primaryButton}
          onPress={() => navigation.navigate("FarmerHome")}
        >
          <Text style={styles.primaryButtonText}>{strings.open_demo}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primaryDark },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: "center",
  },
  rtl: { direction: "rtl" },
  brand: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 3,
  },
  title: { color: colors.text, fontSize: 34, fontWeight: "800", marginTop: spacing.lg },
  subtitle: { color: colors.muted, fontSize: 17, marginTop: spacing.sm, marginBottom: spacing.xl },
  languageRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  languageButton: {
    minWidth: 96,
    minHeight: touchTarget,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  languageText: { color: colors.text, fontWeight: "700" },
  selectedText: { color: "#ffffff" },
  sectionLabel: { marginTop: spacing.xl, color: colors.muted, marginBottom: spacing.sm },
  primaryButton: {
    minHeight: touchTarget,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: "#ffffff", fontSize: 16, fontWeight: "800" },
});
