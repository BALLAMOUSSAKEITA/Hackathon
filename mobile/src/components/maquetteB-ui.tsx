/** Composants partagés par les écrans du groupe B (Planter, Simulateur, Assistant, Label). */
import { useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Rect } from "react-native-svg";

import { useI18n } from "../i18n";
import { aLabelEau, colors, labelEau, police } from "../theme";
import { BackButton } from "./chrome";
import { Icon, type IconName } from "./icons";

/* ------------------------------------------------------------------ */
/* En-tête : retour rond blanc 44, titre 22/800, sous-titre 13/600      */
/* ------------------------------------------------------------------ */

export function EnTeteB({ titre, sousTitre, retour = true }: { titre: string; sousTitre?: string; retour?: boolean }) {
  const { align } = useI18n();
  return (
    <View style={styles.entete}>
      {retour ? <BackButton /> : null}
      <View style={styles.flex}>
        <Text accessibilityRole="header" style={[styles.titre, { textAlign: align }]}>
          {titre}
        </Text>
        {sousTitre ? <Text style={[styles.sousTitre, { textAlign: align }]}>{sousTitre}</Text> : null}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Bouton plein olive, 54 de haut, icône après le libellé                */
/* ------------------------------------------------------------------ */

export function BoutonB({
  libelle,
  onPress,
  icone,
  chargement = false,
  inactif = false,
  style,
}: {
  libelle: string;
  onPress: () => void;
  icone?: IconName;
  chargement?: boolean;
  inactif?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bloque = inactif || chargement;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: bloque, busy: chargement }}
      disabled={bloque}
      onPress={onPress}
      style={({ pressed }) => [styles.bouton, pressed && styles.presse, inactif && styles.inactif, style]}
    >
      {chargement ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <>
          <Text style={styles.boutonTexte} numberOfLines={1}>
            {libelle}
          </Text>
          {icone ? <Icon name={icone} color={colors.white} size={20} strokeWidth={2.2} /> : null}
        </>
      )}
    </Pressable>
  );
}

/** Flèche « suivant » qui suit le sens de lecture. */
export function useFleche(): IconName {
  const { direction } = useI18n();
  return direction === "rtl" ? "arrowLeft" : "arrowRight";
}

/* ------------------------------------------------------------------ */
/* Badge Label Eau (certification unique, comme le label bio)           */
/* ------------------------------------------------------------------ */

