export type Lang = "fr" | "ar" | "darija";

export type Localized = Record<Lang, string>;

export type Fixture = {
  ferme: {
    id: string;
    nom: string;
    region: string;
    agriculteur: {
      id: string;
      nom: string;
      telephone: string;
      role: string;
      langue: Lang;
    };
  };
  parcelle: {
    id: string;
    nom: string;
    geometrie: {
      type: "Polygon";
      coordinates: number[][][];
    };
    surface_ha: number;
    source_eau: "puits" | "gda" | "reseau";
    profondeur_puits_m: number;
    debit_m3_h: number;
    energie: "gasoil" | "reseau" | "solaire";
    culture_actuelle: {
      id: string;
      nom: Localized;
    };
  };
  produit: {
    id: string;
    nom: Localized;
    prix_dt: number;
    unite: string;
    stock: number;
    label: {
      id: string;
      note: string;
      statut: string;
      qr: string;
      hypothese: Localized;
    };
  };
  hypotheses: Localized[];
  scenario: { etape: number; texte: Localized }[];
};
