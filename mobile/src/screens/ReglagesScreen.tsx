import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CommonActions } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api } from "../api";
import { initiales, useCompte } from "../compte";
import { LanguageSwitch } from "../components/LanguageSwitch";
import { Carte, EnTete, Ligne, T } from "../components/maquetteC-ui";
import { Button, Footnote, LabelBadge, Notice, Pill, Row, Screen } from "../components/ui";
import type { IconName } from "../components/icons";
import { sprint17 } from "../donnees";
import { formatNumber, useI18n, type CopyKey } from "../i18n";
import type { RootStackParamList } from "../navigation/types";
import { effacerCompte } from "../session";
import { colors, police, space } from "../theme";
import type { Localized } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Reglages">;

type Ferme = {
  parcelles: { id: string; nom: string; figee: boolean }[];
  classement: { id: string; nom: Localized; dt_m3: number }[];
  plan_fige: { label: string } | null;
};

function cent(valeur: number) {
  return Math.floor(valeur * 100 + 0.5) / 100;
}

/** Même calcul que api/app/suite.py parcelles_proprietaire(), pour le mode hors ligne. */
function fermeLocale(): Ferme {
  const classement = sprint17.cultures
    .map((culture) => ({
      id: culture.id,
      nom: culture.nom,
      dt_m3: cent((culture.rendement_t_ha * 1000 * culture.prix - culture.couts_dt_ha) / culture.eau_m3_ha),
    }))
    .sort((a, b) => b.dt_m3 - a.dt_m3);
  return { parcelles: sprint17.parcelles, classement, plan_fige: sprint17.plan_fige };
}

const OUTILS: { route: keyof RootStackParamList; label: CopyKey; icon: IconName; couleur: string }[] = [
  { route: "Cultures", label: "toolCultures", icon: "book", couleur: colors.olive },
  { route: "Solaire", label: "screen8", icon: "sun", couleur: colors.amber },
  { route: "Suivi", label: "screen9", icon: "satellite", couleur: colors.water },
  { route: "Ventes", label: "screen10", icon: "store", couleur: colors.olive },
  { route: "Notifications", label: "screen11", icon: "bell", couleur: colors.olive },
  { route: "Demo", label: "scenario", icon: "play", couleur: colors.olive },
  { route: "HorsLigne", label: "toolOffline", icon: "wifiOff", couleur: colors.water },
  { route: "Admin", label: "toolAdmin", icon: "shield", couleur: colors.clay },
];

export function ReglagesScreen({ navigation }: Props) {
  const { lang, t, tx } = useI18n();
  const compte = useCompte("agriculteur");
  const [ferme, setFerme] = useState<Ferme | null>(null);
  const [horsLigne, setHorsLigne] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [retour, setRetour] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const [essai, setEssai] = useState(0);

  useEffect(() => {
    const controleur = new AbortController();
    api<Ferme>(`/proprietaires/${sprint17.proprietaire}/parcelles`, { signal: controleur.signal })
      .then((corps) => {
        setFerme(corps);
        setHorsLigne(false);
      })
      .catch(() => {
        if (!controleur.signal.aborted) {
          setFerme(fermeLocale());
          setHorsLigne(true);
        }
      });
    return () => controleur.abort();
  }, [essai]);

  async function appliquerPrix() {
    setEnvoi(true);
    setRetour(null);
    try {
      await api("/prix", { body: { culture: "olivier", typique: 12, source: "ONAGRI" } });
      setEssai((n) => n + 1);
      setRetour({ tone: "success", text: t("priceApplied") });
    } catch {
      setRetour({ tone: "error", text: t("networkError") });
    } finally {
      setEnvoi(false);
    }
  }

  async function deconnecter() {
    await effacerCompte().catch(() => undefined);
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Welcome" }] }));
  }

  return (
    <Screen contentStyle={styles.contenu}>
      <EnTete titre={t("settingsTitle")} sousTitre={compte.telephone} />

      <Carte style={styles.profil}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initiales(compte.nom)}</Text>
        </View>
        <View style={styles.flex}>
          <T size={17} weight="800">
            {compte.nom}
          </T>
          <T size={13} weight="600" color={colors.muted}>
            {compte.telephone}
          </T>
        </View>
        <Pill text={t(compte.role === "agriculteur" ? "farmer" : "buyer")} />
      </Carte>

      <T size={15} weight="800">
        {t("chooseLanguage")}
      </T>
      <LanguageSwitch />

      <T size={15} weight="800">
        {t("myFarm")}
      </T>
      {horsLigne ? <Notice tone="warning" text={t("offline")} /> : null}
      {ferme ? (
        <Carte>
          {ferme.parcelles.map((parcelle) => (
            <Row key={parcelle.id}>
              <T size={15} weight="800" style={styles.flex}>
                {parcelle.nom}
              </T>
              {parcelle.figee ? <Pill text={t("frozen")} tone="water" icon="shield" /> : null}
            </Row>
          ))}
          {ferme.plan_fige ? (
            <Row>
              <LabelBadge note={ferme.plan_fige.label} size={32} />
              <T size={13} color={colors.muted} style={styles.flex}>
                {t("frozenPlan", { label: ferme.plan_fige.label })}
              </T>
            </Row>
          ) : null}
          <View style={styles.ligne} />
          <T size={14} weight="800">
            {t("ranking")}
          </T>
          {ferme.classement.map((ligne, index) => (
            <Row key={ligne.id}>
              <T size={13} weight="800" color={colors.olive}>
                {index + 1}
              </T>
              <T size={14} weight="700" style={styles.flex}>
                {tx(ligne.nom)}
              </T>
              <T size={14} weight="800" color={colors.olive}>
                {formatNumber(ligne.dt_m3, lang, 2)} DT/m³
              </T>
            </Row>
          ))}
          <Button label={t("applyPrice")} variant="ghost" small icon="chart" loading={envoi} onPress={() => void appliquerPrix()} />
          {retour ? <Notice tone={retour.tone} text={retour.text} /> : null}
        </Carte>
      ) : null}

      <T size={15} weight="800">
        {t("tools")}
      </T>
      <Carte style={styles.liste}>
        {OUTILS.map((outil) => (
          <Ligne key={outil.route} icon={outil.icon} iconColor={outil.couleur} titre={t(outil.label)} onPress={() => navigation.navigate(outil.route as "Solaire")} />
        ))}
        <Ligne icon="logout" iconColor={colors.clay} titre={t("logout")} onPress={() => void deconnecter()} derniere />
      </Carte>

      <Footnote>{tx(sprint17.hypothese)}</Footnote>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contenu: { gap: 14, paddingTop: 24, paddingBottom: 32 },
  flex: { flex: 1 },
  profil: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.olive, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.white, fontSize: 18, ...police("800") },
  ligne: { height: 1, backgroundColor: colors.line },
  liste: { paddingVertical: space.xs, gap: 0 },
});
