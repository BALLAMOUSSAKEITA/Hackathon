import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api } from "../api";
import { Carte, EnTete, T } from "../components/maquetteC-ui";
import { Button, Footnote, Notice, Screen } from "../components/ui";
import { sprint03, type CultureFiche } from "../fixture";
import { formatNumber, useI18n, type CopyKey } from "../i18n";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Fiche">;

const SOLS: Record<string, CopyKey> = {
  sableux: "solSableux",
  limoneux: "solLimoneux",
  argileux: "solArgileux",
  calcaire: "solCalcaire",
  salin: "solSalin",
};

const TOLERANCES: Record<string, CopyKey> = {
  faible: "tolFaible",
  moyenne: "tolMoyenne",
  elevee: "tolElevee",
};

export function FicheCultureScreen({ route, navigation }: Props) {
  const { lang, t, tx } = useI18n();
  const locale = sprint03.cultures.find((culture) => culture.id === route.params.cultureId) ?? null;
  const [culture, setCulture] = useState<CultureFiche | null>(locale);

  useEffect(() => {
    const controleur = new AbortController();
    api<CultureFiche>(`/cultures/${route.params.cultureId}`, { signal: controleur.signal })
      .then((corps) => {
        if (corps?.nom) {
          setCulture(corps);
        }
      })
      // Sans réseau, on garde la fiche du fichier.
      .catch(() => undefined);
    return () => controleur.abort();
  }, [route.params.cultureId]);

  if (!culture) {
    return (
      <Screen contentStyle={styles.contenu}>
        <EnTete titre="Ardi" />
        <Notice tone="error" text={t("networkError")} />
      </Screen>
    );
  }

  const sols = culture.sols.map((sol) => t(SOLS[sol] ?? "soils")).join(", ");
  const lignes: [string, string][] = [
    [
      t("priceRange"),
      `${formatNumber(culture.prix.min, lang, 1)} – ${formatNumber(culture.prix.max, lang, 1)} ${culture.prix.unite}`,
    ],
    [t("costs"), `${formatNumber(culture.couts_dt_ha, lang, 0)} ${t("perHectareDt")}`],
    [t("delay"), tx(culture.delai)],
    [t("soils"), sols],
    [t("salt"), t(TOLERANCES[culture.tolerance_sel] ?? "tolMoyenne")],
    [t("heat"), t(TOLERANCES[culture.tolerance_chaleur] ?? "tolMoyenne")],
    [t("kcLabel"), `${culture.kc.initial} / ${culture.kc.developpement} / ${culture.kc.mi_saison} / ${culture.kc.fin}`],
  ];

  return (
    <Screen contentStyle={styles.contenu}>
      <EnTete titre={tx(culture.nom)} sousTitre={tx(culture.delai)} />

      <View style={styles.hero}>
        <T size={13} weight="800" color={colors.leaf}>
          {t("typicalPrice")} · {formatNumber(culture.prix.typique, lang, 1)} {culture.prix.unite}
        </T>
        <View style={styles.grille3}>
          <HeroStat value={formatNumber(culture.besoin_eau_m3_ha, lang, 0)} unit="m³/ha" label={t("waterNeed")} />
          <HeroStat value={formatNumber(culture.rendement_t_ha, lang, 1)} unit={t("perHectare")} label={t("yield")} />
          <HeroStat value={formatNumber(culture.prix.typique, lang, 1)} unit={culture.prix.unite} label={t("typicalPrice")} />
        </View>
      </View>

      <Carte style={styles.details}>
        {lignes.map(([label, valeur], index) => (
          <View key={label} style={[styles.ligne, index > 0 && styles.ligneBord]}>
            <T size={13} weight="700" color={colors.muted} style={styles.flex}>
              {label}
            </T>
            <T size={14} weight="800" style={styles.valeur}>
              {valeur}
            </T>
          </View>
        ))}
      </Carte>

      <Button label={t("simulateMix")} arrow onPress={() => navigation.navigate("Simulateur")} />

      <Footnote>{tx(culture.source_prix)}</Footnote>
      <Footnote>{tx(sprint03.hypothese)}</Footnote>
    </Screen>
  );
}

function HeroStat({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <View style={styles.heroStat}>
      <T size={20} weight="800" color={colors.white} numberOfLines={1}>
        {value}
      </T>
      <T size={12} weight="600" color={colors.leaf}>
        {unit} · {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  contenu: { gap: 14, paddingTop: 24, paddingBottom: 32 },
  flex: { flex: 1 },
  hero: { backgroundColor: colors.olive, borderRadius: 20, padding: 18, gap: 12 },
  grille3: { flexDirection: "row", gap: 8 },
  heroStat: { flex: 1, gap: 2 },
  details: { paddingVertical: 4, gap: 0 },
  ligne: { flexDirection: "row", alignItems: "baseline", gap: 12, paddingVertical: 12 },
  ligneBord: { borderTopWidth: 1, borderTopColor: colors.line },
  valeur: { flexShrink: 1, maxWidth: "60%" },
});
