export type RootStackParamList = {
  Welcome: undefined;
  // Parcours agriculteur
  Home: undefined;
  Parcelle: undefined;
  Analyse: undefined;
  Planter: undefined;
  Simulateur: undefined;
  Assistant: undefined;
  Label: undefined;
  Solaire: undefined;
  Suivi: undefined;
  Ventes: undefined;
  Notifications: undefined;
  Cultures: undefined;
  Fiche: { cultureId: string };
  // Parcours acheteur
  Marche: undefined;
  Produit: { id: string };
  Scanner: undefined;
  Panier: undefined;
  Impact: undefined;
  // Outils
  Reglages: undefined;
  Demo: undefined;
  HorsLigne: undefined;
  Admin: undefined;
};
