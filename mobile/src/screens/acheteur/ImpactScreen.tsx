import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CommonActions } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api } from "../../api";
import { BuyerTabs } from "../../components/chrome";
import { Card, LabelBadge, ListRow, Notice, Screen } from "../../components/ui";
import { initiales, useCompte } from "../../compte";
import { sprint15 } from "../../donnees";
import { formatNumber, useI18n } from "../../i18n";
import type { RootStackParamList } from "../../navigation/types";
import { effacerCompte } from "../../session";
import { colors, police } from "../../theme";
import type { Lang } from "../../types";

type Props = NativeStackScreenProps<RootStackParamList, "Impact">;
type TypeCompte = "particulier" | "pro";

type CommandeImpact = { id: string; compte: string; ferme: string; label: string; eau_m3: number; energie_kwh: number; montant: number };

type Impact = {
  compte: string;
  eau_m3: number;
  energie_kwh: number;
  fermes: number;
  part_a: number;
  montant: number;
  commandes: CommandeImpact[];
};

const CLE_TYPE = "ardi.acheteur.type";
const CLE_DEPUIS = "ardi.acheteur.depuis";

const MOIS: Record<"fr" | "ar", string[]> = {
  fr: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
  ar: ["جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان", "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
};

function nomMois(iso: string, lang: Lang): string {
  const date = new Date(iso);
  const mois = MOIS[lang === "ar" ? "ar" : "fr"][date.getMonth()] ?? "";
  return date.getFullYear() === new Date().getFullYear() ? mois : `${mois} ${date.getFullYear()}`;
}

/** Même calcul que impact() dans api/app/suite.py. */
function impactLocal(compte: string): Impact {
  const commandes = (sprint15.commandes as CommandeImpact[]).filter((ligne) => ligne.compte === compte);
  const fermes = new Set(commandes.map((ligne) => ligne.ferme));
  const labelsA = commandes.filter((ligne) => ligne.label === "A");
  return {
    compte,
    eau_m3: commandes.reduce((somme, ligne) => somme + ligne.eau_m3, 0),
    energie_kwh: commandes.reduce((somme, ligne) => somme + ligne.energie_kwh, 0),
    fermes: fermes.size,
    part_a: commandes.length ? Math.floor((labelsA.length / commandes.length) * 100 + 0.5) / 100 : 0,
    montant: commandes.reduce((somme, ligne) => somme + ligne.montant, 0),
    commandes,
  };
}

export function ImpactScreen({ navigation }: Props) {
  const { t, lang, align } = useI18n();
  const compte = useCompte("acheteur");
  const [type, setType] = useState<TypeCompte>("particulier");
  const [depuis, setDepuis] = useState<string>(() => new Date().toISOString());
  const [bascule, setBascule] = useState<TypeCompte | null>(null);
  const [enBascule, setEnBascule] = useState(false);
  const identifiant = type === "pro" ? sprint15.compte_pro : sprint15.compte;
  const [impact, setImpact] = useState<Impact>(() => impactLocal(sprint15.compte));
  const [chargement, setChargement] = useState(true);
  const [horsLigne, setHorsLigne] = useState(false);
  const [essai, setEssai] = useState(0);

  // Type de compte et date d'arrivée, gardés sur le téléphone.
  useEffect(() => {
    let actif = true;
    Promise.all([AsyncStorage.getItem(CLE_TYPE), AsyncStorage.getItem(CLE_DEPUIS)])
      .then(([typeLu, depuisLu]) => {
        if (!actif) {
          return;
        }
        if (typeLu === "pro" || typeLu === "particulier") {
          setType(typeLu);
        }
        if (depuisLu && !Number.isNaN(Date.parse(depuisLu))) {
          setDepuis(depuisLu);
        } else {
          void AsyncStorage.setItem(CLE_DEPUIS, new Date().toISOString()).catch(() => undefined);
        }
      })
      .catch(() => undefined);
    return () => {
      actif = false;
    };
  }, []);

  useEffect(() => {
    const controleur = new AbortController();
    api<Impact>(`/impact?compte=${encodeURIComponent(identifiant)}`, { signal: controleur.signal })
      .then((corps) => {
        setImpact(corps);
        setHorsLigne(false);
      })
      .catch(() => {
        if (!controleur.signal.aborted) {
          setImpact(impactLocal(identifiant));
          setHorsLigne(true);
        }
      })
      .finally(() => {
        if (!controleur.signal.aborted) {
          setChargement(false);
        }
      });
    return () => controleur.abort();
  }, [identifiant, essai]);

  const fermes = useMemo(() => {
    const groupes = new Map<string, { ferme: string; label: string; nombre: number }>();
    for (const commande of impact.commandes ?? []) {
      const actuel = groupes.get(commande.ferme);
      if (actuel) {
        actuel.nombre += 1;
      } else {
        groupes.set(commande.ferme, { ferme: commande.ferme, label: commande.label, nombre: 1 });
      }
    }
    return [...groupes.values()];
  }, [impact]);

  const partA = Math.round((impact.part_a ?? 0) * 100);
  const nbCommandes = impact.commandes?.length ?? 0;

  function recharger() {
    setChargement(true);
    setEssai((n) => n + 1);
  }

  async function changerType(cible: TypeCompte) {
    setEnBascule(true);
    try {
      await AsyncStorage.setItem(CLE_TYPE, cible);
    } catch {
      // Le choix reste valable pour cette session.
    }
    setChargement(true);
    setType(cible);
    setBascule(cible);
    setEnBascule(false);
  }

  async function partager() {
    const texte = t("mdReportText", {
      eau: formatNumber(impact.eau_m3, lang, 0),
      fermes: formatNumber(impact.fermes, lang, 0),
      commandes: formatNumber(nbCommandes, lang, 0),
      partA: formatNumber(partA, lang, 0),
    });
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const lien = document.createElement("a");
      lien.href = URL.createObjectURL(new Blob([JSON.stringify({ resume: texte, ...impact }, null, 2)], { type: "application/json" }));
      lien.download = `impact-ardi-${identifiant}.json`;
      lien.click();
      return;
    }
    try {
      await Share.share({ message: texte });
    } catch {
      // Partage annulé.
    }
  }

  async function deconnecter() {
    try {
      await effacerCompte();
    } catch {
      // Rien à effacer.
    }
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Welcome" }] }));
  }

  const mois = nomMois(depuis, lang);

  return (
    <Screen tabs={<BuyerTabs actif="Impact" />} contentStyle={styles.contenu} refreshing={chargement} onRefresh={recharger}>
      <View style={styles.profil}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTexte}>{initiales(compte.nom)}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={[styles.nom, { textAlign: align }]}>{compte.nom}</Text>
          <Text style={[styles.depuis, { textAlign: align }]}>{t(type === "pro" ? "mdProSince" : "mdBuyerSince", { mois })}</Text>
        </View>
      </View>

      {horsLigne ? <Notice tone="warning" text={t("offline")} action={{ label: t("retry"), onPress: recharger }} /> : null}

      <View style={styles.eau}>
        <Text style={[styles.eauTitre, { textAlign: align }]}>{t("waterSupported")}</Text>
        <Text style={[styles.eauValeur, { textAlign: align }]}>{formatNumber(impact.eau_m3, lang, 0)} m³</Text>
        <Text style={[styles.eauNote, { textAlign: align }]}>{t("waterSupportedNote")}</Text>
      </View>

      <View style={styles.tuiles}>
        <View style={styles.tuile}>
          <Text style={[styles.tuileValeur, { textAlign: align }]}>{formatNumber(impact.fermes, lang, 0)}</Text>
          <Text style={[styles.tuileLibelle, { textAlign: align }]}>{t("farmsSupported")}</Text>
        </View>
        <View style={styles.tuile}>
          <Text style={[styles.tuileValeur, { textAlign: align }]}>{formatNumber(partA, lang, 0)} %</Text>
          <Text style={[styles.tuileLibelle, { textAlign: align }]}>{t("labelAShare")}</Text>
        </View>
        <View style={styles.tuile}>
          <Text style={[styles.tuileValeur, { textAlign: align }]}>{formatNumber(nbCommandes, lang, 0)}</Text>
          <Text style={[styles.tuileLibelle, { textAlign: align }]}>{t("ordersCount")}</Text>
        </View>
      </View>

      {fermes.length ? (
        <View style={styles.carte}>
          <Text style={[styles.h2, { textAlign: align }]}>{t("yourFarms")}</Text>
          {fermes.map((ferme, index) => (
            <View key={ferme.ferme} style={[styles.ferme, index > 0 && styles.fermeTrait]}>
              <View style={styles.flex}>
                <Text style={[styles.fermeNom, { textAlign: align }]}>{ferme.ferme}</Text>
                <Text style={[styles.fermeDetail, { textAlign: align }]}>{t("farmOrders", { n: ferme.nombre })}</Text>
              </View>
              <LabelBadge note={ferme.label} size={28} />
            </View>
          ))}
        </View>
      ) : null}

      {bascule ? <Notice tone="success" text={t(bascule === "pro" ? "mdProDone" : "mdPersonalDone")} /> : null}

      <View style={styles.pro}>
        <View style={styles.flex}>
          <Text style={[styles.proTitre, { textAlign: align }]}>{type === "pro" ? t("mdProActive") : t("proTitle")}</Text>
          <Text style={[styles.proTexte, { textAlign: align }]}>{type === "pro" ? t("mdProActiveBody") : t("proBody")}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: enBascule }}
          disabled={enBascule}
          onPress={() => void changerType(type === "pro" ? "particulier" : "pro")}
          style={({ pressed }) => [type === "pro" ? styles.proBoutonContour : styles.proBouton, (pressed || enBascule) && styles.presse]}
        >
          {enBascule ? (
            <ActivityIndicator color={type === "pro" ? colors.olive : colors.white} />
          ) : (
            <Text style={type === "pro" ? styles.proBoutonContourTexte : styles.proBoutonTexte}>{type === "pro" ? t("mdBackPersonal") : t("switchPro")}</Text>
          )}
        </Pressable>
      </View>

      <Card>
        <ListRow icon="book" title={Platform.OS === "web" ? t("downloadReport") : t("mdShareReport")} onPress={() => void partager()} />
        <ListRow icon="globe" title={t("settingsLang")} onPress={() => navigation.navigate("Reglages")} />
        <ListRow icon="logout" iconTone="clay" title={t("logout")} onPress={() => void deconnecter()} last />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contenu: { gap: 14, paddingTop: 20, paddingBottom: 24 },
  profil: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.waterSoft, alignItems: "center", justifyContent: "center" },
  avatarTexte: { color: "#154B80", fontSize: 18, ...police("800") },
  nom: { fontSize: 22, lineHeight: 28, letterSpacing: -0.44, color: colors.ink, ...police("800") },
  depuis: { marginTop: 2, fontSize: 13, color: colors.muted, ...police("600") },
  eau: { backgroundColor: colors.water, borderRadius: 22, padding: 20, gap: 6 },
  eauTitre: { fontSize: 13, color: "#D3E6F8", ...police("700") },
  eauValeur: { fontSize: 42, lineHeight: 50, letterSpacing: -1.26, color: colors.white, ...police("800") },
  eauNote: { fontSize: 13, lineHeight: 18, color: "#D3E6F8", ...police("500") },
  tuiles: { flexDirection: "row", gap: 8 },
  tuile: { flex: 1, backgroundColor: colors.card, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 10, gap: 2 },
  tuileValeur: { fontSize: 20, color: colors.ink, ...police("800") },
  tuileLibelle: { fontSize: 12, lineHeight: 16, color: colors.muted, ...police("600") },
  carte: { backgroundColor: colors.card, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, gap: 10 },
  h2: { fontSize: 14, color: colors.ink, ...police("800") },
  ferme: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
  fermeTrait: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8 },
  fermeNom: { fontSize: 14, color: colors.ink, ...police("800") },
  fermeDetail: { fontSize: 12, color: colors.muted, ...police("500") },
  pro: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: "#CFE0C8",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  proTitre: { fontSize: 14, color: colors.ink, ...police("800") },
  proTexte: { marginTop: 2, fontSize: 12, lineHeight: 17, color: colors.muted, ...police("500") },
  proBouton: { minHeight: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.olive, alignItems: "center", justifyContent: "center" },
  proBoutonTexte: { color: colors.white, fontSize: 13, ...police("800") },
  proBoutonContour: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.olive,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  proBoutonContourTexte: { color: colors.olive, fontSize: 13, ...police("800") },
  presse: { opacity: 0.85 },
});
