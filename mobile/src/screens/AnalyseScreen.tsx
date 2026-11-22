import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api } from "../api";
import { BackButton, FarmerTabs } from "../components/chrome";
import { Icon, type IconName } from "../components/icons";
import { Footnote, Loader, Notice, Screen } from "../components/ui";
import { fixture, sprint05, type AnalyseDemo } from "../fixture";
import { formatNumber, useI18n, type CopyKey } from "../i18n";
import type { RootStackParamList } from "../navigation/types";
import { colors, police } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Analyse">;

/** Couleurs des barres NDVI, reprises de la maquette. */
const NDVI_FORT = "#6E9A50";
const NDVI_MOYEN = "#9FB38A";
const NDVI_STRESS = "#D9822B";
const SEUIL_FORT = 0.4;
const SEUIL_STRESS = 0.21;

function couleurNdvi(valeur: number): string {
  return valeur >= SEUIL_FORT ? NDVI_FORT : valeur >= SEUIL_STRESS ? NDVI_MOYEN : NDVI_STRESS;
}

/** Plus longue suite de mois consécutifs sous le seuil de stress. */
function periodeStress(valeurs: number[]): { debut: number; fin: number } | null {
  let meilleur: { debut: number; fin: number } | null = null;
  let debut = -1;
  for (let index = 0; index < valeurs.length; index += 1) {
    if (valeurs[index] < SEUIL_STRESS) {
      if (debut < 0) {
        debut = index;
      }
      if (meilleur === null || index - debut > meilleur.fin - meilleur.debut) {
        meilleur = { debut, fin: index };
      }
    } else {
      debut = -1;
    }
  }
  return meilleur;
}

/** Classe climatique à partir de la pluie annuelle (seuils usuels pour la Tunisie). */
function classeClimat(pluieAn: number): CopyKey {
  if (pluieAn < 100) return "mqaArid";
  if (pluieAn < 400) return "mqaSemiArid";
  if (pluieAn < 800) return "mqaSubHumid";
  return "mqaHumid";
}

function majuscule(texte: string): string {
  return texte ? texte.charAt(0).toUpperCase() + texte.slice(1) : texte;
}

