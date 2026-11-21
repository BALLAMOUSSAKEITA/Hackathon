import { Pressable, StyleSheet, Text, View } from "react-native";

import { useI18n } from "../i18n";
import type { Lang } from "../types";
import { colors, tap } from "../theme";

const CHOICES: { id: Lang; label: "langFr" | "langAr" | "langDarija" }[] = [
  { id: "fr", label: "langFr" },
  { id: "ar", label: "langAr" },
  { id: "darija", label: "langDarija" },
];

export function LanguageSwitch() {
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
            style={[styles.chip, selected && styles.chipOn]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextOn]}>{t(choice.label)}</Text>
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
    minHeight: tap.minHeight,
    minWidth: tap.minWidth,
    borderRadius: 12,
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
    fontWeight: "600",
  },
  chipTextOn: {
    color: colors.white,
  },
});
