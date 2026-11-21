import data from "../../fixtures/sprint-01.json";
import profilsDemo from "../../fixtures/sprint-02.json";
import culturesDemo from "../../fixtures/sprint-03.json";
import parcelleDemo from "../../fixtures/sprint-04.json";
import analyseDemo from "../../fixtures/sprint-05.json";
import classementDemo from "../../fixtures/sprint-06.json";

import type { Role } from "./session";
import type { Fixture, Localized } from "./types";

export const fixture = data as Fixture;

export type ProfilDemo = {
  id: string;
  nom: string;
  telephone: string;
  role: Role;
  libelle: Localized;
};

export const sprint02 = profilsDemo as {
  code_sms: string;
  profils: ProfilDemo[];
};

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

export type CultureFiche = {
  id: string;
  nom: Localized;
  kc: { initial: number; developpement: number; mi_saison: number; fin: number };
  rendement_t_ha: number;
  besoin_eau_m3_ha: number;
  prix: { min: number; typique: number; max: number; unite: string };
  couts_dt_ha: number;
  sols: string[];
  tolerance_sel: "faible" | "moyenne" | "elevee";
  tolerance_chaleur: "faible" | "moyenne" | "elevee";
  delai: Localized;
  source_prix: Localized;
};

export const sprint03 = culturesDemo as {
  hypothese: Localized;
  cultures: CultureFiche[];
};

export type ParcelleDemo = {
  id: string;
  nom: string;
  geometrie: { type: "Polygon"; coordinates: [number, number][][] };
  surface_ha_exemple: number;
  source_eau: "puits" | "gda" | "reseau";
  profondeur_puits_m: number;
  debit_m3_h: number;
  energie: "gasoil" | "reseau" | "solaire";
  culture_actuelle: { id: string; nom: Localized };
  photo_sol: string | null;
};

export const sprint04 = parcelleDemo as unknown as {
  hypothese: Localized;
  proprietaire: { id: string };
  parcelle: ParcelleDemo;
};

export type BlocSource = { source: string; fige: boolean };

export type AnalyseDemo = {
  sol: BlocSource & {
    texture: Localized;
    sable_pct: number;
    limon_pct: number;
    argile_pct: number;
    ph: number;
    matiere_organique_g_kg: number;
  };
  climat: BlocSource & { pluie_mm: number; temperature_c: number; et0_mm_jour: number; fenetre_jours?: number };
  ensoleillement: BlocSource & { kwh_m2_jour: number };
  eau_disponible_m3: number;
  kwh_m3: number;
  eta: number;
  profondeur_puits_m: number;
  debit_m3_h: number;
  heures_pompage_par_jour: number;
  jours_saison: number;
  ndvi: { mois: Localized; valeur: number }[];
  source_ndvi: string;
  cache: boolean;
};

export const sprint05 = analyseDemo as unknown as {
  hypothese: Localized;
  parcelle: { id: string };
  analyse: AnalyseDemo;
};

export const sprint06 = classementDemo as unknown as {
  hypothese: Localized;
  parcelle_id: string;
  culture_actuelle: string;
};
