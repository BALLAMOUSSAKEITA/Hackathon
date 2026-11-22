import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api } from "../api";
import { Icon } from "../components/icons";
import { Carte, EnTete, Ligne } from "../components/maquetteC-ui";
import { Footnote, Notice, Screen } from "../components/ui";
import { sprint03, type CultureFiche } from "../fixture";
import { formatNumber, useI18n } from "../i18n";
import type { RootStackParamList } from "../navigation/types";
import { colors, police } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Cultures">;

function normaliser(texte: string): string {
  return texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function CulturesScreen({ navigation }: Props) {
  const { lang, t, tx, align } = useI18n();
  const [cultures, setCultures] = useState<CultureFiche[]>(sprint03.cultures);
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    const controleur = new AbortController();
    api<{ cultures: CultureFiche[] }>("/cultures", { signal: controleur.signal })
      .then((corps) => {
        if (corps?.cultures?.length) {
          setCultures(corps.cultures);
        }
      })
      // Sans réseau, on garde le catalogue du fichier.
      .catch(() => undefined);
    return () => controleur.abort();
  }, []);

  const affichees = useMemo(() => {
    const filtre = normaliser(recherche.trim());
    return [...cultures]
      .filter((culture) => !filtre || normaliser(`${culture.nom.fr} ${culture.nom.ar} ${culture.nom.darija}`).includes(filtre))
      .sort((a, b) => a.nom[lang].localeCompare(b.nom[lang], lang === "ar" ? "ar" : "fr"));
  }, [cultures, recherche, lang]);

  return (
    <Screen keyboard contentStyle={styles.contenu}>
      <EnTete titre={t("culturesTitle")} sousTitre={t("cropsCount", { n: cultures.length })} />
      <View style={styles.recherche}>
        <Icon name="search" color={colors.muted} size={20} />
        <TextInput
          accessibilityLabel={t("searchCrop")}
          value={recherche}
          onChangeText={setRecherche}
          placeholder={t("searchCropHint")}
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          style={[styles.rechercheTexte, { textAlign: align }]}
        />
        {recherche ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t("clearShape")} hitSlop={10} onPress={() => setRecherche("")}>
            <Icon name="close" color={colors.muted} size={18} />
          </Pressable>
        ) : null}
      </View>
      {affichees.length === 0 ? <Notice tone="info" text={t("noCrop")} /> : null}
      {affichees.length ? (
        <Carte style={styles.liste}>
          {affichees.map((culture, index) => (
            <Ligne
              key={culture.id}
              icon="sprout"
              titre={tx(culture.nom)}
              sousTitre={`${formatNumber(culture.besoin_eau_m3_ha, lang, 0)} m³/ha · ${formatNumber(culture.prix.typique, lang, 1)} ${culture.prix.unite}`}
              derniere={index === affichees.length - 1}
              onPress={() => navigation.navigate("Fiche", { cultureId: culture.id })}
            />
          ))}
        </Carte>
      ) : null}
      <Footnote>{tx(sprint03.hypothese)}</Footnote>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contenu: { gap: 14, paddingTop: 24, paddingBottom: 32 },
  recherche: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 50, borderRadius: 14, backgroundColor: colors.card, paddingHorizontal: 14 },
  rechercheTexte: { flex: 1, fontSize: 15, color: colors.ink, paddingVertical: 10, ...police("600") },
  liste: { paddingVertical: 4, gap: 0 },
});