export function AnalyseScreen({ navigation }: Props) {
  const { lang, t, tx, align, direction } = useI18n();
  const [analyse, setAnalyse] = useState<AnalyseDemo>(sprint05.analyse);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [essai, setEssai] = useState(0);

  useEffect(() => {
    const controleur = new AbortController();
    // Les sources externes (sol, climat) peuvent être lentes : délai plus long.
    api<AnalyseDemo>(`/parcelles/${sprint05.parcelle.id}/analyse`, { method: "POST", timeoutMs: 20000, signal: controleur.signal })
      .then((corps) => {
        setAnalyse(corps);
        setErreur(false);
      })
      .catch(() => {
        if (!controleur.signal.aborted) {
          setAnalyse(sprint05.analyse);
          setErreur(true);
        }
      })
      .finally(() => {
        if (!controleur.signal.aborted) {
          setChargement(false);
        }
      });
    return () => controleur.abort();
  }, [essai]);

  function relancer() {
    setChargement(true);
    setErreur(false);
    setEssai((n) => n + 1);
  }

  const { sol, climat, ensoleillement: soleil } = analyse;
  const texte = { textAlign: align } as const;
  const fleche = direction === "rtl" ? "←" : "→";
  const fige = sol.fige || climat.fige || soleil.fige ? ` · ${t("frozenExample")}` : "";

  // Climat : la classe n'a de sens qu'avec une pluie annuelle ; sur une fenêtre courte on montre la température.
  const pluieAnnuelle = !climat.fenetre_jours;
  const valeurClimat = pluieAnnuelle ? t(classeClimat(climat.pluie_mm)) : `${formatNumber(climat.temperature_c, lang, 1)} °C`;
  const detailClimat = [
    pluieAnnuelle
      ? t("mqaRainYear", { n: formatNumber(climat.pluie_mm, lang, 0) })
      : t("mqaRainWindow", { n: formatNumber(climat.pluie_mm, lang, 0), j: climat.fenetre_jours ?? 0 }),
    pluieAnnuelle ? t("mqaAvgTemp", { n: formatNumber(climat.temperature_c, lang, 1) }) : null,
    t("mqaSunDay", { n: formatNumber(soleil.kwh_m2_jour, lang, 1) }),
  ]
    .filter(Boolean)
    .join(" · ");

  const blocs: { icon: IconName; couleur: string; titre: string; valeur: string; detail: string; lien?: { label: string; onPress: () => void } }[] = [
    {
      icon: "layers",
      couleur: "#7A5A2E",
      titre: t("soil"),
      valeur: majuscule(tx(sol.texture)),
      detail: `${t("ph")} ${formatNumber(sol.ph, lang, 1)} · ${t("mqaOrganicG", { n: formatNumber(sol.matiere_organique_g_kg, lang, 1) })}`,
    },
    {
      icon: "sun",
      couleur: colors.amber,
      titre: t("climate"),
      valeur: valeurClimat,
      detail: detailClimat,
    },
    {
      icon: "drop",
      couleur: colors.water,
      titre: t("water"),
      valeur: `≈ ${formatNumber(analyse.eau_disponible_m3, lang, 0)} m³`,
      detail: [
        t("perSeason"),
        analyse.profondeur_puits_m > 0 ? t("mqaWellOf", { n: formatNumber(analyse.profondeur_puits_m, lang, 0) }) : null,
        `${formatNumber(analyse.debit_m3_h, lang, 0)} ${t("unitFlow")}`,
      ]
        .filter(Boolean)
        .join(" · "),
    },
    {
      icon: "bolt",
      couleur: colors.amber,
      titre: t("energy"),
      valeur: `${formatNumber(analyse.kwh_m3, lang, 2)} kWh/m³`,
      detail: `${t("pumpToLift")} · ${t("mqaEta", { n: formatNumber(analyse.eta, lang, 1) })}`,
      lien: { label: `${t("seeSolar")} ${fleche}`, onPress: () => navigation.navigate("Solaire") },
    },
  ];

  const valeursNdvi = analyse.ndvi.map((p) => p.valeur);
  const ndviMax = Math.max(0.01, ...valeursNdvi);
  const stress = periodeStress(valeursNdvi);
  const titreStress = stress
    ? stress.debut === stress.fin
      ? t("mqaStressOne", { a: tx(analyse.ndvi[stress.debut].mois) })
      : t("mqaStressRange", { a: tx(analyse.ndvi[stress.debut].mois), b: tx(analyse.ndvi[stress.fin].mois) })
    : null;

  const sources = [sol.source, climat.source, soleil.source, analyse.source_ndvi].filter(Boolean).join(", ");

  return (
    <Screen tabs={<FarmerTabs actif="Parcelle" />} refreshing={chargement} onRefresh={() => relancer()} contentStyle={styles.content}>
      <View style={styles.entete}>
        <BackButton />
        <View style={styles.flex}>
          <Text style={[styles.h1, texte]}>{t("analysisTitle")}</Text>
          <Text style={[styles.sousTitre, texte]}>
            {fixture.parcelle.nom} · {formatNumber(fixture.parcelle.surface_ha, lang, 1)} {t("unitHa")} · {t("mqaToday")}
          </Text>
        </View>
      </View>

      <View style={styles.sources}>
        <Icon name="satellite" color={colors.oliveDeep} size={16} />
        <Text style={[styles.sourcesText, texte]}>
          {t("sources")} : {sources}
          {fige}
        </Text>
      </View>

      {chargement ? <Loader label={t("loadingAnalysis")} /> : null}
      {erreur ? <Notice tone="warning" text={t("analysisError")} action={{ label: t("retry"), onPress: () => relancer() }} /> : null}

      <View style={styles.grille}>
        {blocs.map((bloc) => (
          <View key={bloc.titre} style={styles.bloc}>
            <View style={styles.blocTete}>
              <Icon name={bloc.icon} color={bloc.couleur} size={20} />
              <Text style={[styles.blocTitre, texte]}>{bloc.titre}</Text>
            </View>
            <Text style={[styles.blocValeur, texte]}>{bloc.valeur}</Text>
            <Text style={[styles.blocDetail, texte]}>{bloc.detail}</Text>
            {bloc.lien ? (
              <Pressable accessibilityRole="link" hitSlop={8} onPress={bloc.lien.onPress} style={styles.lienWrap}>
                <Text style={[styles.lien, texte]}>{bloc.lien.label}</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      <View style={styles.carte}>
        <View style={styles.carteTete}>
          <Text style={[styles.carteTitre, texte]}>{t("ndviTitle")}</Text>
          <Text style={styles.carteMeta}>{t("mqaMonths", { n: analyse.ndvi.length })}</Text>
        </View>
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={`${t("mqaNdviLabel")} : ${analyse.ndvi.map((p) => `${tx(p.mois)} ${formatNumber(p.valeur, lang, 2)}`).join(", ")}`}
          style={styles.barres}
        >
          {analyse.ndvi.map((point, index) => (
            <View
              key={`${point.mois.fr}-${index}`}
              style={[styles.barre, { height: `${Math.max(8, (point.valeur / ndviMax) * 80)}%`, backgroundColor: couleurNdvi(point.valeur) }]}
            />
          ))}
        </View>
        {titreStress ? (
          <Text style={[styles.ndviPhrase, texte]}>
            <Text style={styles.ndviStress}>{titreStress}</Text>
            {t("mqaStressBody")}
          </Text>
        ) : (
          <Text style={[styles.ndviPhrase, texte]}>{t("mqaNoStress")}</Text>
        )}
      </View>

      <View style={styles.carte}>
        <Text style={[styles.compoTitre, texte]}>{t("texture")}</Text>
        <View style={styles.compo}>
          <View style={[styles.compoPart, { flex: Math.max(sol.sable_pct, 1), backgroundColor: "#D9A45B" }]} />
          <View style={[styles.compoPart, { flex: Math.max(sol.limon_pct, 1), backgroundColor: "#A88B6A" }]} />
          <View style={[styles.compoPart, { flex: Math.max(sol.argile_pct, 1), backgroundColor: "#7A5B44" }]} />
        </View>
        <View style={styles.legendes}>
          <Legende couleur="#D9A45B" texte={`${t("sand")} ${formatNumber(sol.sable_pct, lang, 0)} %`} />
          <Legende couleur="#A88B6A" texte={`${t("silt")} ${formatNumber(sol.limon_pct, lang, 0)} %`} />
          <Legende couleur="#7A5B44" texte={`${t("clay")} ${formatNumber(sol.argile_pct, lang, 0)} %`} />
        </View>
      </View>

      <Pressable accessibilityRole="button" onPress={() => navigation.navigate("Planter")} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
        <Text style={styles.ctaText}>{t("seeCrops")}</Text>
        <Icon name={direction === "rtl" ? "arrowLeft" : "arrowRight"} color={colors.white} size={20} strokeWidth={2.2} />
      </Pressable>

      <Footnote>{sprint05.hypothese[lang]}</Footnote>
    </Screen>
  );
}

function Legende({ couleur, texte }: { couleur: string; texte: string }) {
  return (
    <View style={styles.legende}>
      <View style={[styles.point, { backgroundColor: couleur }]} />
      <Text style={styles.legendeText}>{texte}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },
  content: { paddingTop: 8, gap: 14 },
  entete: { flexDirection: "row", alignItems: "center", gap: 12 },
  h1: { fontSize: 22, lineHeight: 28, letterSpacing: -0.4, color: colors.ink, ...police("800") },
  sousTitre: { marginTop: 2, fontSize: 13, color: colors.muted, ...police("600") },
  sources: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.oliveSoft,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  sourcesText: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.oliveDeep, ...police("700") },
  grille: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  bloc: { width: "48%", flexGrow: 1, flexBasis: "45%", backgroundColor: colors.card, borderRadius: 18, padding: 14, gap: 8 },
  blocTete: { flexDirection: "row", alignItems: "center", gap: 8 },
  blocTitre: { fontSize: 13, color: colors.ink, ...police("800") },
  blocValeur: { fontSize: 17, lineHeight: 20, color: colors.ink, ...police("800") },
  blocDetail: { fontSize: 12, lineHeight: 18, color: colors.muted, ...police("400") },
  lienWrap: { alignSelf: "flex-start", minHeight: 24, justifyContent: "center" },
  lien: { fontSize: 12, color: "#8A4E00", textDecorationLine: "underline", ...police("800") },
  carte: { backgroundColor: colors.card, borderRadius: 18, padding: 16, gap: 12 },
  carteTete: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 8 },
  carteTitre: { flex: 1, fontSize: 14, color: colors.ink, ...police("800") },
  carteMeta: { fontSize: 12, color: colors.muted, ...police("700") },
  barres: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 64 },
  barre: { flex: 1, borderRadius: 4 },
  ndviPhrase: { fontSize: 13, lineHeight: 19, color: colors.body, ...police("400") },
  ndviStress: { color: "#A3520F", ...police("800") },
  compoTitre: { fontSize: 13, color: colors.ink, ...police("800") },
  compo: { flexDirection: "row", height: 10, borderRadius: 5, overflow: "hidden", gap: 2 },
  compoPart: { height: 10 },
  legendes: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  legende: { flexDirection: "row", alignItems: "center", gap: 6 },
  point: { width: 8, height: 8, borderRadius: 4 },
  legendeText: { fontSize: 12, color: colors.muted, ...police("600") },
  cta: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.olive,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  ctaText: { fontSize: 16, color: colors.white, ...police("800") },
});
