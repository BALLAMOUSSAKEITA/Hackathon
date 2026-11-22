import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api } from "../api";
import { FarmerTabs, Logo } from "../components/chrome";
import { Icon, type IconName } from "../components/icons";
import { TexteRiche } from "../components/maquetteA-riche";
import { Screen } from "../components/ui";
import { useCompte } from "../compte";
import { sprint07, sprint08, sprint11, sprint13 } from "../donnees";
import { fixture } from "../fixture";
import { formatNumber, useI18n, type CopyKey } from "../i18n";
import type { RootStackParamList } from "../navigation/types";
import { aLabelEau, colors, labelEau, police } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

type Outil = "Analyse" | "Simulateur" | "Solaire" | "Suivi" | "Ventes" | "Cultures";

const RACCOURCIS: { id: Outil; label: CopyKey; icon: IconName; color: string }[] = [
  { id: "Analyse", label: "shortAnalysis", icon: "layers", color: "#7A5A2E" },
  { id: "Simulateur", label: "shortSim", icon: "sliders", color: colors.olive },
  { id: "Solaire", label: "shortSolar", icon: "sun", color: colors.amber },
  { id: "Suivi", label: "shortTracking", icon: "satellite", color: colors.water },
  { id: "Ventes", label: "shortSales", icon: "store", color: colors.olive },
  { id: "Cultures", label: "shortCrops", icon: "book", color: colors.amber },
];

/** Heure où le soleil donne le plus, tirée du profil de pompage solaire (sprint 13). */
function meilleureHeure(): string {
  const tri = [...sprint13.heures].sort((a, b) => b.part - a.part);
  return tri[0]?.heure ?? "11 h";
}

