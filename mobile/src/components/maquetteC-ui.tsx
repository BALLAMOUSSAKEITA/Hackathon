/** Petits éléments communs aux écrans du groupe C, relevés dans les maquettes 08 à 11. */
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { useI18n } from "../i18n";
import { colors, police } from "../theme";
import { BackButton } from "./chrome";
import { Icon, type IconName } from "./icons";

type Poids = "400" | "500" | "600" | "700" | "800";

/** Texte aux tailles exactes des maquettes, aligné selon la langue. */
export function T({
  children,
  size = 14,
  weight = "400",
  color = colors.ink,
  lh,
  center = false,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  size?: number;
  weight?: Poids;
  color?: string;
  lh?: number;
  center?: boolean;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const { align } = useI18n();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[{ fontSize: size, color, textAlign: center ? "center" : align, lineHeight: lh ? Math.round(size * lh) : undefined }, police(weight), style]}
    >
      {children}
    </Text>
  );
}

/** En-tête des maquettes : bouton retour rond blanc, titre 22/800, sous-titre 13/600. */
export function EnTete({ titre, sousTitre, droite, retour = true }: { titre: string; sousTitre?: string; droite?: ReactNode; retour?: boolean }) {
  return (
    <View style={styles.entete}>
      {retour ? <BackButton /> : null}
      <View style={styles.flex}>
        <T size={22} weight="800" style={styles.titre}>
          {titre}
        </T>
        {sousTitre ? (
          <T size={13} weight="600" color={colors.muted} style={styles.sousTitre}>
            {sousTitre}
          </T>
        ) : null}
      </View>
      {droite}
    </View>
  );
}

/** Carte blanche plate (rayon 18, marge 16). */
export function Carte({ children, style, onPress, label }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; label?: string }) {
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.carte, style, pressed && styles.presse]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.carte, style]}>{children}</View>;
}

