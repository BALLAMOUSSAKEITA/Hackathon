import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { LanguageSwitch } from "../components/LanguageSwitch";
import { API_URL, sprint03, type CultureFiche } from "../fixture";
import { useI18n } from "../i18n";
import type { RootStackParamList } from "../navigation/types";
import { colors, tap } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Cultures">;

export function CulturesScreen({ navigation }: Props) {
  const { lang, direction } = useI18n();
  const [cultures, setCultures] = useState<CultureFiche[]>(sprint03.cultures);
  const align = direction === "rtl" ? "right" : "left";

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/cultures`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((corps: { cultures: CultureFiche[] } | null) => {
        if (corps?.cultures?.length) {
          setCultures(corps.cultures);
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const triees = [...cultures].sort((a, b) => a.nom[lang].localeCompare(b.nom[lang], lang === "ar" ? "ar" : "fr"));

  return (
    <ScrollView style={{ direction }} contentContainerStyle={styles.content}>
      <LanguageSwitch />
      <Text style={[styles.count, { textAlign: align }]}>{triees.length}</Text>
      {triees.map((culture) => (
        <Pressable
          key={culture.id}
          accessibilityRole="button"
          onPress={() => navigation.navigate("Fiche", { cultureId: culture.id })}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <Text style={[styles.name, { textAlign: align }]}>{culture.nom[lang]}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 10, backgroundColor: colors.bg },
  count: { width: "100%", color: colors.muted, fontWeight: "700" },
  row: {
    minHeight: tap.minHeight,
    justifyContent: "center",
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
  },
  pressed: { opacity: 0.82 },
  name: { width: "100%", fontSize: 18, fontWeight: "700", color: colors.ink },
});
