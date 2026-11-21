import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Lang } from "./types";

const LANGUE = "ardi.langue";
const COMPTE = "ardi.compte";

export type Role = "agriculteur" | "acheteur" | "professionnel";

export type Compte = {
  id: string;
  nom: string;
  telephone: string;
  role: Role;
  langue: Lang;
};

function langueValide(valeur: string | null): valeur is Lang {
  return valeur === "fr" || valeur === "ar" || valeur === "darija";
}

export async function lireLangue(): Promise<Lang | null> {
  const valeur = await AsyncStorage.getItem(LANGUE);
  return langueValide(valeur) ? valeur : null;
}

export async function ecrireLangue(langue: Lang): Promise<void> {
  await AsyncStorage.setItem(LANGUE, langue);
}

export async function lireCompte(): Promise<Compte | null> {
  const brut = await AsyncStorage.getItem(COMPTE);
  if (!brut) {
    return null;
  }
  const compte = JSON.parse(brut) as Compte;
  if (!compte?.id || !langueValide(compte.langue)) {
    return null;
  }
  return compte;
}

export async function ecrireCompte(compte: Compte): Promise<void> {
  await AsyncStorage.setItem(COMPTE, JSON.stringify(compte));
}