export function HomeScreen({ navigation }: Props) {
  const { lang, t, tx, align, direction } = useI18n();
  const compte = useCompte("agriculteur");
  const [nonLues, setNonLues] = useState(() => sprint11.notifications.filter((n) => !n.lue).length);

  const actuel = sprint07.actuel;
  const accueil = sprint08.accueil;
  const parcelle = fixture.parcelle;
  const culture = tx(parcelle.culture_actuelle.nom);
  const texte = { textAlign: align } as const;

  // Gains du plan conseillé par rapport à la saison actuelle.
  const gainRevenu = actuel.revenu_dt > 0 ? Math.round(((accueil.bilan.revenu_dt - actuel.revenu_dt) / actuel.revenu_dt) * 100) : 0;
  const gainEau = actuel.eau_m3 > 0 ? Math.round((1 - accueil.bilan.eau_m3 / actuel.eau_m3) * 100) : 0;
  const phraseHero =
    gainRevenu > 0 && gainEau > 0
      ? t("mqaHeroBody", {
          culture: lang === "fr" ? culture.toLowerCase() : culture,
          rev: formatNumber(gainRevenu, lang, 0),
          eau: formatNumber(gainEau, lang, 0),
        })
      : t("potentialBody", {
          culture: lang === "fr" ? culture.toLowerCase() : culture,
          eau: formatNumber(accueil.bilan.eau_m3, lang, 0),
          kwh: formatNumber(accueil.bilan.energie_kwh, lang, 0),
        });

  // Le compteur se met à jour à chaque retour sur l'accueil.
  useFocusEffect(
    useCallback(() => {
      const controleur = new AbortController();
      api<{ notifications: { lue: boolean }[] }>("/notifications", { signal: controleur.signal, timeoutMs: 4000 })
        .then((corps) => setNonLues(corps.notifications.filter((n) => !n.lue).length))
        .catch(() => undefined);
      return () => controleur.abort();
    }, []),
  );

  const aLabel = aLabelEau(actuel.label);
  const peutAvoir = aLabelEau(accueil.label_potentiel) || !aLabel;

  return (
    <Screen tabs={<FarmerTabs actif="Home" />} contentStyle={styles.content}>
      <View style={styles.top}>
        <Logo size={22} />
        <View style={styles.topRight}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("profileSettings")}
            hitSlop={4}
            onPress={() => navigation.navigate("Reglages")}
            style={({ pressed }) => [styles.round, pressed && styles.pressed]}
          >
            <Icon name="user" color={colors.olive} size={22} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={nonLues ? t("notifUnread", { n: nonLues }) : t("mqaOpenNotifs")}
            hitSlop={4}
            onPress={() => navigation.navigate("Notifications")}
            style={({ pressed }) => [styles.round, pressed && styles.pressed]}
          >
            <Icon name="bell" color={colors.olive} size={22} />
            {nonLues > 0 ? <View style={styles.dot} /> : null}
          </Pressable>
        </View>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel={t("profileSettings")} onPress={() => navigation.navigate("Reglages")}>
        <Text style={[styles.hello, texte]}>{t("hello")}</Text>
        <Text style={[styles.name, texte]}>{compte.nom}</Text>
      </Pressable>

      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Text style={[styles.heroPlace, texte]} numberOfLines={1}>
            {fixture.ferme.nom} · {fixture.ferme.region}
          </Text>
          <Text style={styles.heroHa}>
            {formatNumber(parcelle.surface_ha, lang, 1)} {t("unitHa")}
          </Text>
        </View>
        <View style={styles.heroLabels}>
          <View style={styles.heroBadges}>
            {aLabel ? (
              <View style={[styles.badge, { backgroundColor: labelEau.bg }]}>
                <Icon name="drop" color={labelEau.fg} size={14} strokeWidth={2} />
                <Text style={[styles.badgeText, { color: labelEau.fg }]}>EAU</Text>
              </View>
            ) : (
              <View style={[styles.badge, styles.badgeNone]}>
                <Text style={[styles.badgeText, { color: colors.muted }]}>{t("noLabel")}</Text>
              </View>
            )}
            {peutAvoir && !aLabel ? (
              <>
                <Icon name={direction === "rtl" ? "arrowLeft" : "arrowRight"} color={colors.white} size={22} strokeWidth={2.2} />
                <View style={[styles.badge, { backgroundColor: labelEau.bg, opacity: 0.7 }]}>
                  <Icon name="drop" color={labelEau.fg} size={14} strokeWidth={2} />
                  <Text style={[styles.badgeText, { color: labelEau.fg }]}>EAU</Text>
                </View>
              </>
            ) : null}
          </View>
          <Text style={[styles.heroTitle, texte]}>{aLabel ? t("labelEauActive") : t("labelEauPotential")}</Text>
        </View>
        <TexteRiche texte={phraseHero} style={styles.heroBody} fort={styles.heroStrong} />
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("Planter")}
          style={({ pressed }) => [styles.heroBtn, pressed && styles.pressed]}
        >
          <Text style={styles.heroBtnText}>{t("seeReco")}</Text>
        </Pressable>
      </View>

      <View style={styles.season}>
        <Text style={[styles.h2, texte]}>
          {t("currentSeason")} · {culture}
        </Text>
        <View style={styles.tiles}>
          <Tuile icon="drop" color={colors.water} valeur={`${formatNumber(actuel.eau_m3, lang, 0)} m³`} label={t("waterSeason")} />
          <Tuile icon="bolt" color={colors.amber} valeur={`${formatNumber(actuel.energie_kwh, lang, 0)} kWh`} label={t("pumping")} />
          <Tuile icon="money" color={colors.olive} valeur={`${formatNumber(actuel.revenu_dt, lang, 0)} ${t("unitDt")}`} label={t("revenueEst")} />
        </View>
      </View>

      <View style={styles.tip}>
        <View style={styles.tipIcon}>
          <Icon name="sun" color={colors.amber} size={22} />
        </View>
        <View style={styles.tipBody}>
          <Text style={[styles.h2, texte]}>{t("tipTitle")}</Text>
          <Text style={[styles.tipText, texte]}>{t("mqaTipBody", { heure: meilleureHeure() })}</Text>
          <Pressable accessibilityRole="link" hitSlop={8} onPress={() => navigation.navigate("Suivi")} style={styles.tipLinkWrap}>
            <Text style={[styles.tipLink, texte]}>
              {t("seeTracking")} {direction === "rtl" ? "←" : "→"}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.tools}>
        <Text style={[styles.toolsTitle, texte]}>{t("quickActions")}</Text>
        <View style={styles.toolsGrid}>
          {RACCOURCIS.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => navigation.navigate(item.id)}
              style={({ pressed }) => [styles.tool, pressed && styles.pressed]}
            >
              <Icon name={item.icon} color={item.color} size={18} />
              <Text style={styles.toolText} numberOfLines={1}>
                {t(item.label)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
  );
}

