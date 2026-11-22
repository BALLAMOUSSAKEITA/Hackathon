/** Petits éléments partagés par les écrans acheteur (groupe D). */
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { CopyKey } from "../i18n";
import { colors, police } from "../theme";

const CATEGORIES: Record<string, CopyKey> = {
  huile: "mdCatHuile",
  fruit: "mdCatFruit",
  fruits: "mdCatFruit",
  condiment: "mdCatCondiment",
  legume: "mdCatLegume",
  legumes: "mdCatLegume",
  cereale: "mdCatCereale",
  cereales: "mdCatCereale",
  autre: "mdCatAutre",
};

/** Nom lisible d'une catégorie venue des données ; une catégorie inconnue garde son nom, avec une majuscule. */
export function libelleCategorie(categorie: string, t: (cle: CopyKey) => string): string {
  const cle = CATEGORIES[categorie.toLowerCase()];
  if (cle) {
    return t(cle);
  }
  return categorie ? categorie[0].toUpperCase() + categorie.slice(1) : categorie;
}

/** Stepper rond des maquettes : « − » en contour, « + » plein olive. */
export function StepperRond({
  valeur,
  onMoins,
  onPlus,
  labelMoins,
  labelPlus,
  moinsDesactive = false,
}: {
  valeur: string;
  onMoins: () => void;
  onPlus: () => void;
  labelMoins: string;
  labelPlus: string;
  moinsDesactive?: boolean;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={labelMoins}
        accessibilityState={{ disabled: moinsDesactive }}
        disabled={moinsDesactive}
        hitSlop={4}
        onPress={onMoins}
        style={({ pressed }) => [styles.bouton, styles.moins, (pressed || moinsDesactive) && styles.attenue]}
      >
        <Text style={styles.signeMoins}>−</Text>
      </Pressable>
      <Text style={styles.valeur} accessibilityLiveRegion="polite">
        {valeur}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={labelPlus}
        hitSlop={4}
        onPress={onPlus}
        style={({ pressed }) => [styles.bouton, styles.plus, pressed && styles.attenue]}
      >
        <Text style={styles.signePlus}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
  bouton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  moins: { borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.card },
  plus: { backgroundColor: colors.olive },
  attenue: { opacity: 0.5 },
  signeMoins: { fontSize: 18, lineHeight: 22, color: colors.ink, ...police("800") },
  signePlus: { fontSize: 18, lineHeight: 22, color: colors.white, ...police("800") },
  valeur: { minWidth: 20, textAlign: "center", fontSize: 15, color: colors.ink, ...police("800") },
});
