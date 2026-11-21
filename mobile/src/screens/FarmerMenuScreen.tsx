import type { NavigationProp } from "@react-navigation/native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { LanguageSwitch } from "../components/LanguageSwitch";
import { fixture } from "../fixture";
import { useI18n } from "../i18n";
import type { FarmerStackParamList, RootStackParamList } from "../navigation/types";
import { colors, tap } from "../theme";
import { FARMER_SCREENS } from "./catalog";

type Props = NativeStackScreenProps<FarmerStackParamList, "Menu">;

export function FarmerMenuScreen({ navigation }: Props) {
  const { t, direction } = useI18n();
  const align = direction === "rtl" ? "right" : "left";

  return (
    <ScrollView style={{ direction }} contentContainerStyle={styles.content}>
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.getParent()?.goBack()}
        style={styles.back}
      >
        <Text style={styles.backText}>{t("back")}</Text>
      </Pressable>
      <Text style={[styles.title, { textAlign: align }]}>{t("farmerPath")}</Text>
      <Text style={[styles.farm, { textAlign: align }]}>{fixture.ferme.nom}</Text>
      <LanguageSwitch />
      {FARMER_SCREENS.map((screen) => (
        <Pressable
          key={screen.id}
          accessibilityRole="button"
          onPress={() => {
            const ecrans = { "2": "Parcelle", "3": "Analyse", "4": "Planter" } as const;
            if (screen.id === "2" || screen.id === "3" || screen.id === "4") {
              navigation.getParent<NavigationProp<RootStackParamList>>()?.navigate(ecrans[screen.id]);
              return;
            }
            navigation.navigate("Empty", { screenId: screen.id });
          }}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <View style={styles.index}>
            <Text style={styles.indexText}>{screen.id}</Text>
          </View>
          <Text style={styles.rowLabel}>{t(screen.title)}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 10,
    backgroundColor: colors.bg,
  },
  back: {
    alignSelf: "flex-start",
    minHeight: tap.minHeight,
    minWidth: tap.minWidth,
    justifyContent: "center",
  },
  backText: {
    color: colors.olive,
    fontWeight: "700",
    fontSize: 16,
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
    marginBottom: 6,
  },
  row: {
    minHeight: tap.minHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pressed: {
    opacity: 0.82,
  },
  index: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.sand,
    alignItems: "center",
    justifyContent: "center",
  },
  indexText: {
    fontWeight: "800",
    color: colors.clay,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: colors.ink,
  },
});
