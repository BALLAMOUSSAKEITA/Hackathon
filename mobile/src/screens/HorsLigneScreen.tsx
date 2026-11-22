import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { api, ApiError } from "../api";
import { Icon } from "../components/icons";
import { Carte, EnTete, T } from "../components/maquetteC-ui";
import { Button, Footnote, Notice, Row, Screen } from "../components/ui";
import { sprint16 } from "../donnees";
import { formatNumber, useI18n } from "../i18n";
import { colors } from "../theme";

export function HorsLigneScreen() {
  const { lang, t, tx } = useI18n();
  const [accord, setAccord] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [retour, setRetour] = useState<{ tone: "success" | "error" | "warning"; text: string } | null>(null);

  async function envoyer() {
    setEnvoi(true);
    setRetour(null);
    try {
      await api("/hors-ligne/parcelle", { body: { ...sprint16.parcelle_a_envoyer, consentement: accord } });
      setRetour({ tone: "success", text: t("parcelSent") });
    } catch (erreur) {
      if (erreur instanceof ApiError && erreur.status === 422) {
        setRetour({ tone: "error", text: t("consentRequired") });
      } else if (erreur instanceof ApiError && erreur.status === 0) {
        setRetour({ tone: "warning", text: t("waitingNetwork") });
      } else {
        setRetour({ tone: "error", text: t("networkError") });
      }
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Screen contentStyle={styles.contenu}>
      <EnTete titre={t("offlineTitle")} />

      <View style={styles.bandeau}>
        <Icon name="wifiOff" color={colors.water} size={22} />
        <T size={13} weight="700" lh={1.4} color={colors.water} style={styles.flex}>
          {t("offlineBody")}
        </T>
      </View>

      <T size={15} weight="800">
        {t("savedAnalysis")}
      </T>
      <Carte>
        <Row>
          <View style={styles.flex}>
            <T size={12} weight="700" color={colors.muted}>
              {t("texture")}
            </T>
            <T size={18} weight="800">
              {tx(sprint16.analyse.texture)}
            </T>
          </View>
          <View style={styles.flex}>
            <T size={12} weight="700" color={colors.muted}>
              {t("energyPerM3")}
            </T>
            <T size={18} weight="800">
              {formatNumber(sprint16.analyse.kwh_m3, lang, 2)} kWh/m³
            </T>
          </View>
        </Row>
        <T size={12} color={colors.muted}>
          {sprint16.analyse.source}
        </T>
      </Carte>

      <T size={15} weight="800">
        {t("savedRanking")}
      </T>
      <Carte style={styles.classement}>
        {sprint16.classement.map((ligne, index) => (
          <View key={`${ligne.dt_m3}-${index}`} style={[styles.ligne, index > 0 && styles.ligneBord]}>
            <T size={13} weight="800" color={colors.olive}>
              {index + 1}
            </T>
            <T size={14} weight="700" style={styles.flex}>
              {tx(ligne.nom)}
            </T>
            <T size={14} weight="800" color={colors.olive}>
              {formatNumber(ligne.dt_m3, lang, 2)} DT/m³
            </T>
          </View>
        ))}
      </Carte>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accord }}
        onPress={() => setAccord((valeur) => !valeur)}
        style={({ pressed }) => [styles.case, pressed && styles.pressed]}
      >
        <View style={[styles.boite, accord && styles.boiteOn]}>{accord ? <Icon name="check" color={colors.white} size={16} strokeWidth={3} /> : null}</View>
        <T size={14} lh={1.4} color={colors.body} style={styles.flex}>
          {tx(sprint16.consentement)}
        </T>
      </Pressable>

      <Button label={t("sendParcel")} icon="send" loading={envoi} onPress={() => void envoyer()} />
      {retour ? <Notice tone={retour.tone} text={retour.text} /> : null}

      <Footnote>
        {t("photoCompressed", {
          nom: sprint16.photo.nom,
          a: formatNumber(sprint16.photo.octets, lang, 0),
          b: formatNumber(sprint16.photo.octets_compresses, lang, 0),
        })}
      </Footnote>
      <Footnote>{tx(sprint16.hypothese)}</Footnote>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contenu: { gap: 14, paddingTop: 24, paddingBottom: 32 },
  flex: { flex: 1 },
  bandeau: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.waterSoft, borderRadius: 16, padding: 14 },
  classement: { paddingVertical: 4, gap: 0 },
  ligne: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  ligneBord: { borderTopWidth: 1, borderTopColor: colors.line },
  case: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 56,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.card,
  },
  pressed: { opacity: 0.85 },
  boite: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: colors.lineStrong, alignItems: "center", justifyContent: "center" },
  boiteOn: { backgroundColor: colors.olive, borderColor: colors.olive },
});
