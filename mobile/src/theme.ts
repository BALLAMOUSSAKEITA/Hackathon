import { Platform, type TextStyle, type ViewStyle } from "react-native";

/** Couleurs relevées dans « Ardi — Maquettes mobiles ». */
export const colors = {
  bg: "#F5F7F2",
  ink: "#17231A",
  muted: "#5B6B5E",
  body: "#3E4D41",
  card: "#FFFFFF",
  line: "#E3E8DF",
  lineStrong: "#D5DCCF",
  olive: "#2E5E3A",
  oliveDeep: "#24492D",
  oliveSoft: "#E6EFE2",
  oliveMist: "#DCE7D5",
  leaf: "#D7E6D0",
  green: "#4E7A1E",
  clay: "#A8321F",
  claySoft: "#FBE1DB",
  sand: "#FBEBD3",
  amber: "#A85F00",
  amberBright: "#E8A13A",
  orange: "#D9822B",
  water: "#1D63A6",
  waterSoft: "#DCEAF7",
  labelA: "#1F6B3A",
  white: "#FFFFFF",
  scanner: "#17231A",
  scannerSoft: "#2F3D32",
};

/** Label Eau : certification unique (oui / non), comme le label bio. */
export const labelEau = { bg: colors.water, fg: "#FFFFFF" };

/** Renvoie les couleurs du Label Eau si la culture a le label, sinon un gris neutre. */
export function couleurLabel(note: string | null | undefined) {
  return aLabelEau(note) ? labelEau : { bg: colors.lineStrong, fg: colors.ink };
}

/** Vrai si la note indique que la culture a obtenu le Label Eau. */
export function aLabelEau(note: string | null | undefined): boolean {
  return note === "eau" || note === "A" || note === "B";
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

export const radius = { sm: 10, md: 14, lg: 16, xl: 22, pill: 999 };

/** Les maquettes sont à plat : pas d'ombre sur les cartes. Gardée pour les éléments flottants. */
export const shadow: ViewStyle =
  Platform.select<ViewStyle>({
    web: { boxShadow: "0 4px 16px rgba(23, 35, 26, 0.10)" } as ViewStyle,
    ios: { shadowColor: "#17231A", shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
    default: { elevation: 3 },
  }) ?? {};

export const tap = {
  minHeight: 44,
  minWidth: 44,
};

/** Police Manrope : une famille par graisse (fiable sur Android comme sur iOS et le web). */
export const FAMILLES = {
  "400": "Manrope_400Regular",
  "500": "Manrope_500Medium",
  "600": "Manrope_600SemiBold",
  "700": "Manrope_700Bold",
  "800": "Manrope_800ExtraBold",
} as const;

export function police(poids: TextStyle["fontWeight"] = "400"): TextStyle {
  const n = poids === "bold" ? 700 : poids === "normal" || poids === undefined ? 400 : Number(poids);
  const cle = n >= 800 ? "800" : n >= 700 ? "700" : n >= 600 ? "600" : n >= 500 ? "500" : "400";
  return { fontFamily: FAMILLES[cle], fontWeight: "normal" };
}
