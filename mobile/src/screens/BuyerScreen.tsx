import { ScrollView, StyleSheet, Text, View } from "react-native";

import { LanguageSwitch } from "../components/LanguageSwitch";
import { fixture } from "../fixture";
import { useI18n } from "../i18n";
import { colors } from "../theme";

export function BuyerScreen() {
  const { t, direction } = useI18n();
  const align = direction === "rtl" ? "right" : "left";

  return (
    <ScrollView style={{ direction }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { textAlign: align }]}>{t("buyerPath")}</Text>
      <Text style={[styles.farm, { textAlign: align }]}>{fixture.ferme.nom}</Text>
      <LanguageSwitch />
      <View style={styles.card}>
        <Text style={[styles.body, { textAlign: align }]}>{t("buyerBody")}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 12,
    backgroundColor: colors.bg,
    flexGrow: 1,
  },
  title: {
    width: "100%",
    fontSize: 28,
    fontWeight: "800",
    color: colors.ink,
  },
  farm: {
    width: "100%",
    color: colors.muted,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    minHeight: 44,
  },
  body: {
    width: "100%",
    color: colors.ink,
    fontSize: 16,
    lineHeight: 22,
  },
});
