import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api } from "../../api";
import { allerOnglet, BuyerTabs } from "../../components/chrome";
import { Icon } from "../../components/icons";
import { DessinProduit, visuelProduit } from "../../components/maquetteD-produit";
import { libelleCategorie } from "../../components/maquetteD-ui";
import { Button, LabelBadge, Loader, Notice, Screen } from "../../components/ui";
import { sprint10 } from "../../donnees";
import { formatNumber, useI18n } from "../../i18n";
import type { RootStackParamList } from "../../navigation/types";
import type { ProduitMarche } from "../../panier";
import { aLabelEau, colors, police } from "../../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Marche">;
/** « tous », « A » (label A) ou « cat:<categorie> ». */
type Filtre = string;

const LOCAL = sprint10.produits as ProduitMarche[];

export function MarcheScreen({ navigation }: Props) {
  const { t, tx, lang, align } = useI18n();
  const [produits, setProduits] = useState<ProduitMarche[]>(LOCAL);
  const [chargement, setChargement] = useState(true);
  const [horsLigne, setHorsLigne] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [essai, setEssai] = useState(0);

  useEffect(() => {
    const controleur = new AbortController();
    api<{ produits: ProduitMarche[] }>("/produits", { signal: controleur.signal })
      .then((corps) => {
        setProduits(corps.produits?.length ? corps.produits : LOCAL);
        setHorsLigne(false);
      })
      .catch(() => {
        if (!controleur.signal.aborted) {
          setProduits(LOCAL);
          setHorsLigne(true);
        }
      })
      .finally(() => {
        if (!controleur.signal.aborted) {
          setChargement(false);
        }
      });
    return () => controleur.abort();
  }, [essai]);

  function charger() {
    setChargement(true);
    setEssai((n) => n + 1);
  }

  /** Puces : Tout, Label A, puis les catégories présentes dans les données. */
  const filtres = useMemo(() => {
    const categories = [...new Set(produits.map((produit) => produit.categorie).filter(Boolean))];
    return [
      { id: "tous", label: t("mdFilterAll") },
      { id: "eau", label: t("mdLabelEau") },
      ...categories.map((categorie) => ({ id: `cat:${categorie}`, label: libelleCategorie(categorie, t) })),
    ];
  }, [produits, t]);

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return produits.filter((produit) => {
      if (filtre === "eau" && !aLabelEau(produit.label)) {
        return false;
      }
      if (filtre.startsWith("cat:") && produit.categorie !== filtre.slice(4)) {
        return false;
      }
      if (!q) {
        return true;
      }
      const champs = [produit.nom.fr, produit.nom.ar, produit.nom.darija, produit.region, produit.ferme, produit.categorie, libelleCategorie(produit.categorie, t)];
      return champs.some((champ) => champ?.toLowerCase().includes(q));
    });
  }, [produits, recherche, filtre, t]);

  const filtreActif = filtres.some((item) => item.id === filtre) ? filtre : "tous";

  return (
    <Screen tabs={<BuyerTabs actif="Marche" />} refreshing={chargement} onRefresh={charger} contentStyle={styles.contenu}>
      <View style={styles.entete}>
        <View style={styles.flex}>
          <Text style={[styles.titre, { textAlign: align }]}>{t("marketTitle")}</Text>
          <Text style={[styles.sousTitre, { textAlign: align }]}>{t("marketSubtitle")}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("scanProduct")}
          onPress={() => allerOnglet(navigation, "Marche", "Scanner")}
          style={({ pressed }) => [styles.scan, pressed && styles.presse]}
        >
          <Icon name="scan" color={colors.white} size={22} strokeWidth={2} />
        </Pressable>
      </View>

      <View style={styles.recherche}>
        <Icon name="search" color={colors.muted} size={18} strokeWidth={2} />
        <TextInput
          accessibilityLabel={t("search")}
          value={recherche}
          onChangeText={setRecherche}
          placeholder={t("searchPlaceholder")}
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          style={[styles.champ, { textAlign: align }]}
        />
        {recherche ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t("mdClearSearch")} hitSlop={10} onPress={() => setRecherche("")}>
            <Icon name="close" color={colors.muted} size={18} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel={t("mdFiltersLabel")}
        contentContainerStyle={styles.puces}
        style={styles.pucesScroll}
      >
        {filtres.map((item) => {
          const on = item.id === filtreActif;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => setFiltre(item.id)}
              style={[styles.puce, on ? styles.puceOn : styles.puceOff]}
            >
              <Text style={[styles.puceTexte, on ? styles.puceTexteOn : styles.puceTexteOff]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {horsLigne ? <Notice tone="warning" text={t("offline")} action={{ label: t("retry"), onPress: charger }} /> : null}

      {chargement && produits.length === 0 ? <Loader label={t("loading")} /> : null}

      {visibles.length === 0 ? (
        <View style={styles.vide}>
          <Icon name="search" color={colors.muted} size={28} />
          <Text style={styles.videTexte}>{t("noProduct")}</Text>
          <Button
            small
            variant="secondary"
            label={t("mdResetFilters")}
            onPress={() => {
              setRecherche("");
              setFiltre("tous");
            }}
          />
        </View>
      ) : (
        <View style={styles.grille}>
          {visibles.map((produit) => {
            const visuel = visuelProduit(produit);
            return (
              <Pressable
                key={produit.id}
                accessibilityRole="button"
                accessibilityLabel={`${tx(produit.nom)}, ${t("mdLabelNote", { note: produit.label })}`}
                onPress={() => navigation.navigate("Produit", { id: produit.id })}
                style={({ pressed }) => [styles.carte, pressed && styles.presse]}
              >
                <View style={[styles.visuel, { backgroundColor: visuel.fond }]}>
                  <DessinProduit visuel={visuel} taille={44} />
                  <View style={styles.badge}>
                    <LabelBadge note={produit.label} size={28} />
                  </View>
                </View>
                <View style={styles.corps}>
                  <Text style={[styles.nom, { textAlign: align }]} numberOfLines={2}>
                    {tx(produit.nom)}
                  </Text>
                  <Text style={[styles.ferme, { textAlign: align }]} numberOfLines={1}>
                    {produit.ferme} · {produit.region}
                  </Text>
                  <Text style={[styles.prix, { textAlign: align }]}>
                    {formatNumber(produit.prix, lang, produit.prix % 1 ? 1 : 0)} DT {t("perUnit", { unite: produit.unite })}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contenu: { gap: 14, paddingTop: 20, paddingBottom: 24 },
  entete: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  titre: { fontSize: 24, lineHeight: 30, letterSpacing: -0.48, color: colors.ink, ...police("800") },
  sousTitre: { marginTop: 2, fontSize: 13, color: colors.muted, ...police("600") },
  scan: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.olive, alignItems: "center", justifyContent: "center" },
  presse: { opacity: 0.85 },
  recherche: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  champ: { flex: 1, minWidth: 0, fontSize: 15, color: colors.ink, paddingVertical: 10, ...police("500") },
  pucesScroll: { marginHorizontal: -20, flexGrow: 0 },
  puces: { gap: 8, paddingHorizontal: 20 },
  puce: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  puceOn: { backgroundColor: colors.olive, borderColor: colors.olive },
  puceOff: { backgroundColor: colors.card, borderColor: colors.lineStrong },
  puceTexte: { fontSize: 13 },
  puceTexteOn: { color: colors.white, ...police("800") },
  puceTexteOff: { color: colors.ink, ...police("600") },
  grille: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
  carte: { width: "48.6%", backgroundColor: colors.card, borderRadius: 16, overflow: "hidden" },
  visuel: { height: 84, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: 8, right: 8 },
  corps: { paddingTop: 10, paddingHorizontal: 12, paddingBottom: 12, gap: 2 },
  nom: { fontSize: 15, lineHeight: 19, color: colors.ink, ...police("800") },
  ferme: { fontSize: 12, color: colors.muted, ...police("600") },
  prix: { marginTop: 4, fontSize: 14, color: colors.olive, ...police("800") },
  vide: { alignItems: "center", gap: 10, paddingVertical: 28 },
  videTexte: { fontSize: 13, lineHeight: 18, color: colors.muted, textAlign: "center", ...police("500") },
});
