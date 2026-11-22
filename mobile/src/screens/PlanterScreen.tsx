import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api, estAnnule } from "../api";
import { classerLocal, parcelleClassement, type Classement, type Ligne, type Tri } from "../classement";
import { FarmerTabs } from "../components/chrome";
import { Icon } from "../components/icons";
import { BoutonB, CarreLabel, EnTeteB, LienB, useFleche } from "../components/maquetteB-ui";
import { Footnote, Notice, Screen } from "../components/ui";
import { sprint03, sprint06 } from "../fixture";
import { formatNumber, useI18n, type CopyKey } from "../i18n";
import type { RootStackParamList } from "../navigation/types";
import { colors, police } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Planter">;

const TRIS: { id: Tri; label: CopyKey }[] = [
  { id: "revenu", label: "sortRevenue" },
  { id: "eau", label: "bSortLessWater" },
  { id: "delai", label: "bSortFast" },
];

const MOTIFS: Record<string, CopyKey> = {
  sol: "reasonSoil",
  sel: "reasonSalt",
  chaleur: "reasonHeat",
  eau: "reasonWater",
};

const FICHES = new Set(sprint03.cultures.map((c) => c.id));

const SAND_FOND = "#FBF8F1";
const SAND_BORD = "#EBD9B8";
const SAND_TEXTE = "#7A4300";

/** Sous-titre de la carte : déduit des données (intercalaire, pérenne ou saisonnière). */
function sousTitre(culture: Ligne): CopyKey {
  if (culture.intercalaire) return "intercrop";
  return culture.delai_mois >= 12 ? "bCropPerennial" : "bCropSeasonal";
}

