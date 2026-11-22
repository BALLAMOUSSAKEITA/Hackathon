/** Même calcul que api/app/recommandations.py, pour classer les cultures sans réseau. À garder identique. */
import classementDemo from "../../fixtures/sprint-06.json";

import type { Localized } from "./types";

export type Tri = "revenu" | "eau" | "delai";

export type Ligne = {
  id: string;
  nom: Localized;
  dt_m3: number;
  eau_m3_ha: number;
  kwh_ha: number;
  delai: Localized;
  delai_mois: number;
  label: string;
  intercalaire: boolean;
  risques: string[];
  pourquoi: Localized;
};

export type Classement = {
  tri: Tri;
  cultures: Ligne[];
  exclues: { id: string; nom: Localized; motifs: string[] }[];
  culture_actuelle: {
    id: string;
    nom: Localized;
    incluse: boolean;
    motifs: string[];
    dt_m3: number | null;
    label: string | null;
    ecart_dt_m3: number | null;
    meilleure: Localized | null;
  };
};

type Niveau = "faible" | "moyenne" | "elevee";

type CultureFiche = {
  id: string;
  nom: Localized;
  besoin_eau_m3_ha: number;
  rendement_t_ha: number;
  prix_typique: number;
  couts_dt_ha: number;
  sols: string[];
  tolerance_sel: string;
  tolerance_chaleur: string;
  delai: Localized;
  delai_mois: number;
  intercalaire: boolean;
};

const fiche = classementDemo as unknown as {
  parcelle_id: string;
  culture_actuelle: string;
  sol: string;
  sel: Niveau;
  chaleur: Niveau;
  eau_disponible_m3_ha: number;
  kwh_m3: number;
  eta: number;
  prix_kwh_dt: number;
  efficience: number;
  pluie_incertaine: boolean;
  penalite_pluie: number;
  penalite_puits: number;
  seuil_puits: number;
  cultures: CultureFiche[];
};

const RANG: Record<string, number> = { faible: 1, moyenne: 2, elevee: 3 };

function centieme(valeur: number): number {
  return Math.floor(valeur * 100 + 0.5) / 100;
}

/** Renvoie "eau" si la culture est suffisamment efficace pour obtenir le Label Eau, "" sinon. */
export function lettre(dt: number): string {
  return dt >= 1.5 ? "eau" : "";
}

function motifs(culture: CultureFiche): string[] {
  const liste: string[] = [];
  if (!culture.sols.includes(fiche.sol)) liste.push("sol");
  if (RANG[culture.tolerance_sel] < RANG[fiche.sel]) liste.push("sel");
  if (RANG[culture.tolerance_chaleur] < RANG[fiche.chaleur]) liste.push("chaleur");
  if (culture.besoin_eau_m3_ha > fiche.eau_disponible_m3_ha) liste.push("eau");
  return liste;
}

function ligne(culture: CultureFiche): Ligne {
  const eau = culture.besoin_eau_m3_ha;
  const energie = eau * fiche.kwh_m3 * fiche.prix_kwh_dt;
  const brut = culture.rendement_t_ha * 1000 * culture.prix_typique - culture.couts_dt_ha - energie;
  const risques: string[] = [];
  let facteur = 1;
  if (eau > fiche.seuil_puits * fiche.eau_disponible_m3_ha) {
    facteur *= fiche.penalite_puits;
    risques.push("puits_juste");
  }
  if (fiche.pluie_incertaine) {
    facteur *= fiche.penalite_pluie;
    risques.push("pluie_incertaine");
  }
  const dt = centieme((brut / eau) * facteur);
  const texte = (prefixe: string) => `${prefixe} : ${dt} DT/m³, ${eau} m³/ha.`;
  return {
    id: culture.id,
    nom: culture.nom,
    dt_m3: dt,
    eau_m3_ha: eau,
    kwh_ha: Math.round(eau * fiche.kwh_m3),
    delai: culture.delai,
    delai_mois: culture.delai_mois,
    label: lettre(dt),
    intercalaire: culture.intercalaire,
    risques,
    pourquoi: { fr: texte(culture.nom.fr), ar: texte(culture.nom.ar), darija: texte(culture.nom.darija) },
  };
}

export function classerLocal(tri: Tri): Classement {
  const retenues: Ligne[] = [];
  const exclues: Classement["exclues"] = [];
  for (const culture of fiche.cultures) {
    const m = motifs(culture);
    if (m.length) {
      exclues.push({ id: culture.id, nom: culture.nom, motifs: m });
    } else {
      retenues.push(ligne(culture));
    }
  }
  if (tri === "eau") {
    retenues.sort((a, b) => a.eau_m3_ha - b.eau_m3_ha || a.id.localeCompare(b.id));
  } else if (tri === "delai") {
    retenues.sort((a, b) => a.delai_mois - b.delai_mois || a.id.localeCompare(b.id));
  } else {
    retenues.sort((a, b) => b.dt_m3 - a.dt_m3 || a.id.localeCompare(b.id));
  }
  const actuelle = fiche.cultures.find((c) => c.id === fiche.culture_actuelle) ?? fiche.cultures[0];
  const dansListe = retenues.find((l) => l.id === actuelle.id) ?? null;
  const exclusion = exclues.find((l) => l.id === actuelle.id) ?? null;
  return {
    tri,
    cultures: retenues,
    exclues,
    culture_actuelle: {
      id: actuelle.id,
      nom: actuelle.nom,
      incluse: dansListe !== null,
      motifs: exclusion?.motifs ?? [],
      dt_m3: dansListe?.dt_m3 ?? null,
      label: dansListe?.label ?? null,
      ecart_dt_m3: dansListe && retenues.length ? centieme(retenues[0].dt_m3 - dansListe.dt_m3) : null,
      meilleure: retenues[0]?.nom ?? null,
    },
  };
}

export const parcelleClassement = fiche.parcelle_id;
