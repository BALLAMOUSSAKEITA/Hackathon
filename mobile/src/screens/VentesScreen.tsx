import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "../api";
import { FarmerTabs } from "../components/chrome";
import { Icon } from "../components/icons";
import { Action, C, Carte, EnTete, Etiquette, Segment, T } from "../components/maquetteC-ui";
import { Button, Field, LabelBadge, Loader, Notice, Screen } from "../components/ui";
import { sprint10, sprint11 } from "../donnees";
import { formatNumber, useI18n, type CopyKey } from "../i18n";
import { colors, police } from "../theme";
import type { Localized } from "../types";

type Commande = { statut: string; prix?: number; prix_propose?: number };
type Produit = { id: string; nom: Localized; prix: number; unite: string; stock?: number; label: string; ferme: string };
type Onglet = "commandes" | "produits";

const STATUTS: Record<string, { cle: CopyKey; bg: string; fg: string }> = {
  en_attente: { cle: "statusPending", bg: colors.sand, fg: C.ambreFonce },
  contre_offre: { cle: "statusCounter", bg: colors.waterSoft, fg: C.bleuFonce },
  acceptee: { cle: "statusAccepted", bg: C.vertPale, fg: C.vertTexte },
};

function nombre(texte: string): number {
  return Number(texte.replace(",", ".").trim());
}

/** Produits de la ferme dans le fichier du sprint 10, pour le mode hors ligne. */
function produitsLocaux(): Produit[] {
  return (sprint10.produits as Produit[]).filter((produit) => produit.ferme === sprint11.ferme);
}