export function CarreLabel({
  note,
  taille = 34,
  rayon = 10,
  inverse = false,
}: {
  note: string | null | undefined;
  taille?: number;
  rayon?: number;
  /** Sur fond sombre : fond blanc, icône bleue. */
  inverse?: boolean;
}) {
  const aLabel = aLabelEau(note);
  const fond = inverse ? colors.white : aLabel ? labelEau.bg : colors.lineStrong;
  const couleur = inverse ? (aLabel ? labelEau.bg : colors.muted) : labelEau.fg;
  const iconSize = Math.round(taille * 0.38);
  return (
    <View
      accessibilityLabel={aLabel ? "Label Eau" : "Sans label"}
      style={{ width: taille, height: taille, borderRadius: rayon, backgroundColor: fond, alignItems: "center", justifyContent: "center", gap: 1 }}
    >
      {aLabel ? (
        <>
          <Icon name="drop" color={couleur} size={iconSize} strokeWidth={2} />
          <Text style={{ color: couleur, fontSize: Math.round(taille * 0.2), letterSpacing: 0.5, ...police("800") }}>EAU</Text>
        </>
      ) : (
        <Text style={{ color: colors.muted, fontSize: Math.round(taille * 0.28), ...police("600") }}>–</Text>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Curseur glissable (sans bibliothèque), compatible droite-gauche      */
/* ------------------------------------------------------------------ */

const POUCE = 24;

/**
 * Curseur de 0 à `max`, par pas de `pas`. `borne` limite la valeur atteignable
 * (par exemple la surface restante) sans changer l'échelle de la piste.
 * Geste géré par le système de « responder » de React Native (pas de bibliothèque).
 */
export function CurseurB({
  valeur,
  max,
  pas,
  borne = max,
  onChange,
  libelle,
  texteValeur,
}: {
  valeur: number;
  max: number;
  pas: number;
  borne?: number;
  onChange: (valeur: number) => void;
  libelle: string;
  texteValeur: string;
}) {
  const { direction } = useI18n();
  const rtl = direction === "rtl";
  const [largeur, setLargeur] = useState(0);
  const [actif, setActif] = useState(false);
  // Point de départ du geste, lu et écrit seulement dans les gestionnaires.
  const geste = useRef({ pageX: 0, ratio: 0 });
  const utile = Math.max(largeur - POUCE, 1);

  function versValeur(ratio: number) {
    const brut = Math.min(Math.max(ratio, 0), 1) * max;
    let v = Math.round(Math.min(brut, borne) / pas) * pas;
    if (v > borne + 1e-9) v -= pas;
    return Math.max(0, Math.round(v * 100) / 100);
  }

  function appliquer(ratio: number) {
    const v = versValeur(ratio);
    if (v !== valeur) onChange(v);
  }

  function debut(e: GestureResponderEvent) {
    const x = Math.min(Math.max(e.nativeEvent.locationX - POUCE / 2, 0), utile);
    const ratio = rtl ? 1 - x / utile : x / utile;
    geste.current = { pageX: e.nativeEvent.pageX, ratio };
    setActif(true);
    appliquer(ratio);
  }

  function deplacer(e: GestureResponderEvent) {
    const dx = e.nativeEvent.pageX - geste.current.pageX;
    appliquer(geste.current.ratio + (rtl ? -dx : dx) / utile);
  }

  function ajuster(sens: 1 | -1) {
    const suivant = Math.round(Math.min(Math.max(valeur + sens * pas, 0), borne) * 100) / 100;
    if (suivant !== valeur) onChange(suivant);
  }

  const ratio = max > 0 ? Math.min(valeur / max, 1) : 0;
  const position = largeur ? ratio * utile : 0;
  const ratioBorne = max > 0 ? Math.min(borne / max, 1) : 1;

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={libelle}
      accessibilityValue={{ min: 0, max: Math.round(max * 10), now: Math.round(valeur * 10), text: texteValeur }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => ajuster(e.nativeEvent.actionName === "increment" ? 1 : -1)}
      onLayout={(e: LayoutChangeEvent) => setLargeur(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={debut}
      onResponderMove={deplacer}
      onResponderRelease={() => setActif(false)}
      onResponderTerminate={() => setActif(false)}
      style={styles.curseur}
    >
      <View pointerEvents="none" style={styles.piste}>
        {ratioBorne < 1 && largeur ? (
          <View style={[styles.horsBorne, { start: POUCE / 2 + ratioBorne * utile, end: 0 }]} />
        ) : null}
        <View style={[styles.rempli, { width: POUCE / 2 + position }]} />
      </View>
      <View pointerEvents="none" style={[styles.pouce, actif && styles.pouceActif, { start: position }]} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* QR : motif stable pour un même code, dessiné en SVG                  */
/* ------------------------------------------------------------------ */

function motifQr(code: string, taille: number): boolean[] {
  let graine = 0;
  for (const lettre of code) {
    graine = (graine * 31 + lettre.charCodeAt(0)) >>> 0;
  }
  const cases: boolean[] = [];
  for (let i = 0; i < taille * taille; i += 1) {
    graine = (graine * 1103515245 + 12345) >>> 0;
    const x = i % taille;
    const y = Math.floor(i / taille);
    const repere = (cx: number, cy: number) => x >= cx && x < cx + 7 && y >= cy && y < cy + 7;
    if (repere(0, 0) || repere(taille - 7, 0) || repere(0, taille - 7)) {
      const lx = x < 7 ? x : x - (taille - 7);
      const ly = y < 7 ? y : y - (taille - 7);
      cases.push(lx === 0 || lx === 6 || ly === 0 || ly === 6 || (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4));
    } else if (x === 7 || y === 7 || x === taille - 8 || y === taille - 8) {
      // Séparateurs blancs autour des repères.
      cases.push(false);
    } else {
      cases.push(((graine >>> 16) & 3) === 0);
    }
  }
  return cases;
}

export function QrB({ code, taille = 92 }: { code: string; taille?: number }) {
  const n = 21;
  const cases = motifQr(code, n);
  return (
    <Svg width={taille} height={taille} viewBox={`-1 -1 ${n + 2} ${n + 2}`} accessibilityLabel={`QR ${code}`}>
      <Rect x={-1} y={-1} width={n + 2} height={n + 2} fill={colors.white} />
      {cases.map((plein, i) =>
        plein ? <Rect key={i} x={i % n} y={Math.floor(i / n)} width={1.02} height={1.02} fill={colors.ink} /> : null,
      )}
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Lien texte 13/800 olive                                              */
/* ------------------------------------------------------------------ */

export function LienB({ children, onPress, couleur = colors.olive }: { children: ReactNode; onPress: () => void; couleur?: string }) {
  const { align } = useI18n();
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={6} style={({ pressed }) => [styles.lien, pressed && styles.presse]}>
      <Text style={[styles.lienTexte, { color: couleur, textAlign: align }]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  entete: { flexDirection: "row", alignItems: "center", gap: 12 },
  titre: { fontSize: 22, lineHeight: 28, letterSpacing: -0.44, color: colors.ink, ...police("800") },
  sousTitre: { marginTop: 2, fontSize: 13, lineHeight: 18, color: colors.muted, ...police("600") },
  bouton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.olive,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  boutonTexte: { color: colors.white, fontSize: 16, flexShrink: 1, ...police("800") },
  presse: { opacity: 0.85 },
  inactif: { opacity: 0.45 },
  curseur: { height: 32, justifyContent: "center" },
  piste: {
    height: 6,
    marginHorizontal: 0,
    borderRadius: 3,
    backgroundColor: colors.lineStrong,
    overflow: "hidden",
  },
  horsBorne: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: colors.line,
    opacity: 0.9,
  },
  rempli: { position: "absolute", top: 0, bottom: 0, start: 0, backgroundColor: colors.olive, borderRadius: 3 },
  pouce: {
    position: "absolute",
    top: (32 - POUCE) / 2,
    width: POUCE,
    height: POUCE,
    borderRadius: POUCE / 2,
    backgroundColor: colors.olive,
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: colors.ink,
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  pouceActif: { transform: [{ scale: 1.15 }] },
  lien: { minHeight: 28, justifyContent: "center", alignSelf: "flex-start" },
  lienTexte: { fontSize: 13, ...police("800") },
});
