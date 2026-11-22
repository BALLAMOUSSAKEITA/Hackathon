import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, ApiError } from "../../api";
import { allerOnglet, BackButton, BuyerTabs } from "../../components/chrome";
import { Icon } from "../../components/icons";
import { HeroProduit, visuelProduit } from "../../components/maquetteD-produit";
import { StepperRond } from "../../components/maquetteD-ui";
import { LabelBadge, Loader, Notice } from "../../components/ui";
import { sprint10 } from "../../donnees";
import { formatNumber, useI18n } from "../../i18n";
import type { RootStackParamList } from "../../navigation/types";
import { usePanier, type ProduitMarche } from "../../panier";
import { aLabelEau, colors, police } from "../../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Produit">;

const LOCAL = sprint10.produits as ProduitMarche[];
const DEVIS_LOCAUX = "ardi.devis.attente";

type Devis =
  | { etat: "saisie" }
  | { etat: "envoi" }
  | { etat: "envoye"; id: string; quantite: number }
  | { etat: "local"; id: string; quantite: number }
  | { etat: "erreur" };

/** Écart en % à la moyenne du marché (négatif = moins que la moyenne). */
function ecartMoyenne(valeur: number, valeurs: number[]): number | null {
  const utiles = valeurs.filter((v) => Number.isFinite(v) && v > 0);
  if (!utiles.length || !(valeur > 0)) {
    return null;
  }
  const moyenne = utiles.reduce((s, v) => s + v, 0) / utiles.length;
  return Math.round((valeur / moyenne - 1) * 100);
}