export function PlanterScreen({ navigation }: Props) {
  const { lang, t, tx, align } = useI18n();
  const fleche = useFleche();
  const [tri, setTri] = useState<Tri>("revenu");
  const [classement, setClassement] = useState<Classement>(() => classerLocal("revenu"));
  const [chargement, setChargement] = useState(true);
  const [horsLigne, setHorsLigne] = useState(false);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [essai, setEssai] = useState(0);

  useEffect(() => {
    const controleur = new AbortController();
    api<Classement>(`/parcelles/${parcelleClassement}/recommandations?tri=${tri}`, { signal: controleur.signal })
      .then((corps) => {
        setClassement(corps);
        setHorsLigne(false);
      })
      .catch((erreur) => {
        if (!estAnnule(erreur)) {
          setHorsLigne(true);
        }
      })
      .finally(() => {
        if (!controleur.signal.aborted) {
          setChargement(false);
        }
      });
    return () => controleur.abort();
  }, [tri, essai]);

  function changerTri(suivant: Tri) {
    if (suivant === tri) return;
    // Affichage immédiat avec le calcul local, remplacé par la réponse de l'API.
    setTri(suivant);
    setClassement(classerLocal(suivant));
    setChargement(true);
  }

  function reessayer() {
    setChargement(true);
    setEssai((n) => n + 1);
  }

  const actuelle = classement.culture_actuelle;
  const motifs = actuelle.motifs.map((motif) => t(MOTIFS[motif] ?? "reasonSoil")).join(", ");
  const texte = { textAlign: align };

  return (
    <Screen tabs={<FarmerTabs actif="Planter" />} contentStyle={styles.contenu}>
      <EnTeteB titre={t("plantTitle")} sousTitre={t("plantSubtitle")} />

      <View style={styles.tris} accessibilityRole="radiogroup">
        {TRIS.map((option) => {
          const on = option.id === tri;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => changerTri(option.id)}
              style={({ pressed }) => [styles.tri, on && styles.triOn, pressed && styles.presse]}
            >
              <Text style={[styles.triTexte, on && styles.triTexteOn]} numberOfLines={2}>
                {t(option.label)}
              </Text>
            </Pressable>
          );
        })}
        {chargement ? <ActivityIndicator color={colors.olive} style={styles.chargement} /> : null}
      </View>

      {horsLigne ? <Notice tone="warning" text={t("offline")} action={{ label: t("retry"), onPress: reessayer }} /> : null}

      <View style={styles.liste}>
        {classement.cultures.map((culture, index) => {
          const deplie = ouvert === culture.id;
          const estActuelle = culture.id === actuelle.id;
          return (
            <Pressable
              key={culture.id}
              accessibilityRole="button"
              accessibilityState={{ expanded: deplie }}
              accessibilityHint={t("bTapForDetail")}
              onPress={() => setOuvert(deplie ? null : culture.id)}
              style={({ pressed }) => [styles.carte, estActuelle && styles.carteActuelle, pressed && styles.presse]}
            >
              <View style={styles.ligne}>
                <View style={styles.rang}>
                  <Text style={styles.rangTexte}>{formatNumber(index + 1, lang, 0)}</Text>
                </View>
                <View style={styles.corps}>
                  <Text style={[styles.nom, texte]} numberOfLines={2}>
                    {tx(culture.nom)}
                  </Text>
                  <Text style={[styles.sous, texte]} numberOfLines={1}>
                    {t(sousTitre(culture))}
                  </Text>
                </View>
                <View style={styles.prix}>
                  <Text style={styles.prixValeur}>
                    {formatNumber(culture.dt_m3, lang, 2)} {t("unitDt")}
                  </Text>
                  <Text style={styles.prixUnite}>{t("perM3Water")}</Text>
                </View>
                <CarreLabel note={culture.label} />
              </View>

              <View style={styles.infos}>
                <Text style={[styles.info, { color: colors.water }]}>{formatNumber(culture.eau_m3_ha, lang, 0)} m³/ha</Text>
                <Text style={[styles.info, { color: colors.amber }]}>{formatNumber(culture.kwh_ha, lang, 0)} kWh/ha</Text>
                <Text style={styles.info}>
                  {t("production")} : {tx(culture.delai)}
                </Text>
                {estActuelle ? (
                  <View style={styles.pastille}>
                    <Text style={styles.pastilleTexte}>{t("yourCrop")}</Text>
                  </View>
                ) : null}
              </View>

              {deplie ? (
                <View style={styles.detail}>
                  <Text style={[styles.detailTexte, texte]}>{tx(culture.pourquoi)}</Text>
                  {estActuelle && actuelle.ecart_dt_m3 ? (
                    <Text style={[styles.detailTexte, texte]}>
                      {t("gap")} : {formatNumber(actuelle.ecart_dt_m3, lang, 2)} {t("unitDt")}/m³
                    </Text>
                  ) : null}
                  {FICHES.has(culture.id) ? (
                    <LienB onPress={() => navigation.navigate("Fiche", { cultureId: culture.id })}>
                      {t("bOpenFiche")} {lang === "ar" ? "←" : "→"}
                    </LienB>
                  ) : null}
                </View>
              ) : null}
            </Pressable>
          );
        })}

        {!actuelle.incluse ? (
          <View style={[styles.carte, styles.carteActuelle]} accessibilityRole="alert">
            <View style={styles.ligne}>
              <View style={[styles.rang, styles.rangAlerte]}>
                <Icon name="alert" color={colors.amber} size={16} />
              </View>
              <View style={styles.corps}>
                <Text style={[styles.nom, texte]}>{tx(actuelle.nom)}</Text>
                <Text style={[styles.sous, texte]}>{t("bExcludedTitle")}</Text>
              </View>
              <CarreLabel note={actuelle.label} />
            </View>
            <View style={styles.infos}>
              <Text style={[styles.info, { color: colors.clay }]}>{t("notSuited", { motifs })}</Text>
              <View style={styles.pastille}>
                <Text style={styles.pastilleTexte}>{t("yourCrop")}</Text>
              </View>
            </View>
            {actuelle.meilleure ? (
              <View style={styles.infos}>
                <Text style={styles.info}>
                  {t("bestOption")} : <Text style={styles.gras}>{tx(actuelle.meilleure)}</Text>
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <BoutonB libelle={t("simulateMix")} icone={fleche} onPress={() => navigation.navigate("Simulateur")} />

      <Footnote>{sprint06.hypothese[lang]}</Footnote>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contenu: { paddingTop: 24, gap: 14 },
  presse: { opacity: 0.85 },
  tris: { flexDirection: "row", gap: 8, alignItems: "stretch" },
  tri: {
    flexGrow: 1,
    flexShrink: 1,
    alignItems: "center",
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.white,
    justifyContent: "center",
  },
  triOn: { backgroundColor: colors.olive, borderColor: colors.olive },
  triTexte: { fontSize: 13, lineHeight: 16, textAlign: "center", color: colors.ink, ...police("600") },
  triTexteOn: { color: colors.white, ...police("800") },
  chargement: { marginStart: 4 },
  liste: { gap: 10 },
  carte: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  carteActuelle: { backgroundColor: SAND_FOND, borderColor: SAND_BORD },
  ligne: { flexDirection: "row", alignItems: "center", gap: 12 },
  rang: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.oliveSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rangAlerte: { backgroundColor: colors.sand },
  rangTexte: { fontSize: 13, color: colors.olive, ...police("800") },
  corps: { flex: 1, minWidth: 0, gap: 1 },
  nom: { fontSize: 16, lineHeight: 21, color: colors.ink, ...police("800") },
  sous: { fontSize: 12, lineHeight: 16, color: colors.muted, ...police("600") },
  prix: { alignItems: "flex-end" },
  prixValeur: { fontSize: 18, lineHeight: 23, color: colors.olive, ...police("800") },
  prixUnite: { fontSize: 11, lineHeight: 14, color: colors.muted, ...police("700") },
  infos: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 12,
    rowGap: 6,
    paddingStart: 40,
  },
  info: { fontSize: 12, lineHeight: 16, color: colors.body, ...police("600") },
  gras: { ...police("800"), color: colors.ink },
  pastille: { backgroundColor: colors.sand, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999 },
  pastilleTexte: { fontSize: 12, color: SAND_TEXTE, ...police("800") },
  detail: {
    marginStart: 40,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: 6,
  },
  detailTexte: { fontSize: 13, lineHeight: 18, color: colors.body, ...police("500") },
});
