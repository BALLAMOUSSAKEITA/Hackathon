import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ApiError, api } from "../api";
import { FarmerTabs } from "../components/chrome";
import { BoutonB, CarreLabel, CurseurB, EnTeteB } from "../components/maquetteB-ui";
import { Footnote, Notice, Screen } from "../components/ui";
import { sprint07 } from "../donnees";
import { formatNumber, useI18n } from "../i18n";
import type { RootStackParamList } from "../navigation/types";
import { colors, police } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Simulateur">;

const PAS = 0.1;
const fiche = sprint07;

const GRIS = "#C9D3C6";
const VERT_CLAIR = "#A9DBB4";
const BLEU_CLAIR = "#A9CDF0";
const AMBRE_CLAIR = "#F3C98B";
const ROUGE_CLAIR = "#F2A99A";
const PISTE_SOMBRE = "#2F3D32";
const BLEU_PUITS = "#5FA2E0";

function cent(valeur: number) {
  return Math.floor(valeur * 100 + 0.5) / 100;
}

/** Même règle que lettre_label() dans api/app/suite.py. */
function lettre(dt: number, puitsOk: boolean) {
  if (dt < 0.8) return "E";
  if (puitsOk && dt >= 2.2) return "A";
  if (dt >= 1.5) return "B";
  if (dt >= 1.1) return "C";
  return "D";
}

type Message = { tone: "success" | "error"; text: string };

export function SimulateurScreen({ navigation }: Props) {
  const { lang, t, tx, align } = useI18n();
  const [parts, setParts] = useState<Record<string, number>>({ capres: 1.4, olivier: 1 });
  const [message, setMessage] = useState<Message | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const calcul = useMemo(() => {
    let surface = 0;
    let eau = 0;
    let revenu = 0;
    for (const culture of fiche.cultures) {
      const hectares = parts[culture.id] ?? 0;
      surface += hectares;
      eau += hectares * culture.eau_m3_ha;
      revenu += hectares * culture.revenu_dt_ha;
    }
    const dt = eau ? cent(revenu / eau) : 0;
    const alerteSurface = surface > fiche.surface_ha + 1e-6;
    const alertePuits = eau > fiche.capacite_puits_m3;
    return {
      surface: cent(surface),
      eau: Math.round(eau),
      revenu: Math.round(revenu),
      energie: Math.round(eau * fiche.kwh_m3),
      dt,
      label: lettre(dt, !alertePuits),
      alerteSurface,
      alertePuits,
    };
  }, [parts]);

  function changer(id: string, hectares: number) {
    setMessage(null);
    setParts((actuel) => ({ ...actuel, [id]: Math.max(0, cent(hectares)) }));
  }

  async function adopter() {
    const repartition = fiche.cultures
      .filter((culture) => (parts[culture.id] ?? 0) > 0)
      .map((culture) => ({ culture_id: culture.id, hectares: parts[culture.id] }));
    if (!repartition.length) {
      setMessage({ tone: "error", text: t("emptyPlan") });
      return;
    }
    setEnvoi(true);
    setMessage(null);
    try {
      const plan = await api<{ label: string; dt_m3: number }>(`/parcelles/${fiche.parcelle_id}/plan`, { body: { repartition } });
      setMessage({ tone: "success", text: t("planAdopted", { label: plan.label, dt: formatNumber(plan.dt_m3, lang, 2) }) });
    } catch (erreur) {
      setMessage({ tone: "error", text: erreur instanceof ApiError && erreur.status === 422 ? t("planRefused") : t("networkError") });
    } finally {
      setEnvoi(false);
    }
  }

  function variation(valeur: number, reference: number) {
    if (!reference) return "–";
    const pct = Math.round(((valeur - reference) / reference) * 100);
    const signe = pct > 0 ? "+" : pct < 0 ? "−" : "";
    return `${signe}${formatNumber(Math.abs(pct), lang, 0)} %`;
  }

  const bloque = calcul.alerteSurface || calcul.alertePuits || calcul.surface === 0;
  const remplissagePuits = Math.min(calcul.eau / fiche.capacite_puits_m3, 1);
  const texte = { textAlign: align };

  return (
    <Screen tabs={<FarmerTabs actif="Planter" />} contentStyle={styles.contenu}>
      <EnTeteB titre={t("simTitle")} sousTitre={t("simSubtitle", { ha: formatNumber(fiche.surface_ha, lang, 1) })} />

      <View style={styles.carte}>
        {fiche.cultures.map((culture) => {
          const ha = parts[culture.id] ?? 0;
          const autres = calcul.surface - ha;
          const borne = Math.max(0, cent(fiche.surface_ha - autres));
          const valeurTexte = `${formatNumber(ha, lang, 1)} ${t("unitHa")}`;
          return (
            <View key={culture.id} style={styles.culture}>
              <View style={styles.cultureTete}>
                <Text style={[styles.cultureNom, texte]} numberOfLines={1}>
                  {tx(culture.nom)}
                </Text>
                <Text style={styles.cultureHa}>{valeurTexte}</Text>
              </View>
              <CurseurB
                valeur={ha}
                max={fiche.surface_ha}
                pas={PAS}
                borne={borne}
                onChange={(v) => changer(culture.id, v)}
                libelle={tx(culture.nom)}
                texteValeur={valeurTexte}
              />
            </View>
          );
        })}
        <View style={styles.total}>
          <Text style={styles.totalLibelle}>{t("surfaceUsed")}</Text>
          <Text style={[styles.totalValeur, calcul.alerteSurface && { color: colors.clay }]}>
            {formatNumber(calcul.surface, lang, 1)} / {formatNumber(fiche.surface_ha, lang, 1)} {t("unitHa")}
          </Text>
        </View>
      </View>

      {calcul.alertePuits ? <Notice tone="error" text={t("wellOver")} /> : null}

      <View style={styles.resultat}>
        <View style={styles.resultatTete}>
          <Text style={styles.resultatTitre}>{t("resultMaturity")}</Text>
          <View style={styles.labelBloc}>
            <Text style={styles.labelMot}>{t("label")}</Text>
            <CarreLabel note={calcul.label} taille={36} inverse />
          </View>
        </View>

        <View style={styles.metriques}>
          <Metrique
            titre={t("revenue")}
            valeur={`${formatNumber(calcul.revenu, lang, 0)} ${t("unitDt")}`}
            variation={variation(calcul.revenu, fiche.actuel.revenu_dt)}
            couleur={VERT_CLAIR}
          />
          <Metrique
            titre={t("water")}
            valeur={`${formatNumber(calcul.eau, lang, 0)} m³`}
            variation={variation(calcul.eau, fiche.actuel.eau_m3)}
            couleur={BLEU_CLAIR}
          />
          <Metrique
            titre={t("energy")}
            valeur={`${formatNumber(calcul.energie, lang, 0)} kWh`}
            variation={variation(calcul.energie, fiche.actuel.energie_kwh)}
            couleur={AMBRE_CLAIR}
          />
        </View>

        <View style={styles.puits}>
          <View style={styles.puitsTete}>
            <Text style={styles.petitGris}>{t("wellCapacity")}</Text>
            <Text style={[styles.petitGris, calcul.alertePuits && { color: ROUGE_CLAIR }]}>
              {formatNumber(calcul.eau, lang, 0)} / {formatNumber(fiche.capacite_puits_m3, lang, 0)} m³
            </Text>
          </View>
          <View style={styles.puitsPiste}>
            <View
              style={[
                styles.puitsRempli,
                { width: `${remplissagePuits * 100}%`, backgroundColor: calcul.alertePuits ? colors.clay : BLEU_PUITS },
              ]}
            />
          </View>
        </View>

        <Text style={[styles.compare, texte]}>
          {t("bComparedShort", { ha: formatNumber(fiche.surface_ha, lang, 1), culture: tx(fiche.actuel.nom).toLowerCase() })}
        </Text>
      </View>

      {message ? (
        <Notice
          tone={message.tone}
          text={message.text}
          action={message.tone === "success" ? { label: t("bSeeMyLabel"), onPress: () => navigation.navigate("Label") } : undefined}
        />
      ) : null}

      <BoutonB libelle={t("adoptPlan")} icone="check" chargement={envoi} inactif={bloque} onPress={() => void adopter()} />

      <Footnote>{fiche.hypothese[lang]}</Footnote>
    </Screen>
  );
}

