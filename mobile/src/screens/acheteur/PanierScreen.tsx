import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api } from "../../api";
import { allerOnglet, BuyerTabs } from "../../components/chrome";
import { Icon } from "../../components/icons";
import { StepperRond } from "../../components/maquetteD-ui";
import { Button, LabelBadge, Notice, Screen } from "../../components/ui";
import { sprint10 } from "../../donnees";
import { formatNumber, useI18n, type CopyKey } from "../../i18n";
import type { RootStackParamList } from "../../navigation/types";
import { usePanier } from "../../panier";
import { colors, police } from "../../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Panier">;
type Moyen = "d17" | "carte" | "livraison";

const LIVRAISON_DT = 7;

const MOYENS: { id: Moyen; label: CopyKey }[] = [
  { id: "d17", label: "mdPayD17" },
  { id: "carte", label: "mdPayCard" },
  { id: "livraison", label: "payDelivery" },
];

type Commande = { id: string; montant: number; statut: string; moyen_paiement?: string };

export function PanierScreen({ navigation }: Props) {
  const { t, tx, lang, align } = useI18n();
  const panier = usePanier();
  const [moyen, setMoyen] = useState<Moyen>("d17");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(false);
  const [commande, setCommande] = useState<(Commande & { moyen: Moyen }) | null>(null);

  const total = Math.round((panier.sousTotal + LIVRAISON_DT) * 100) / 100;
  const dt = (valeur: number) => formatNumber(valeur, lang, Number.isInteger(valeur) ? 0 : Number.isInteger(valeur * 10) ? 1 : 2);
  const libelleMoyen = (id: Moyen) => t(MOYENS.find((m) => m.id === id)?.label ?? "payDelivery");

  async function commander() {
    if (!panier.lignes.length || envoi) {
      return;
    }
    setEnvoi(true);
    setErreur(false);
    try {
      const corps = await api<Commande>("/commandes", {
        body: {
          lignes: panier.lignes.map((ligne) => ({ produit_id: ligne.produit.id, quantite: ligne.quantite })),
          moyen_paiement: moyen,
        },
      });
      setCommande({ ...corps, montant: corps.montant + LIVRAISON_DT, moyen });
      panier.vider();
    } catch {
      setErreur(true);
    } finally {
      setEnvoi(false);
    }
  }

  const tabs = <BuyerTabs actif="Panier" />;
  const titre = <Text style={[styles.titre, { textAlign: align }]}>{t("cartTitle")}</Text>;

  if (!panier.lignes.length) {
    return (
      <Screen tabs={tabs} contentStyle={styles.contenu}>
        {titre}
        {commande ? (
          <View style={styles.etat}>
            <View style={[styles.etatIcone, { backgroundColor: colors.labelA }]}>
              <Icon name="check" color={colors.white} size={34} strokeWidth={2.6} />
            </View>
            <Text style={styles.etatTitre}>{t("orderDone")}</Text>
            <Text style={styles.etatTexte}>{t("orderDoneBody", { id: commande.id, montant: dt(commande.montant) })}</Text>
            <Text style={styles.etatTexte}>{t("mdPaidWith", { moyen: libelleMoyen(commande.moyen) })}</Text>
          </View>
        ) : (
          <View style={styles.etat}>
            <View style={styles.etatIcone}>
              <Icon name="basket" color={colors.olive} size={40} strokeWidth={1.8} />
            </View>
            <Text style={styles.etatTitre}>{t("mdCartEmptyTitle")}</Text>
            <Text style={styles.etatTexte}>{t("cartEmptyBody")}</Text>
          </View>
        )}
        <Button
          arrow
          variant={commande ? "secondary" : "primary"}
          label={t("goMarket")}
          onPress={() => allerOnglet(navigation, "Marche", "Marche")}
        />
      </Screen>
    );
  }

  return (
    <Screen tabs={tabs} contentStyle={styles.contenu}>
      {titre}

      <View style={styles.lignes}>
        {panier.lignes.map((ligne) => {
          const nom = tx(ligne.produit.nom);
          return (
            <View key={ligne.produit.id} style={styles.ligne}>
              <LabelBadge note={ligne.produit.label} size={40} />
              <View style={styles.flex}>
                <Text style={[styles.nom, { textAlign: align }]} numberOfLines={2}>
                  {nom}
                </Text>
                <Text style={[styles.detail, { textAlign: align }]} numberOfLines={1}>
                  {ligne.produit.region} · {dt(ligne.produit.prix)} DT/{ligne.produit.unite}
                </Text>
              </View>
              <StepperRond
                valeur={formatNumber(ligne.quantite, lang, 0)}
                labelMoins={t("mdRemoveOne", { nom })}
                labelPlus={t("mdAddOne", { nom })}
                onMoins={() => panier.changer(ligne.produit.id, ligne.quantite - 1)}
                onPlus={() => panier.changer(ligne.produit.id, ligne.quantite + 1)}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.eau}>
        <Icon name="drop" color={colors.water} size={28} strokeWidth={2} />
        <Text style={[styles.eauTexte, { textAlign: align }]}>
          {t("mdCartImpactA")} <Text style={styles.gras}>{t("mdCartImpactB", { eau: dt(panier.eau) })}</Text>{" "}
          {t("mdCartImpactC")}
        </Text>
      </View>

      <View style={styles.paiement} accessibilityRole="radiogroup" accessibilityLabel={t("payment")}>
        <Text style={[styles.legende, { textAlign: align }]}>{t("payment")}</Text>
        <View style={styles.moyens}>
          {MOYENS.map((item) => {
            const on = item.id === moyen;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: on, checked: on }}
                onPress={() => setMoyen(item.id)}
                style={[styles.moyen, on ? styles.moyenOn : styles.moyenOff]}
              >
                <Text style={[styles.moyenTexte, on ? styles.moyenTexteOn : styles.moyenTexteOff]} numberOfLines={2}>
                  {t(item.label)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.note, { textAlign: align }]}>{tx(sprint10.hypothese)}</Text>
      </View>

      <View style={styles.recap}>
        <View style={styles.recapLigne}>
          <Text style={styles.recapTexte}>{t("products")}</Text>
          <Text style={styles.recapTexte}>{dt(panier.sousTotal)} DT</Text>
        </View>
        <View style={styles.recapLigne}>
          <Text style={styles.recapTexte}>{t("delivery")}</Text>
          <Text style={styles.recapTexte}>{dt(LIVRAISON_DT)} DT</Text>
        </View>
        <View style={[styles.recapLigne, styles.recapTotal]}>
          <Text style={styles.totalTexte}>{t("total")}</Text>
          <Text style={styles.totalTexte}>{dt(total)} DT</Text>
        </View>
      </View>

      {erreur ? <Notice tone="error" text={t("orderError")} action={{ label: t("retry"), onPress: () => void commander() }} /> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: envoi, disabled: envoi }}
        disabled={envoi}
        onPress={() => void commander()}
        style={({ pressed }) => [styles.commander, (pressed || envoi) && styles.presse]}
      >
        {envoi ? <ActivityIndicator color={colors.white} /> : <Text style={styles.commanderTexte}>{t("order", { total: dt(total) })}</Text>}
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  contenu: { gap: 14, paddingTop: 20, paddingBottom: 24 },
  titre: { fontSize: 24, lineHeight: 30, letterSpacing: -0.48, color: colors.ink, ...police("800") },
  lignes: { gap: 10 },
  ligne: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14 },
  nom: { fontSize: 14, color: colors.ink, ...police("800") },
  detail: { marginTop: 2, fontSize: 12, color: colors.muted, ...police("600") },
  eau: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.waterSoft, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16 },
  eauTexte: { flex: 1, fontSize: 13, lineHeight: 19, color: "#154B80", ...police("500") },
  gras: { ...police("800") },
  paiement: { gap: 8 },
  legende: { fontSize: 14, color: colors.ink, ...police("800") },
  moyens: { flexDirection: "row", gap: 8 },
  moyen: { flex: 1, minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  moyenOn: { borderWidth: 2, borderColor: colors.olive, backgroundColor: colors.oliveSoft },
  moyenOff: { borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.card },
  moyenTexte: { fontSize: 13, textAlign: "center" },
  moyenTexteOn: { color: "#1F4A2A", ...police("800") },
  moyenTexteOff: { color: colors.ink, ...police("600") },
  note: { fontSize: 12, lineHeight: 16, color: colors.muted, ...police("500") },
  recap: { backgroundColor: colors.card, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, gap: 8 },
  recapLigne: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  recapTexte: { fontSize: 14, color: colors.body, ...police("500") },
  recapTotal: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8 },
  totalTexte: { fontSize: 17, color: colors.ink, ...police("800") },
  commander: { minHeight: 54, borderRadius: 16, backgroundColor: colors.olive, alignItems: "center", justifyContent: "center" },
  commanderTexte: { color: colors.white, fontSize: 16, ...police("800") },
  presse: { opacity: 0.85 },
  etat: { alignItems: "center", gap: 10, paddingVertical: 36, paddingHorizontal: 12 },
  etatIcone: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.oliveMist, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  etatTitre: { fontSize: 20, lineHeight: 26, textAlign: "center", color: colors.ink, ...police("800") },
  etatTexte: { fontSize: 14, lineHeight: 20, textAlign: "center", color: colors.muted, ...police("500") },
});
