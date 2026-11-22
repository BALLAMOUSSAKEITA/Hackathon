import { useEffect, useState } from "react";
import { Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { API_URL, api } from "../api";
import { FarmerTabs } from "../components/chrome";
import { Icon, type IconName } from "../components/icons";
import { CarreLabel, EnTeteB, LienB, QrB } from "../components/maquetteB-ui";
import { Footnote, Notice, Pill, Screen } from "../components/ui";
import { sprint07, sprint08, sprint10 } from "../donnees";
import { formatNumber, useI18n, type CopyKey } from "../i18n";
import type { RootStackParamList } from "../navigation/types";
import type { Lang, Localized } from "../types";
import { aLabelEau, colors, labelEau, police } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Label">;

type FicheLabel = { qr: string; note: string | null; statut: string; ferme: string; produit: Localized };

const ETIQUETTE = sprint08.labels[0];
const STATUTS: Record<string, { cle: CopyKey; ton: "olive" | "clay" | "amber" }> = {
  actif: { cle: "labelActive", ton: "olive" },
  suspendu: { cle: "labelSuspended", ton: "clay" },
  en_verification: { cle: "labelChecking", ton: "amber" },
};

/** Libellé et détail de chaque vérification, selon son type (fixture sprint 08). */
const VERIFS: Record<string, { titre: CopyKey; detail?: CopyKey }> = {
  culture: { titre: "bVerifCulture" },
  irrigation: { titre: "bVerifIrrigation", detail: "bVerifIrrigationDetail" },
};

const KICKER = "#CFE5D3";
const SOUS_HERO = "#E2EFE4";
const ROND_VIDE = "#9FB38A";

/**
 * Les fixtures ne datent pas les vérifications : on les déduit.
 * Sentinel-2 repasse tous les 5 jours ; la dernière vérification est le dernier passage,
 * la suivante a lieu un mois plus tard (contrôle mensuel du label).
 */
function datesVerification(maintenant = new Date()) {
  const jour = 24 * 3600 * 1000;
  const jours = Math.floor(maintenant.getTime() / jour);
  const derniere = new Date((jours - (jours % 5)) * jour);
  const prochaine = new Date(derniere);
  prochaine.setMonth(prochaine.getMonth() + 1);
  return { derniere, prochaine };
}

function formatDate(date: Date, lang: Lang) {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-TN" : "fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function LabelScreen({ navigation }: Props) {
  const { lang, t, tx, align } = useI18n();
  const [fiche, setFiche] = useState<FicheLabel>(ETIQUETTE as FicheLabel);
  const [horsLigne, setHorsLigne] = useState(false);
  const [essai, setEssai] = useState(0);
  const [impression, setImpression] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [dates] = useState(() => datesVerification());

  useEffect(() => {
    const controleur = new AbortController();
    api<FicheLabel>(`/labels/${ETIQUETTE.qr}`, { signal: controleur.signal })
      .then((corps) => {
        setFiche(corps);
        setHorsLigne(false);
      })
      .catch(() => {
        if (!controleur.signal.aborted) {
          setHorsLigne(true);
        }
      });
    return () => controleur.abort();
  }, [essai]);

  const note = fiche.note;
  const statut = STATUTS[fiche.statut] ?? STATUTS.en_verification;
  const fond = aLabelEau(note) ? labelEau.bg : colors.muted;
  const produitAcheteur = sprint10.produits.find((p) => p.ferme === fiche.ferme) ?? sprint10.produits[0];
  // Économies : aujourd'hui (tomate, sprint 07) moins le plan labellisé (bilan du sprint 08).
  const bilan = sprint08.accueil.bilan;
  const eauEconomisee = Math.max(0, sprint07.actuel.eau_m3 - bilan.eau_m3);
  const kwhEconomises = Math.max(0, sprint07.actuel.energie_kwh - bilan.energie_kwh);
  const lien = `${API_URL}/labels/${fiche.qr}`;
  const texte = { textAlign: align };

  async function imprimer() {
    setImpression(null);
    try {
      if (Platform.OS === "web" && typeof window !== "undefined" && typeof window.print === "function") {
        window.print();
        return;
      }
      const resultat = await Share.share({
        title: t("bPrintLabels"),
        message: t("bPrintShare", { ferme: fiche.ferme, qr: fiche.qr, lien }),
      });
      if (resultat.action === Share.sharedAction) {
        setImpression({ tone: "success", text: t("bPrintDone") });
      }
    } catch {
      setImpression({ tone: "error", text: t("bPrintError") });
    }
  }

  return (
    <Screen tabs={<FarmerTabs actif="Label" />} contentStyle={styles.contenu}>
      <EnTeteB titre={t("myLabel")} />

      {horsLigne ? <Notice tone="warning" text={t("offline")} action={{ label: t("retry"), onPress: () => setEssai((n) => n + 1) }} /> : null}

      <View style={[styles.hero, { backgroundColor: fond }]}>
        <CarreLabel note={note} taille={88} rayon={24} inverse />
        <View style={styles.heroTexte}>
          <Text style={[styles.kicker, texte]}>{t("labelEauTitle")}</Text>
          <Text style={[styles.ferme, texte]}>{fiche.ferme}</Text>
          <Text style={[styles.cultures, texte]}>{tx(fiche.produit)}</Text>
          {fiche.statut !== "actif" ? (
            <View style={styles.statut}>
              <Pill tone="white" icon="alert" text={t(statut.cle)} />
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.tuiles}>
        <Tuile icone="drop" couleur={colors.water} valeur={`${formatNumber(eauEconomisee, lang, 0)} m³`} libelle={t("waterSaved")} />
        <Tuile icone="bolt" couleur={colors.amber} valeur={`${formatNumber(kwhEconomises, lang, 0)} kWh`} libelle={t("energySaved")} />
      </View>

      <View style={styles.carte}>
        <Text style={[styles.carteTitre, texte]}>{t("satelliteCheck")}</Text>
        {sprint08.verifications.map((ligne, index) => {
          const libelles = VERIFS[ligne.type];
          const titre = libelles ? t(libelles.titre) : ligne.resultat.charAt(0).toUpperCase() + ligne.resultat.slice(1);
          const detail = index === 0 || !libelles?.detail ? `Sentinel-2 · ${formatDate(dates.derniere, lang)}` : t(libelles.detail);
          return <Etape key={ligne.id} fait titre={titre} detail={detail} />;
        })}
        <Etape fait={false} titre={t("bNextCheck")} detail={formatDate(dates.prochaine, lang)} />
      </View>

      <View style={styles.qrCarte}>
        <QrB code={fiche.qr} />
        <View style={styles.qrDroite}>
          <Text style={[styles.carteTitre, texte]}>{t("qrTitle")}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void imprimer()}
            style={({ pressed }) => [styles.imprimer, pressed && styles.presse]}
          >
            <Text style={styles.imprimerTexte} numberOfLines={1}>
              {t("bPrintLabels")}
            </Text>
          </Pressable>
          <LienB onPress={() => navigation.navigate("Produit", { id: produitAcheteur.id })}>{t("buyerView")}</LienB>
          <LienB onPress={() => navigation.navigate("Ventes")}>{t("manageSales")}</LienB>
        </View>
      </View>

      {impression ? <Notice tone={impression.tone} text={impression.text} /> : null}

      <Footnote>{sprint08.hypothese[lang]}</Footnote>
    </Screen>
  );
}

function Tuile({ icone, couleur, valeur, libelle }: { icone: IconName; couleur: string; valeur: string; libelle: string }) {
  const { align } = useI18n();
  return (
    <View style={styles.tuile}>
      <Icon name={icone} color={couleur} size={20} />
      <Text style={[styles.tuileValeur, { textAlign: align }]} numberOfLines={1} adjustsFontSizeToFit>
        {valeur}
      </Text>
      <Text style={[styles.tuileLibelle, { textAlign: align }]}>{libelle}</Text>
    </View>
  );
}

function Etape({ fait, titre, detail }: { fait: boolean; titre: string; detail: string }) {
  const { align } = useI18n();
  return (
    <View style={styles.etape}>
      {fait ? (
        <View style={styles.rondPlein}>
          <Icon name="check" color={colors.white} size={14} strokeWidth={3} />
        </View>
      ) : (
        <View style={styles.rondVide} />
      )}
      <View style={styles.etapeTexte}>
        <Text style={[styles.etapeTitre, { textAlign: align }]}>{titre}</Text>
        <Text style={[styles.etapeDetail, { textAlign: align }]}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenu: { paddingTop: 24, gap: 14 },
  presse: { opacity: 0.85 },
  hero: { borderRadius: 22, padding: 20, flexDirection: "row", alignItems: "center", gap: 18 },
  heroTexte: { flex: 1, minWidth: 0, gap: 6 },
  kicker: { fontSize: 12, letterSpacing: 0.96, textTransform: "uppercase", color: KICKER, ...police("800") },
  ferme: { fontSize: 19, lineHeight: 23, color: colors.white, ...police("800") },
  cultures: { fontSize: 13, lineHeight: 18, color: SOUS_HERO, ...police("500") },
  statut: { flexDirection: "row" },
  tuiles: { flexDirection: "row", gap: 10 },
  tuile: { flex: 1, minWidth: 0, backgroundColor: colors.white, borderRadius: 16, padding: 14, gap: 4 },
  tuileValeur: { fontSize: 20, lineHeight: 26, color: colors.ink, ...police("800") },
  tuileLibelle: { fontSize: 12, lineHeight: 16, color: colors.muted, ...police("600") },
  carte: { backgroundColor: colors.white, borderRadius: 18, padding: 16, gap: 12 },
  carteTitre: { fontSize: 14, color: colors.ink, ...police("800") },
  etape: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  rondPlein: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.labelA,
    alignItems: "center",
    justifyContent: "center",
  },
  rondVide: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: ROND_VIDE },
  etapeTexte: { flex: 1, minWidth: 0 },
  etapeTitre: { fontSize: 13, lineHeight: 18, color: colors.ink, ...police("800") },
  etapeDetail: { fontSize: 13, lineHeight: 18, color: colors.muted, ...police("500") },
  qrCarte: { backgroundColor: colors.white, borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center", gap: 14 },
  qrDroite: { flex: 1, minWidth: 0, gap: 8 },
  imprimer: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.olive,
    alignItems: "center",
    justifyContent: "center",
  },
  imprimerTexte: { fontSize: 13, color: colors.white, ...police("800") },
});
