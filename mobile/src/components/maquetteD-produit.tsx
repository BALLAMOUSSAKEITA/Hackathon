/**
 * Illustrations de produit du marché (groupe D), recopiées de maq/12-produit.html et maq/13-marche.html.
 * Chaque produit reçoit un dessin simple et un fond pastel propre à sa catégorie.
 */
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from "react-native-svg";

import { aLabelEau, colors, FAMILLES, labelEau } from "../theme";
import { Icon } from "./icons";

export type FormeProduit = "bouteille" | "fruit" | "poire" | "grappe" | "pousse";

export type VisuelProduit = {
  forme: FormeProduit;
  /** Couleur principale du dessin. */
  couleur: string;
  /** Fond pastel de la carte du marché. */
  fond: string;
  /** Fond du héros de la fiche produit. */
  fondHero: string;
};

const FEUILLE = "#4E7A1E";

const VISUELS: Record<string, VisuelProduit> = {
  huile: { forme: "bouteille", couleur: "#C9A227", fond: "#EFE8CC", fondHero: colors.oliveMist },
  grenade: { forme: "fruit", couleur: "#B23A3A", fond: "#F5DEDA", fondHero: "#F5DEDA" },
  datte: { forme: "fruit", couleur: "#8A5A2B", fond: "#F0E2D0", fondHero: "#F0E2D0" },
  figue: { forme: "fruit", couleur: "#C2557A", fond: "#E5ECD6", fondHero: "#E5ECD6" },
  oignon: { forme: "poire", couleur: "#B98A4E", fond: "#F1E8D6", fondHero: "#F1E8D6" },
  capre: { forme: "grappe", couleur: "#6E9A50", fond: "#E3EBD3", fondHero: "#E3EBD3" },
  pousse: { forme: "pousse", couleur: colors.olive, fond: colors.oliveMist, fondHero: colors.oliveMist },
};

/** Mots qui désignent chaque famille, dans les trois langues et sur l'identifiant. */
const MOTS: [string, string[]][] = [
  ["huile", ["huile", "olive", "olivier", "zitoun", "zit", "زيت", "زيتون"]],
  ["grenade", ["grenade", "rumman", "roman", "رمان"]],
  ["datte", ["datte", "deglet", "tmar", "تمر"]],
  ["figue", ["figue", "figuier", "barbarie", "hindi", "كرموس", "هندي"]],
  ["oignon", ["oignon", "poire", "bsal", "بصل", "إجاص"]],
  ["capre", ["capre", "câpre", "kebbar", "كبّار", "كبار"]],
];

const CATEGORIES: Record<string, string> = { huile: "huile", condiment: "capre" };

type ProduitVisuel = { id?: string; categorie?: string; nom?: Partial<Record<string, string>> | string };

