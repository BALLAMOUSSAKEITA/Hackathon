# Scénario de démonstration — Sprint 1

Durée cible : 8 minutes.

1. **Bienvenue** — lancer l'application mobile sur l'écran Bienvenue.
2. **Langue** — choisir darija, puis vérifier l'affichage français/anglais à titre
   de comparaison.
3. **Profil** — sélectionner le profil agriculteur depuis le socle de navigation.
4. **Ferme** — ouvrir `fixtures/sprint-01.json` et montrer la parcelle, le puits
   de 60 m et la culture tomate.
5. **API** — appeler `GET /health`, puis `GET /demo`.
6. **Parcelle** — envoyer la géométrie du fichier à `POST /parcelles` et confirmer
   la même surface côté serveur.
7. **Produit** — montrer le produit Tomates Ardi labellisé B et son QR
   `ARDI-DEMO-001`.
8. **Acheteur** — basculer vers le profil acheteur et montrer la coque du marché
   prête pour le Sprint 10.

Hypothèses affichées :

- efficacité du pompage : `eta = 0.5`
- profondeur du puits : `60 m`
- énergie calculée : `0.3264 kWh/m3`
- devise : `TND`
