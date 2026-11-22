import React, { useEffect, useState } from "react";
import {
  I18nManager,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import fixture from "../../../fixtures/sprint-01.json";
import sprint2 from "../../../fixtures/sprint-02.json";
import { colors, spacing, touchTarget } from "../theme";

type Language = "fr" | "ar" | "darija";
type ProfileRole = "agriculteur" | "acheteur_particulier" | "acheteur_professionnel";

export function WelcomeScreen() {
  const navigation = useNavigation<any>();
  const [language, setLanguage] = useState<Language>("fr");
  const [role, setRole] = useState<ProfileRole>("agriculteur");
  const strings = sprint2.translations[language];
  const isArabic = language === "ar";

  useEffect(() => {
    AsyncStorage.multiGet(["ardi.language", "ardi.profile"]).then((entries) => {
      const savedLanguage = entries.find(([key]) => key === "ardi.language")?.[1];
      const savedRole = entries.find(([key]) => key === "ardi.profile")?.[1];
      if (savedLanguage === "fr" || savedLanguage === "ar" || savedLanguage === "darija") {
        setLanguage(savedLanguage);
        I18nManager.forceRTL(savedLanguage === "ar");
      }
      if (
        savedRole === "agriculteur" ||
        savedRole === "acheteur_particulier" ||
        savedRole === "acheteur_professionnel"
      ) {
        setRole(savedRole);
      }
    });
  }, []);

  async function chooseLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    I18nManager.forceRTL(nextLanguage === "ar");
    await AsyncStorage.setItem("ardi.language", nextLanguage);
  }

  async function chooseProfile(nextRole: ProfileRole) {
    setRole(nextRole);
    await AsyncStorage.setItem("ardi.profile", nextRole);
  }

  function continueToDemo() {
    if (role === "acheteur_particulier" || role === "acheteur_professionnel") {
      navigation.navigate("BuyerMarket");
    } else {
      navigation.navigate("FarmerHome");
    }
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

        <Text style={styles.profileLabel}>{strings.profile}</Text>
        <View style={styles.profileRow}>
          {([
            ["agriculteur", strings.farmer],
            ["acheteur_particulier", strings.buyer],
            ["acheteur_professionnel", strings.pro],
          ] as [ProfileRole, string][]).map(([item, label]) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              onPress={() => chooseProfile(item)}
              style={[styles.profileButton, role === item && styles.profileSelected]}
            >
              <Text style={[styles.profileText, role === item && styles.selectedText]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>{fixture.demo.name}</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.primaryButton}
          onPress={continueToDemo}
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
  profileLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    color: colors.text,
    fontWeight: "700",
  },
  profileRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  profileButton: {
    minHeight: touchTarget,
    minWidth: 110,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  profileSelected: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  profileText: { color: colors.text, fontWeight: "700", textAlign: "center" },
  primaryButton: {
    minHeight: touchTarget,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: "#ffffff", fontSize: 16, fontWeight: "800" },
});