function normaliser(texte: string): string {
  return texte.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Associe un produit à son dessin et à son fond. Repli : la pousse sur fond oliveMist. */
export function visuelProduit(produit: ProduitVisuel): VisuelProduit {
  const noms = typeof produit.nom === "string" ? [produit.nom] : Object.values(produit.nom ?? {});
  const texte = normaliser([produit.id ?? "", ...noms].join(" "));
  for (const [cle, mots] of MOTS) {
    if (mots.some((mot) => texte.includes(normaliser(mot)))) {
      return VISUELS[cle];
    }
  }
  const parCategorie = CATEGORIES[normaliser(produit.categorie ?? "")];
  return parCategorie ? VISUELS[parCategorie] : VISUELS.pousse;
}

/** Petit dessin des cartes du marché (environ 44 px). */
export function DessinProduit({ visuel, taille = 44 }: { visuel: VisuelProduit; taille?: number }) {
  switch (visuel.forme) {
    case "bouteille":
      return (
        <Svg width={taille * (40 / 48)} height={taille} viewBox="0 0 40 48">
          <Rect x={12} y={2} width={16} height={8} rx={2} fill={colors.olive} />
          <Rect x={8} y={10} width={24} height={36} rx={8} fill={visuel.couleur} />
        </Svg>
      );
    case "pousse":
      return <Icon name="sprout" color={visuel.couleur} size={taille * 0.8} strokeWidth={1.8} />;
    default:
      return (
        <Svg width={taille} height={taille} viewBox="0 0 44 44">
          <DessinFormeBrute visuel={visuel} />
        </Svg>
      );
  }
}

/** Grand dessin du héros de la fiche produit. */
export function HeroProduit({ visuel, note, largeur = 210 }: { visuel: VisuelProduit; note: string | null | undefined; largeur?: number }) {
  const hauteur = largeur * (170 / 210);
  if (visuel.forme === "bouteille") {
    const bg = aLabelEau(note) ? labelEau.bg : colors.lineStrong;
    return (
      <Svg width={largeur} height={hauteur} viewBox="0 0 210 170">
        <Path d="M20 150 C70 120 120 95 190 30" fill="none" stroke="#4E6B3C" strokeWidth={4} strokeLinecap="round" />
        <G fill="#6E9A50">
          <Ellipse cx={60} cy={118} rx={22} ry={7} transform="rotate(-40 60 118)" />
          <Ellipse cx={96} cy={112} rx={22} ry={7} transform="rotate(20 96 112)" />
          <Ellipse cx={120} cy={78} rx={22} ry={7} transform="rotate(-50 120 78)" />
          <Ellipse cx={156} cy={70} rx={22} ry={7} transform="rotate(10 156 70)" />
          <Ellipse cx={170} cy={36} rx={18} ry={6} transform="rotate(-60 170 36)" />
        </G>
        <G fill="#3F5A2C">
          <Circle cx={82} cy={132} r={8} />
          <Circle cx={140} cy={94} r={8} />
        </G>
        <Rect x={86} y={24} width={38} height={120} rx={12} fill={visuel.couleur} />
        <Rect x={98} y={6} width={14} height={22} rx={3} fill={colors.olive} />
        <Rect x={92} y={70} width={26} height={34} rx={4} fill="#FFFFFF" />
        <SvgText x={105} y={94} textAnchor="middle" fontFamily={FAMILLES["800"]} fontSize={20} fill={note ? bg : colors.muted}>
          {note ?? "–"}
        </SvgText>
      </Svg>
    );
  }
  // Les autres produits : le même dessin que la carte, en grand, posé sur une branche.
  return (
    <Svg width={largeur} height={hauteur} viewBox="0 0 210 170">
      <Path d="M20 150 C70 130 140 130 190 150" fill="none" stroke="#4E6B3C" strokeWidth={4} strokeLinecap="round" />
      <G fill="#6E9A50">
        <Ellipse cx={46} cy={138} rx={18} ry={6} transform="rotate(-20 46 138)" />
        <Ellipse cx={166} cy={138} rx={18} ry={6} transform="rotate(20 166 138)" />
      </G>
      <G transform="translate(45 5) scale(2.75)">
        <DessinFormeBrute visuel={visuel} />
      </G>
    </Svg>
  );
}

/** Tracés bruts (repère 44 × 44) réutilisés dans le héros. */
function DessinFormeBrute({ visuel }: { visuel: VisuelProduit }) {
  switch (visuel.forme) {
    case "fruit":
      return (
        <G>
          <Circle cx={22} cy={26} r={15} fill={visuel.couleur} />
          <Path d="M22 11 C22 6 26 3 31 3 C31 8 27 11 22 11z" fill={FEUILLE} />
        </G>
      );
    case "poire":
      return (
        <G>
          <Path d="M22 6 C30 16 36 22 36 30 a14 12 0 0 1 -28 0 C8 22 14 16 22 6z" fill={visuel.couleur} />
          <Path d="M22 6 V1" stroke={FEUILLE} strokeWidth={3} strokeLinecap="round" />
        </G>
      );
    case "grappe":
      return (
        <G>
          <Path d="M22 4 C22 10 16 14 14 22 M22 4 C24 12 30 16 31 24 M22 4 V20" stroke={FEUILLE} strokeWidth={2} strokeLinecap="round" fill="none" />
          <Circle cx={14} cy={28} r={8} fill={visuel.couleur} />
          <Circle cx={30} cy={29} r={8} fill={visuel.couleur} />
          <Circle cx={22} cy={34} r={8} fill="#5A8540" />
        </G>
      );
    default:
      return (
        <G stroke={colors.olive} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <Path d="M22 40 V20" />
          <Path d="M22 26 C14 26 9 21 9 13 C17 13 22 18 22 26z" fill="#6E9A50" />
          <Path d="M22 20 C22 12 27 7 35 7 C35 15 30 20 22 20z" fill="#6E9A50" />
        </G>
      );
  }
}
