import { CommonActions, useNavigation, type NavigationProp } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useI18n, type CopyKey } from "../i18n";
import type { RootStackParamList } from "../navigation/types";
import { usePanier } from "../panier";
import { colors, police } from "../theme";
import { Icon, type IconName } from "./icons";

type Nav = NavigationProp<RootStackParamList>;

export function Logo({ light = false, size = 22 }: { light?: boolean; size?: number }) {
  const color = light ? colors.white : colors.olive;
  return (
    <View style={styles.logo} accessibilityRole="header" accessibilityLabel="Ardi">
      <Icon name="sprout" color={color} size={size + 4} strokeWidth={2} />
      <Text style={[styles.word, { color, fontSize: size }]}>ardi</Text>
    </View>
  );
}

export function BackButton({ light = false }: { light?: boolean }) {
  const navigation = useNavigation<Nav>();
  const { t, direction } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("back")}
      hitSlop={6}
      onPress={() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Welcome" }] }));
        }
      }}
      style={({ pressed }) => [styles.round, light ? styles.roundDark : styles.roundLight, pressed && styles.pressed]}
    >
      <Icon name={direction === "rtl" ? "forward" : "back"} color={light ? colors.white : colors.ink} size={22} strokeWidth={2} />
    </Pressable>
  );
}

type FarmerTab = "Home" | "Parcelle" | "Planter" | "Assistant" | "Label";
type BuyerTab = "Marche" | "Scanner" | "Panier" | "Impact";

const FARMER: { id: FarmerTab; label: CopyKey; icon: IconName }[] = [
  { id: "Home", label: "tabHome", icon: "home" },
  { id: "Parcelle", label: "tabParcel", icon: "map" },
  { id: "Planter", label: "tabAdvice", icon: "sprout" },
  { id: "Assistant", label: "tabAssistant", icon: "mic" },
  { id: "Label", label: "tabLabel", icon: "badge" },
];

const BUYER: { id: BuyerTab; label: CopyKey; icon: IconName }[] = [
  { id: "Marche", label: "tabMarket", icon: "basket" },
  { id: "Scanner", label: "tabScan", icon: "scan" },
  { id: "Panier", label: "tabCart", icon: "cart" },
  { id: "Impact", label: "tabProfile", icon: "user" },
];

/**
 * Passe d'un onglet à l'autre sans empiler les écrans :
 * la pile reste [racine] ou [racine, onglet], donc « retour » ramène toujours à la racine.
 */
export function allerOnglet(navigation: Nav, racine: "Home" | "Marche", cible: keyof RootStackParamList) {
  const routes = cible === racine ? [{ name: racine }] : [{ name: racine }, { name: cible }];
  navigation.dispatch(CommonActions.reset({ index: routes.length - 1, routes }));
}

function TabBar<T extends string>({
  items,
  actif,
  onPress,
  badges = {},
}: {
  items: { id: T; label: CopyKey; icon: IconName }[];
  actif: T | null;
  onPress: (id: T) => void;
  badges?: Partial<Record<T, number>>;
}) {
  const { t, direction } = useI18n();
  const insets = useSafeAreaInsets();
  return (
    <View accessibilityRole="tablist" style={[styles.tabs, { paddingBottom: Math.max(insets.bottom, 10), direction }]}>
      {items.map((item) => {
        const on = item.id === actif;
        const color = on ? colors.olive : colors.muted;
        const badge = badges[item.id];
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t(item.label)}
            onPress={() => {
              if (!on) {
                onPress(item.id);
              }
            }}
            style={styles.tab}
          >
            <View style={[styles.tabIcon, on && styles.tabIconOn]}>
              <Icon name={item.icon} color={color} size={22} strokeWidth={2} />
              {badge ? (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{badge > 99 ? "99+" : badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.tabText, on && styles.tabOn]} numberOfLines={1}>
              {t(item.label)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function FarmerTabs({ actif }: { actif: FarmerTab | null }) {
  const navigation = useNavigation<Nav>();
  return <TabBar items={FARMER} actif={actif} onPress={(id) => allerOnglet(navigation, "Home", id)} />;
}

export function BuyerTabs({ actif }: { actif: BuyerTab | null }) {
  const navigation = useNavigation<Nav>();
  const { nombre } = usePanier();
  return <TabBar items={BUYER} actif={actif} badges={{ Panier: nombre }} onPress={(id) => allerOnglet(navigation, "Marche", id)} />;
}

const styles = StyleSheet.create({
  logo: { flexDirection: "row", alignItems: "center", gap: 6 },
  word: { ...police("800"), letterSpacing: -0.7 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  roundLight: { backgroundColor: colors.card },
  roundDark: { backgroundColor: "rgba(255,255,255,0.14)" },
  pressed: { opacity: 0.8 },
  tabs: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 10,
  },
  tab: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "flex-start", gap: 4 },
  tabIcon: { height: 24, alignItems: "center", justifyContent: "center" },
  tabIconOn: {},
  tabBadge: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.clay,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.card,
  },
  tabBadgeText: { color: colors.white, fontSize: 10, ...police("800") },
  tabText: { fontSize: 11, ...police("600"), color: colors.muted },
  tabOn: { color: colors.olive, ...police("800") },
});
