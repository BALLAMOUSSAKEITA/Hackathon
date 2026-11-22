import { useEffect, useState } from "react";

import { sprint02 } from "./fixture";
import { lireCompte, type Compte, type Role } from "./session";

/** Compte enregistré au moment de la connexion, sinon le profil de démo du rôle demandé. */
export function useCompte(role: Role = "agriculteur"): Compte {
  const demo = sprint02.profils.find((profil) => profil.role === role) ?? sprint02.profils[0];
  const [compte, setCompte] = useState<Compte>({
    id: demo.id,
    nom: demo.nom,
    telephone: demo.telephone,
    role: demo.role,
    langue: "fr",
  });
  useEffect(() => {
    let actif = true;
    lireCompte().then((lu) => {
      if (actif && lu && lu.role === role) {
        setCompte(lu);
      }
    });
    return () => {
      actif = false;
    };
  }, [role]);
  return compte;
}

export function initiales(nom: string): string {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0]?.toUpperCase() ?? "")
    .join("");
}