function Tuile({ icon, color, valeur, label }: { icon: IconName; color: string; valeur: string; label: string }) {
  const { align } = useI18n();
  return (
    <View style={styles.tile}>
      <Icon name={icon} color={color} size={20} />
      <Text style={[styles.tileValue, { textAlign: align }]} numberOfLines={1} adjustsFontSizeToFit>
        {valeur}
      </Text>
      <Text style={[styles.tileLabel, { textAlign: align }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 24, gap: 18 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  topRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.oliveMist,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.clay,
    borderWidth: 2,
    borderColor: colors.oliveMist,
  },
  pressed: { opacity: 0.85 },
  hello: { fontSize: 14, color: colors.muted, ...police("600") },
  name: { marginTop: 2, fontSize: 26, lineHeight: 32, letterSpacing: -0.5, color: colors.ink, ...police("800") },
  hero: { backgroundColor: colors.olive, borderRadius: 22, padding: 20, gap: 14 },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  heroPlace: { flex: 1, fontSize: 13, color: colors.leaf, ...police("600") },
  heroHa: {
    fontSize: 12,
    color: colors.white,
    backgroundColor: colors.oliveDeep,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    overflow: "hidden",
    ...police("700"),
  },
  heroLabels: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroBadges: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 4 },
  badgeNone: { backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  badgeText: { fontSize: 13, ...police("800") },
  heroTitle: { flex: 1, fontSize: 15, lineHeight: 20, color: colors.white, ...police("700") },
  heroBody: { fontSize: 14, lineHeight: 20, color: colors.oliveSoft },
  heroStrong: { color: colors.white },
  heroBtn: { minHeight: 48, borderRadius: 14, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  heroBtnText: { fontSize: 15, color: colors.olive, ...police("800") },
  season: { gap: 10 },
  h2: { fontSize: 15, lineHeight: 20, color: colors.ink, ...police("800") },
  tiles: { flexDirection: "row", gap: 10 },
  tile: { flex: 1, backgroundColor: colors.card, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 12, gap: 6 },
  tileValue: { fontSize: 17, color: colors.ink, ...police("800") },
  tileLabel: { fontSize: 12, color: colors.muted, ...police("600") },
  tip: { backgroundColor: colors.card, borderRadius: 18, padding: 16, flexDirection: "row", gap: 14, alignItems: "flex-start" },
  tipIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.sand, alignItems: "center", justifyContent: "center" },
  tipBody: { flex: 1, gap: 4 },
  tipText: { fontSize: 14, lineHeight: 20, color: colors.body, ...police("400") },
  tipLinkWrap: { alignSelf: "flex-start", minHeight: 28, justifyContent: "center" },
  tipLink: { fontSize: 13, color: colors.olive, ...police("800") },
  tools: { gap: 8 },
  toolsTitle: { fontSize: 13, color: colors.muted, ...police("700") },
  toolsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tool: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  toolText: { fontSize: 13, color: colors.ink, ...police("700") },
});