function Metrique({ titre, valeur, variation, couleur }: { titre: string; valeur: string; variation: string; couleur: string }) {
  const { align } = useI18n();
  return (
    <View style={styles.metrique}>
      <Text style={[styles.metriqueTitre, { textAlign: align }]}>{titre}</Text>
      <Text style={[styles.metriqueValeur, { textAlign: align }]} numberOfLines={1} adjustsFontSizeToFit>
        {valeur}
      </Text>
      <Text style={[styles.metriqueVar, { color: couleur, textAlign: align }]}>{variation}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenu: { paddingTop: 24, gap: 14 },
  carte: { backgroundColor: colors.white, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, gap: 10 },
  culture: { gap: 2 },
  cultureTete: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 8 },
  cultureNom: { flex: 1, fontSize: 14, color: colors.ink, ...police("800") },
  cultureHa: { fontSize: 14, color: colors.olive, ...police("800") },
  total: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 10,
  },
  totalLibelle: { fontSize: 13, color: colors.muted, ...police("700") },
  totalValeur: { fontSize: 13, color: colors.ink, ...police("800") },
  resultat: { backgroundColor: colors.ink, borderRadius: 20, padding: 16, gap: 14 },
  resultatTete: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  resultatTitre: { fontSize: 14, color: colors.leaf, ...police("800") },
  labelBloc: { flexDirection: "row", alignItems: "center", gap: 8 },
  labelMot: { fontSize: 12, color: GRIS, ...police("700") },
  metriques: { flexDirection: "row", gap: 10 },
  metrique: { flex: 1, minWidth: 0, gap: 2 },
  metriqueTitre: { fontSize: 12, color: GRIS, ...police("600") },
  metriqueValeur: { fontSize: 17, color: colors.white, ...police("800") },
  metriqueVar: { fontSize: 12, ...police("800") },
  puits: { gap: 6 },
  puitsTete: { flexDirection: "row", justifyContent: "space-between" },
  petitGris: { fontSize: 12, color: GRIS, ...police("700") },
  puitsPiste: { height: 8, borderRadius: 4, backgroundColor: PISTE_SOMBRE, overflow: "hidden" },
  puitsRempli: { height: 8, borderRadius: 4 },
  compare: { fontSize: 12, color: GRIS, ...police("400") },
});