export function VentesScreen() {
  const { lang, t, tx } = useI18n();
  const demo = sprint11.commande_demo;
  const [maintenant] = useState(() => Date.now());
  const [onglet, setOnglet] = useState<Onglet>("commandes");

  const [statut, setStatut] = useState(demo.statut);
  const [prixPropose, setPrixPropose] = useState<number | null>(null);
  const [proposer, setProposer] = useState(false);
  const [prixTexte, setPrixTexte] = useState(String(demo.prix + 1));
  const [action, setAction] = useState<"accepter" | "proposer" | null>(null);
  const [retourCommande, setRetourCommande] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const [produits, setProduits] = useState<Produit[] | null>(null);
  const [produitsHorsLigne, setProduitsHorsLigne] = useState(false);
  const [publies, setPublies] = useState<Produit[]>([]);
  const [essai, setEssai] = useState(0);

  const [formulaire, setFormulaire] = useState(false);
  const [nom, setNom] = useState(tx(demo.produit));
  const [prix, setPrix] = useState(String(demo.prix));
  const [stock, setStock] = useState("30");
  const [publication, setPublication] = useState(false);
  const [retourPublication, setRetourPublication] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let actif = true;
    api<Commande>(`/commandes/${demo.id}`)
      .then((commande) => {
        if (actif) {
          setStatut(commande.statut);
          setPrixPropose(commande.prix_propose ?? null);
        }
      })
      .catch(() => undefined);
    return () => {
      actif = false;
    };
  }, [demo.id]);

  useEffect(() => {
    const controleur = new AbortController();
    api<{ produits: Produit[] }>("/produits", { signal: controleur.signal })
      .then((corps) => {
        setProduits(corps.produits.filter((produit) => produit.ferme === sprint11.ferme));
        setProduitsHorsLigne(false);
      })
      .catch(() => {
        if (!controleur.signal.aborted) {
          setProduits(produitsLocaux());
          setProduitsHorsLigne(true);
        }
      });
    return () => controleur.abort();
  }, [essai]);

  async function modifier(corps: object, type: "accepter" | "proposer") {
    setAction(type);
    setRetourCommande(null);
    try {
      const commande = await api<Commande>(`/commandes/${demo.id}`, { method: "PATCH", body: corps });
      setStatut(commande.statut);
      setPrixPropose(commande.prix_propose ?? null);
      setProposer(false);
      setRetourCommande({ tone: "success", text: t(type === "accepter" ? "mcOrderAccepted" : "mcOfferSent") });
    } catch {
      setRetourCommande({ tone: "error", text: t("networkError") });
    } finally {
      setAction(null);
    }
  }

  function envoyerOffre() {
    const valeur = nombre(prixTexte);
    if (!Number.isFinite(valeur) || valeur <= 0) {
      setRetourCommande({ tone: "error", text: t("invalidPriceOnly") });
      return;
    }
    void modifier({ prix: valeur }, "proposer");
  }

  async function publier() {
    const prixNombre = nombre(prix);
    const stockNombre = nombre(stock);
    if (!nom.trim() || !Number.isFinite(prixNombre) || prixNombre <= 0 || !Number.isInteger(stockNombre) || stockNombre < 0) {
      setRetourPublication({ tone: "error", text: t("invalidSale") });
      return;
    }
    setPublication(true);
    setRetourPublication(null);
    try {
      const corps = await api<{ id: string; label: string; ferme: string }>("/produits", { body: { nom: nom.trim(), prix: prixNombre, stock: stockNombre } });
      setRetourPublication({ tone: "success", text: t("published", { label: corps.label }) });
      setFormulaire(false);
      setPublies((liste) => [
        ...liste,
        { id: corps.id, nom: { fr: nom.trim(), ar: nom.trim(), darija: nom.trim() }, prix: prixNombre, unite: "kg", stock: stockNombre, label: corps.label, ferme: corps.ferme },
      ]);
      setEssai((n) => n + 1);
    } catch {
      setRetourPublication({ tone: "error", text: t("networkError") });
    } finally {
      setPublication(false);
    }
  }

  function ouvrirPublication() {
    setOnglet("produits");
    setFormulaire(true);
    setRetourPublication(null);
  }

  const prixCommande = statut === "contre_offre" && prixPropose != null ? prixPropose : demo.prix;
  const montant = demo.quantite * prixCommande;
  const ecart = Math.round(((demo.prix - sprint11.prix_marche) / sprint11.prix_marche) * 100);
  const infoStatut = STATUTS[statut] ?? STATUTS.en_attente;
  const enAttente = statut === "en_attente";
  const nombreCommandes = 2;
  const mois = new Date(maintenant).toLocaleDateString(lang === "ar" ? "ar-TN" : "fr-FR", { month: "long" });
  // Les produits publiés pendant la session restent visibles même si la liste de l'API les contient déjà.
  const liste = [...(produits ?? []), ...publies.filter((p) => !(produits ?? []).some((q) => q.id === p.id))];

  return (
    <Screen keyboard tabs={<FarmerTabs actif="Label" />} contentStyle={styles.contenu}>
      <EnTete titre={t("salesTitle")} sousTitre={t("salesSubtitle", { label: sprint11.label })} />

      <View style={styles.grille2}>
        <View style={[styles.tuile, styles.tuileVerte]}>
          <T size={12} weight="700" color={colors.leaf}>
            {t("mcOrdersOfMonth", { mois })}
          </T>
          <T size={22} weight="800" color={colors.white} numberOfLines={1}>
            {formatNumber(montant, lang, 0)} DT
          </T>
        </View>
        <View style={[styles.tuile, styles.tuileBlanche]}>
          <T size={12} weight="700" color={colors.muted}>
            {t("avgVsMarket")}
          </T>
          <T size={22} weight="800" color={ecart >= 0 ? colors.olive : colors.clay} numberOfLines={1}>
            {ecart >= 0 ? "+" : ""}
            {formatNumber(ecart, lang, 0)} %
          </T>
        </View>
      </View>

      <Segment
        valeur={onglet}
        onChange={setOnglet}
        options={[
          { id: "commandes" as Onglet, label: t("mcOrdersTab", { n: nombreCommandes }) },
          { id: "produits" as Onglet, label: t("mcMyProducts") },
        ]}
      />

      {onglet === "commandes" ? (
        <View style={styles.liste}>
          <Carte style={styles.commande}>
            <View style={styles.teteCommande}>
              <View style={styles.flex}>
                <T size={15} weight="800">
                  {demo.acheteur}
                </T>
                <T size={13} color={colors.muted} style={styles.detail}>
                  {t("mcOrderDetail", { q: formatNumber(demo.quantite, lang, 0), produit: tx(demo.produit), m: formatNumber(montant, lang, 0) })}
                </T>
              </View>
              <Etiquette texte={t(infoStatut.cle)} bg={infoStatut.bg} fg={infoStatut.fg} />
            </View>
            {statut === "contre_offre" && prixPropose != null ? (
              <T size={13} weight="700" color={colors.water}>
                {t("newPrice")} : {formatNumber(prixPropose, lang, 2)} DT
              </T>
            ) : null}
            {enAttente && !proposer ? (
              <View style={styles.boutons}>
                <Action label={t("accept")} loading={action === "accepter"} onPress={() => void modifier({ statut: "acceptee" }, "accepter")} />
                <Action label={t("proposePrice")} contour onPress={() => setProposer(true)} />
              </View>
            ) : null}
            {proposer ? (
              <View style={styles.offre}>
                <Field label={t("newPrice")} value={prixTexte} onChangeText={setPrixTexte} unit="DT/kg" keyboardType="decimal-pad" />
                <View style={styles.boutons}>
                  <Action label={t("mcCancel")} contour onPress={() => setProposer(false)} />
                  <Action label={t("sendOffer")} icon="send" loading={action === "proposer"} onPress={envoyerOffre} />
                </View>
              </View>
            ) : null}
            {retourCommande ? <Notice tone={retourCommande.tone} text={retourCommande.text} /> : null}
          </Carte>

          <Carte style={styles.commandeLigne}>
            <View style={styles.flex}>
              <T size={15} weight="800">
                {sprint11.devis.demandeur}
              </T>
              <T size={13} color={colors.muted} style={styles.detail}>
                {tx(sprint11.devis.message)}
              </T>
            </View>
            <Etiquette texte={t("mcQuoteBadge")} bg={colors.waterSoft} fg={C.bleuFonce} />
          </Carte>
        </View>
      ) : (
        <View style={styles.liste}>
          {produitsHorsLigne ? <Notice tone="warning" text={t("offline")} /> : null}
          {produits === null ? <Loader label={t("loading")} /> : null}
          {produits !== null && liste.length === 0 ? <Notice tone="info" text={t("mcNoProductYet")} /> : null}
          {liste.map((produit) => (
            <Carte key={produit.id} style={styles.commandeLigne}>
              <LabelBadge note={produit.label} size={40} />
              <View style={styles.flex}>
                <T size={15} weight="800">
                  {tx(produit.nom)}
                </T>
                <T size={13} color={colors.muted} style={styles.detail}>
                  {formatNumber(produit.prix, lang, 2)} DT/{produit.unite}
                  {produit.stock != null ? ` · ${t("mcInStock", { n: formatNumber(produit.stock, lang, 0), u: produit.unite })}` : ""}
                </T>
              </View>
              <Etiquette texte={t("mcOnMarket")} bg={C.vertPale} fg={C.vertTexte} />
            </Carte>
          ))}

          {formulaire ? (
            <Carte>
              <T size={15} weight="800">
                {t("publishProduct")}
              </T>
              <Field label={t("productName")} value={nom} onChangeText={setNom} />
              <View style={styles.boutons}>
                <View style={styles.flex}>
                  <Field label={t("priceKg")} value={prix} onChangeText={setPrix} unit="DT/kg" keyboardType="decimal-pad" />
                </View>
                <View style={styles.flex}>
                  <Field label={t("stockKg")} value={stock} onChangeText={setStock} unit="kg" keyboardType="number-pad" />
                </View>
              </View>
              <View style={styles.boutons}>
                <Button label={t("mcCancel")} variant="secondary" small style={styles.flex} onPress={() => setFormulaire(false)} />
                <Button label={t("publish")} icon="plus" small style={styles.flex} loading={publication} onPress={() => void publier()} />
              </View>
            </Carte>
          ) : null}
          {retourPublication ? <Notice tone={retourPublication.tone} text={retourPublication.text} /> : null}
        </View>
      )}

      {!formulaire ? (
        <Pressable accessibilityRole="button" onPress={ouvrirPublication} style={({ pressed }) => [styles.pointilles, pressed && styles.presse]}>
          <Icon name="plus" color={colors.olive} size={20} strokeWidth={2.2} />
          <Text style={styles.pointillesTexte}>{t("publishProduct")}</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  contenu: { gap: 14, paddingTop: 24, paddingBottom: 32 },
  flex: { flex: 1 },
  grille2: { flexDirection: "row", gap: 10 },
  tuile: { flex: 1, borderRadius: 16, padding: 14, gap: 2 },
  tuileVerte: { backgroundColor: colors.olive },
  tuileBlanche: { backgroundColor: colors.card },
  liste: { gap: 10 },
  commande: { borderRadius: 16, padding: 14, gap: 10 },
  commandeLigne: { borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  teteCommande: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  detail: { marginTop: 2 },
  boutons: { flexDirection: "row", gap: 8 },
  offre: { gap: 8 },
  pointilles: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.olive,
    backgroundColor: colors.card,
  },
  pointillesTexte: { color: colors.olive, fontSize: 15, ...police("800") },
  presse: { opacity: 0.85 },
});
