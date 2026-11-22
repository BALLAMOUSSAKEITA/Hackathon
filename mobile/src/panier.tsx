import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { Localized } from "./types";

export type ProduitMarche = {
  id: string;
  qr: string;
  nom: Localized;
  prix: number;
  unite: string;
  label: string;
  categorie: string;
  region: string;
  ferme: string;
  eau_m3_kg: number;
  kwh_kg: number;
  histoire: Localized;
};

export type LignePanier = { produit: ProduitMarche; quantite: number };

type PanierValeur = {
  lignes: LignePanier[];
  nombre: number;
  sousTotal: number;
  eau: number;
  ajouter: (produit: ProduitMarche, quantite?: number) => void;
  changer: (produitId: string, quantite: number) => void;
  retirer: (produitId: string) => void;
  vider: () => void;
};

const PanierContext = createContext<PanierValeur | null>(null);

export function PanierProvider({ children }: { children: ReactNode }) {
  const [lignes, setLignes] = useState<LignePanier[]>([]);

  const valeur = useMemo<PanierValeur>(() => {
    const ajouter = (produit: ProduitMarche, quantite = 1) =>
      setLignes((actuel) => {
        const existe = actuel.find((ligne) => ligne.produit.id === produit.id);
        if (existe) {
          return actuel.map((ligne) => (ligne.produit.id === produit.id ? { ...ligne, quantite: ligne.quantite + quantite } : ligne));
        }
        return [...actuel, { produit, quantite }];
      });
    const changer = (produitId: string, quantite: number) =>
      setLignes((actuel) =>
        quantite <= 0
          ? actuel.filter((ligne) => ligne.produit.id !== produitId)
          : actuel.map((ligne) => (ligne.produit.id === produitId ? { ...ligne, quantite } : ligne)),
      );
    return {
      lignes,
      nombre: lignes.reduce((somme, ligne) => somme + ligne.quantite, 0),
      sousTotal: Math.round(lignes.reduce((somme, ligne) => somme + ligne.quantite * ligne.produit.prix, 0) * 100) / 100,
      eau: Math.round(lignes.reduce((somme, ligne) => somme + ligne.quantite * ligne.produit.eau_m3_kg, 0) * 100) / 100,
      ajouter,
      changer,
      retirer: (produitId) => changer(produitId, 0),
      vider: () => setLignes([]),
    };
  }, [lignes]);

  return <PanierContext.Provider value={valeur}>{children}</PanierContext.Provider>;
}

export function usePanier(): PanierValeur {
  const valeur = useContext(PanierContext);
  if (!valeur) {
    throw new Error("usePanier hors PanierProvider");
  }
  return valeur;
}