/** Interrupteur en pastilles (Gasoil/STEG, Végétation/Humidité). */
export function Pastilles<V extends string>({
  options,
  valeur,
  onChange,
  couleur = colors.olive,
  label,
}: {
  options: { id: V; label: string }[];
  valeur: V;
  onChange: (id: V) => void;
  couleur?: string;
  label?: string;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.pastilles}>
      {options.map((option) => {
        const on = option.id === valeur;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(option.id)}
            hitSlop={4}
            style={({ pressed }) => [styles.pastille, on ? { backgroundColor: couleur, borderColor: couleur } : null, pressed && styles.presse]}
          >
            <Text style={[styles.pastilleTexte, on ? styles.pastilleTexteOn : null]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Contrôle segmenté sur fond gris, onglet actif en blanc (maquette 10). */
export function Segment<V extends string>({ options, valeur, onChange }: { options: { id: V; label: string }[]; valeur: V; onChange: (id: V) => void }) {
  return (
    <View accessibilityRole="tablist" style={styles.segment}>
      {options.map((option) => {
        const on = option.id === valeur;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(option.id)}
            style={[styles.segmentOnglet, on && styles.segmentOngletOn]}
          >
            <Text style={[styles.segmentTexte, on && styles.segmentTexteOn]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Pastille ronde colorée portant une icône (alertes, notifications). */
export function PastilleIcone({ icon, bg, fg, size = 40, children }: { icon?: IconName; bg: string; fg: string; size?: number; children?: ReactNode }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
      {icon ? <Icon name={icon} color={fg} size={size / 2} strokeWidth={2.2} /> : children}
    </View>
  );
}

/** Étiquette de statut 11/800 (À confirmer, Devis, Payée…). */
export function Etiquette({ texte, bg, fg }: { texte: string; bg: string; fg: string }) {
  return (
    <View style={[styles.etiquette, { backgroundColor: bg }]}>
      <Text style={[styles.etiquetteTexte, { color: fg }]}>{texte}</Text>
    </View>
  );
}

/** Ligne de liste avec icône posée en ligne (sans pastille), titre et sous-titre. */
export function Ligne({
  icon,
  iconColor = colors.olive,
  titre,
  sousTitre,
  droite,
  onPress,
  derniere = false,
}: {
  icon?: IconName;
  iconColor?: string;
  titre: string;
  sousTitre?: string;
  droite?: ReactNode;
  onPress?: () => void;
  derniere?: boolean;
}) {
  const { direction } = useI18n();
  const contenu = (
    <>
      {icon ? <Icon name={icon} color={iconColor} size={22} /> : null}
      <View style={styles.flex}>
        <T size={15} weight="800">
          {titre}
        </T>
        {sousTitre ? (
          <T size={13} color={colors.muted} lh={1.35}>
            {sousTitre}
          </T>
        ) : null}
      </View>
      {droite ?? (onPress ? <Icon name={direction === "rtl" ? "back" : "forward"} color={colors.muted} size={18} /> : null)}
    </>
  );
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.ligne, !derniere && styles.ligneBord, pressed && styles.lignePressee]}>
        {contenu}
      </Pressable>
    );
  }
  return <View style={[styles.ligne, !derniere && styles.ligneBord]}>{contenu}</View>;
}

/** Bouton d'action des maquettes : plein vert ou contour gris, rayon 12, hauteur 44. */
export function Action({
  label,
  onPress,
  contour = false,
  loading = false,
  disabled = false,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  contour?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const couleur = contour ? colors.ink : colors.white;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.action, contour ? styles.actionContour : styles.actionPlein, pressed && styles.presse, (disabled || loading) && styles.inactif, style]}
    >
      {icon ? <Icon name={icon} color={contour ? colors.olive : colors.white} size={18} /> : null}
      <Text style={[styles.actionTexte, contour ? police("700") : police("800"), { color: couleur }]} numberOfLines={1}>
        {loading ? "…" : label}
      </Text>
    </Pressable>
  );
}

/** Petit titre de groupe en majuscules grises (AUJOURD'HUI, CETTE SEMAINE). */
export function TitreGroupe({ children }: { children: string }) {
  return (
    <T size={13} weight="800" color={colors.muted} style={styles.groupe}>
      {children}
    </T>
  );
}

/** Date courte « 18 nov. » dans la langue choisie (la darija suit le format français). */
export function dateCourte(ms: number, lang: "fr" | "ar" | "darija"): string {
  try {
    return new Date(ms).toLocaleDateString(lang === "ar" ? "ar-TN" : "fr-FR", { day: "numeric", month: "short" });
  } catch {
    const d = new Date(ms);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }
}

export const C = {
  /** Couleurs relevées dans les maquettes 08 à 11 qui ne sont pas dans le thème. */
  heroClair: "#FBE3C2",
  heroTexte: "#FFF3E2",
  ambreFonce: "#7A4300",
  barreSoleil: colors.amberBright,
  carteFond: "#E4EAD8",
  vertClair: "#B8C98A",
  bleuFonce: "#154B80",
  bleuClair: "#9EC3E6",
  vertPale: "#E6EFE2",
  vertTexte: "#1F4A2A",
  segmentFond: "#E6EBE1",
  segmentTexte: "#4A5A4D",
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  entete: { flexDirection: "row", alignItems: "center", gap: 12 },
  titre: { letterSpacing: -0.44 },
  sousTitre: { marginTop: 2 },
  carte: { backgroundColor: colors.card, borderRadius: 18, padding: 16, gap: 12 },
  presse: { opacity: 0.85 },
  inactif: { opacity: 0.5 },
  pastilles: { flexDirection: "row", gap: 6 },
  pastille: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  pastilleTexte: { fontSize: 12, color: colors.ink, ...police("600") },
  pastilleTexteOn: { color: colors.white, ...police("800") },
  segment: { flexDirection: "row", gap: 4, backgroundColor: C.segmentFond, borderRadius: 14, padding: 4 },
  segmentOnglet: { flex: 1, minHeight: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  segmentOngletOn: { backgroundColor: colors.card },
  segmentTexte: { fontSize: 13, color: C.segmentTexte, ...police("600") },
  segmentTexteOn: { color: colors.ink, ...police("800") },
  etiquette: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, alignSelf: "flex-start" },
  etiquetteTexte: { fontSize: 11, ...police("800") },
  ligne: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingVertical: 10 },
  ligneBord: { borderBottomWidth: 1, borderBottomColor: colors.line },
  lignePressee: { opacity: 0.7 },
  action: { flex: 1, minHeight: 44, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 10 },
  actionPlein: { backgroundColor: colors.olive },
  actionContour: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.lineStrong },
  actionTexte: { fontSize: 14 },
  groupe: { textTransform: "uppercase", letterSpacing: 0.78, marginTop: 4 },
});
