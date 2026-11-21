import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { fixture } from "../fixture";
import { useI18n } from "../i18n";
import type { FarmerStackParamList } from "../navigation/types";
import { colors } from "../theme";
import { FARMER_SCREENS } from "./catalog";

type Props = NativeStackScreenProps<FarmerStackParamList, "Empty">;

export function EmptyScreen({ route }: Props) {
  const { t, direction } = useI18n();
  const align = direction === "rtl" ? "right" : "left";
  const screen = FARMER_SCREENS.find((item) => item.id === route.params.screenId);

  return (
    <View style={[styles.page, { direction }]}>
      <Text style={[styles.kicker, { textAlign: align }]}>{fixture.ferme.nom}</Text>
      <Text style={[styles.title, { textAlign: align }]}>{screen ? t(screen.title) : route.params.screenId}</Text>
      <View style={styles.card}>
        <Text style={[styles.body, { textAlign: align }]}>{t("emptyBody")}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 20,
    gap: 8,
  },
  kicker: {
    width: "100%",
    color: colors.clay,
    fontWeight: "700",
  },
  title: {
    width: "100%",
    fontSize: 28,
    fontWeight: "800",
    color: colors.ink,
  },
  card: {
    marginTop: 12,
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