export function ProduitScreen({ navigation, route }: Props) {
  const { t, tx, lang, align, direction } = useI18n();
  const insets = useSafeAreaInsets();
  const { ajouter } = usePanier();
  const id = route.params.id;
  const [catalogue, setCatalogue] = useState<ProduitMarche[]>(LOCAL);
  const [chargement, setChargement] = useState(true);
  const [quantite, setQuantite] = useState(1);
  const [ajout, setAjout] = useState<{ n: number; total: number } | null>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [devisOuvert, setDevisOuvert] = useState(false);
  const [devisQte, setDevisQte] = useState("");
  const [devis, setDevis] = useState<Devis>({ etat: "saisie" });
  const [devisInvalide, setDevisInvalide] = useState(false);

  useEffect(() => {
    const controleur = new AbortController();
    api<{ produits: ProduitMarche[] }>("/produits", { signal: controleur.signal })
      .then((corps) => {
        if (corps.produits?.length) {
          setCatalogue(corps.produits);
        }
      })
      .catch(() => {
        // On garde le catalogue local.
      })
      .finally(() => {
        if (!controleur.signal.aborted) {
          setChargement(false);
        }
      });
    return () => controleur.abort();
  }, [id]);

  useEffect(
    () => () => {
      if (minuterie.current) {
        clearTimeout(minuterie.current);
      }
    },
    [],
  );

  const produit = useMemo(() => catalogue.find((item) => item.id === id) ?? LOCAL.find((item) => item.id === id) ?? null, [catalogue, id]);

  const tuiles = useMemo(() => {
    if (!produit) {
      return null;
    }
    return {
      eau: ecartMoyenne(produit.eau_m3_kg, catalogue.map((p) => p.eau_m3_kg)),
      energie: ecartMoyenne(produit.kwh_kg, catalogue.map((p) => p.kwh_kg)),
      valeur: produit.eau_m3_kg > 0 ? produit.prix / produit.eau_m3_kg : null,
    };
  }, [produit, catalogue]);

  const tabs = <BuyerTabs actif="Scanner" />;

  if (!produit || !tuiles) {
    return (
      <View style={[styles.racine, { direction, paddingTop: insets.top + 16 }]}>
        <View style={styles.vide}>
          <BackButton />
          {chargement ? <Loader label={t("loading")} /> : <Notice tone="error" text={t("productNotFound")} />}
        </View>
        {tabs}
      </View>
    );
  }

  const visuel = visuelProduit(produit);
  const dt = (valeur: number) => formatNumber(valeur, lang, Number.isInteger(valeur) ? 0 : Number.isInteger(valeur * 10) ? 1 : 2);
  const pourcent = (valeur: number | null) => (valeur == null ? "–" : `${valeur > 0 ? "+" : valeur < 0 ? "−" : ""}${formatNumber(Math.abs(valeur), lang, 0)} %`);
  const histoire = tx(produit.histoire);

  function ajouterAuPanier() {
    if (!produit) {
      return;
    }
    ajouter(produit, quantite);
    setAjout({ n: quantite, total: Math.round(produit.prix * quantite * 100) / 100 });
    setQuantite(1);
    if (minuterie.current) {
      clearTimeout(minuterie.current);
    }
    minuterie.current = setTimeout(() => setAjout(null), 4000);
  }

  function ouvrirDevis() {
    setDevis({ etat: "saisie" });
    setDevisInvalide(false);
    setDevisOuvert(true);
  }

  async function envoyerDevis() {
    if (!produit || devis.etat === "envoi") {
      return;
    }
    const qte = Number(devisQte.replace(",", "."));
    if (!Number.isFinite(qte) || qte < 1) {
      setDevisInvalide(true);
      return;
    }
    setDevisInvalide(false);
    setDevis({ etat: "envoi" });
    try {
      const corps = await api<{ id: string }>("/commandes", {
        body: { lignes: [{ produit_id: produit.id, quantite: qte }], gros: true, moyen_paiement: "devis" },
      });
      setDevis({ etat: "envoye", id: corps.id, quantite: qte });
    } catch (erreur) {
      if (erreur instanceof ApiError && erreur.status === 0) {
        const ref = `DEV-${Date.now().toString(36).toUpperCase()}`;
        try {
          const brut = await AsyncStorage.getItem(DEVIS_LOCAUX);
          const liste = brut ? (JSON.parse(brut) as unknown[]) : [];
          liste.push({ id: ref, produit_id: produit.id, quantite: qte, date: new Date().toISOString() });
          await AsyncStorage.setItem(DEVIS_LOCAUX, JSON.stringify(liste));
        } catch {
          // Le stockage local a échoué : la référence reste affichée.
        }
        setDevis({ etat: "local", id: ref, quantite: qte });
      } else {
        setDevis({ etat: "erreur" });
      }
    }
  }

  const qteDevis = Number(devisQte.replace(",", "."));
  const estimation = Number.isFinite(qteDevis) && qteDevis > 0 ? Math.round(qteDevis * produit.prix * 100) / 100 : null;

  return (
    <View style={[styles.racine, { direction }]}>
      <ScrollView contentContainerStyle={styles.defilement} keyboardShouldPersistTaps="handled">
        <View style={[styles.hero, { backgroundColor: visuel.fondHero, paddingTop: insets.top, height: 230 + insets.top }]}>
          <HeroProduit visuel={visuel} note={produit.label} largeur={200} />
          <View style={[styles.heroRetour, { top: insets.top + 20 }]}>
            <BackButton />
          </View>
          <View style={[styles.verifie, { top: insets.top + 28 }]} accessibilityRole="text">
            <Icon name="check" color={colors.white} size={14} strokeWidth={3} />
            <Text style={styles.verifieTexte}>{t("productVerified")}</Text>
          </View>
        </View>

        <View style={styles.corps}>
          <View style={styles.titreLigne}>
            <View style={styles.flex}>
              <Text style={[styles.nom, { textAlign: align }]}>{tx(produit.nom)}</Text>
              <Text style={[styles.ferme, { textAlign: align }]}>
                {produit.ferme} · {produit.region}
              </Text>
            </View>
            <Text style={styles.prix}>
              {dt(produit.prix)} DT<Text style={styles.prixUnite}> {t("perUnit", { unite: produit.unite })}</Text>
            </Text>
          </View>

          {aLabelEau(produit.label) ? (
            <View style={styles.label}>
              <LabelBadge note={produit.label} size={44} />
              <Text style={[styles.labelTexte, { textAlign: align }]}>
                <Text style={styles.gras}>{t("labelEauTitle")}</Text> : {t("labelExplain")}
              </Text>
            </View>
          ) : null}

          <View style={styles.tuiles}>
            <View style={styles.tuile}>
              <Text style={[styles.tuileValeur, { color: colors.water }]}>{pourcent(tuiles.eau)}</Text>
              <Text style={styles.tuileLibelle}>{t("mdTileWater")}</Text>
            </View>
            <View style={styles.tuile}>
              <Text style={[styles.tuileValeur, { color: colors.amber }]}>{pourcent(tuiles.energie)}</Text>
              <Text style={styles.tuileLibelle}>{t("mdTileEnergy")}</Text>
            </View>
            <View style={styles.tuile}>
              <Text style={[styles.tuileValeur, { color: colors.olive }]}>{tuiles.valeur == null ? "–" : `${formatNumber(tuiles.valeur, lang, 0)} DT`}</Text>
              <Text style={styles.tuileLibelle}>{t("mdTileValue")}</Text>
            </View>
          </View>

          {histoire ? (
            <View style={styles.histoire}>
              <Text style={[styles.h2, { textAlign: align }]}>{t("farmStory")}</Text>
              <Text style={[styles.histoireTexte, { textAlign: align }]}>{histoire}</Text>
            </View>
          ) : null}

          <View style={styles.quantite}>
            <Text style={[styles.h2, styles.flex, { textAlign: align }]}>
              {t("quantity")} ({produit.unite})
            </Text>
            <StepperRond
              valeur={String(quantite)}
              moinsDesactive={quantite <= 1}
              labelMoins={t("mdRemoveOne", { nom: tx(produit.nom) })}
              labelPlus={t("mdAddOne", { nom: tx(produit.nom) })}
              onMoins={() => setQuantite((v) => Math.max(1, v - 1))}
              onPlus={() => setQuantite((v) => v + 1)}
            />
          </View>

          {ajout ? (
            <View style={styles.toast} accessibilityLiveRegion="polite">
              <Icon name="check" color={colors.white} size={18} strokeWidth={2.6} />
              <Text style={styles.toastTexte} numberOfLines={2}>
                {t("mdAddedQty", { n: ajout.n, unite: produit.unite, total: `${dt(ajout.total)} DT` })}
              </Text>
              <Pressable accessibilityRole="button" hitSlop={8} onPress={() => allerOnglet(navigation, "Marche", "Panier")}>
                <Text style={styles.toastLien}>{t("seeCart")}</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={ajouterAuPanier} style={({ pressed }) => [styles.boutonPlein, pressed && styles.presse]}>
              <Text style={styles.boutonPleinTexte}>{t("mdAddCart")}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={ouvrirDevis} style={({ pressed }) => [styles.boutonContour, pressed && styles.presse]}>
              <Text style={styles.boutonContourTexte}>{t("mdProBuy")}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      {tabs}

      <Modal visible={devisOuvert} transparent animationType="slide" onRequestClose={() => setDevisOuvert(false)}>
        <KeyboardAvoidingView style={styles.voile} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={styles.flex} accessibilityLabel={t("mdClose")} onPress={() => setDevisOuvert(false)} />
          <View style={[styles.feuille, { direction, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
            {devis.etat === "envoye" || devis.etat === "local" ? (
              <>
                <View style={[styles.feuilleIcone, devis.etat === "local" && { backgroundColor: colors.sand }]}>
                  <Icon name={devis.etat === "local" ? "wifiOff" : "check"} color={devis.etat === "local" ? colors.amber : colors.olive} size={26} strokeWidth={2.4} />
                </View>
                <Text style={[styles.feuilleTitre, { textAlign: align }]}>{devis.etat === "local" ? t("mdQuoteLocal") : t("mdQuoteSent")}</Text>
                <Text style={[styles.feuilleTexte, { textAlign: align }]}>
                  {t(devis.etat === "local" ? "mdQuoteLocalBody" : "mdQuoteSentBody", { id: devis.id, qte: formatNumber(devis.quantite, lang, 0), unite: produit.unite })}
                </Text>
                <Pressable accessibilityRole="button" onPress={() => setDevisOuvert(false)} style={({ pressed }) => [styles.boutonPlein, styles.boutonLarge, pressed && styles.presse]}>
                  <Text style={styles.boutonPleinTexte}>{t("mdClose")}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[styles.feuilleTitre, { textAlign: align }]}>{t("mdQuoteTitle")}</Text>
                <Text style={[styles.feuilleTexte, { textAlign: align }]}>{t("mdQuoteBody", { ferme: produit.ferme })}</Text>
                <Text style={[styles.h2, { textAlign: align }]}>{t("mdQuoteQty", { unite: produit.unite })}</Text>
                <TextInput
                  accessibilityLabel={t("mdQuoteQty", { unite: produit.unite })}
                  value={devisQte}
                  onChangeText={(texte) => {
                    setDevisQte(texte.replace(/[^0-9.,]/g, ""));
                    setDevisInvalide(false);
                  }}
                  keyboardType="decimal-pad"
                  placeholder="40"
                  placeholderTextColor={colors.muted}
                  style={[styles.champ, devisInvalide && styles.champErreur, { textAlign: align }]}
                />
                {devisInvalide ? <Text style={styles.erreur}>{t("mdQuoteInvalid")}</Text> : null}
                {estimation != null ? <Text style={[styles.feuilleTexte, { textAlign: align }]}>{t("mdQuoteEstimate", { total: dt(estimation) })}</Text> : null}
                {devis.etat === "erreur" ? <Notice tone="error" text={t("mdQuoteError")} /> : null}
                <View style={styles.actions}>
                  <Pressable accessibilityRole="button" onPress={() => setDevisOuvert(false)} style={({ pressed }) => [styles.boutonContour, pressed && styles.presse]}>
                    <Text style={styles.boutonContourTexte}>{t("mdQuoteCancel")}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ busy: devis.etat === "envoi" }}
                    onPress={() => void envoyerDevis()}
                    style={({ pressed }) => [styles.boutonPlein, pressed && styles.presse]}
                  >
                    {devis.etat === "envoi" ? <ActivityIndicator color={colors.white} /> : <Text style={styles.boutonPleinTexte}>{t("mdQuoteSend")}</Text>}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  racine: { flex: 1, backgroundColor: colors.bg },
  vide: { flex: 1, paddingHorizontal: 20, gap: 16 },
  defilement: { paddingBottom: 24 },
  hero: { alignItems: "center", justifyContent: "center" },
  heroRetour: { position: "absolute", left: 20 },
  verifie: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.labelA,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  verifieTexte: { color: colors.white, fontSize: 12, ...police("800") },
  corps: { paddingTop: 18, paddingHorizontal: 20, gap: 14 },
  titreLigne: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  nom: { fontSize: 22, lineHeight: 26, letterSpacing: -0.44, color: colors.ink, ...police("800") },
  ferme: { marginTop: 4, fontSize: 13, color: colors.muted, ...police("600") },
  prix: { fontSize: 20, color: colors.olive, ...police("800") },
  prixUnite: { fontSize: 13, color: colors.muted },
  label: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: "#CFE0C8",
    borderRadius: 16,
    padding: 12,
  },
  labelTexte: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.ink, ...police("400") },
  gras: { ...police("800") },
  tuiles: { flexDirection: "row", gap: 8 },
  tuile: { flex: 1, backgroundColor: colors.card, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 10, gap: 4 },
  tuileValeur: { fontSize: 18, ...police("800") },
  tuileLibelle: { fontSize: 12, lineHeight: 16, color: colors.muted, ...police("600") },
  histoire: { gap: 6 },
  h2: { fontSize: 15, color: colors.ink, ...police("800") },
  histoireTexte: { fontSize: 14, lineHeight: 21, color: colors.body, ...police("400") },
  quantite: { flexDirection: "row", alignItems: "center", gap: 12 },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.labelA,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  toastTexte: { flex: 1, color: colors.white, fontSize: 13, ...police("700") },
  toastLien: { color: colors.white, fontSize: 13, textDecorationLine: "underline", ...police("800") },
  actions: { flexDirection: "row", gap: 10 },
  boutonPlein: { flex: 1, minHeight: 52, borderRadius: 16, backgroundColor: colors.olive, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  boutonLarge: { flex: 0, alignSelf: "stretch" },
  boutonPleinTexte: { color: colors.white, fontSize: 15, ...police("800") },
  boutonContour: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.olive,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  boutonContourTexte: { color: colors.olive, fontSize: 14, ...police("800") },
  presse: { opacity: 0.85 },
  voile: { flex: 1, backgroundColor: "rgba(23,35,26,0.45)" },
  feuille: { backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, gap: 12 },
  feuilleIcone: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.oliveMist, alignItems: "center", justifyContent: "center" },
  feuilleTitre: { fontSize: 20, color: colors.ink, ...police("800") },
  feuilleTexte: { fontSize: 14, lineHeight: 20, color: colors.body, ...police("500") },
  champ: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.ink,
    ...police("700"),
  },
  champErreur: { borderColor: colors.clay },
  erreur: { color: colors.clay, fontSize: 13, ...police("700") },
});
