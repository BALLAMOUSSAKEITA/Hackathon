import { Pressable, StyleSheet, Text, View } from "react-native";

import { useI18n } from "../i18n";
import type { Lang } from "../types";
import { colors, police, tap } from "../theme";

const CHOICES: { id: Lang; label: "langFr" | "langAr" | "langDarija"; fixe: string }[] = [
  { id: "darija", label: "langDarija", fixe: "Darija" },
  { id: "ar", label: "langAr", fixe: "العربية" },
  { id: "fr", label: "langFr", fixe: "Français" },
];

export function LanguageSwitch({ onGreen = false }: { onGreen?: boolean }) {
  const { lang, setLang, t } = useI18n();

  return (
    <View accessibilityRole="tablist" style={styles.row}>
      {CHOICES.map((choice) => {
        const selected = lang === choice.id;
        return (
          <Pressable
            key={choice.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => setLang(choice.id)}
            style={[styles.chip, onGreen && styles.chipGreen, selected && (onGreen ? styles.chipGreenOn : styles.chipOn)]}
          >
            <Text style={[styles.chipText, onGreen && styles.chipTextGreen, selected && (onGreen ? styles.chipTextGreenOn : styles.chipTextOn)]}>
              {onGreen ? choice.fixe : t(choice.label)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    flex: 1,
    minHeight: 48,
    minWidth: tap.minWidth,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  chipOn: {
    backgroundColor: colors.olive,
    borderColor: colors.olive,
  },
  chipText: {
    color: colors.ink,
    fontSize: 14,
    ...police("700"),
  },
  chipTextOn: {
    color: colors.white,
  },
  chipGreen: {
    backgroundColor: "transparent",
    borderColor: "rgba(255,255,255,0.35)",
  },
  chipGreenOn: {
    backgroundColor: colors.white,
    borderColor: colors.white,
    borderWidth: 2,
  },
  chipTextGreen: {
    color: colors.white,
    ...police("700"),
  },
  chipTextGreenOn: {
    color: colors.olive,
    ...police("800"),
  },
});
