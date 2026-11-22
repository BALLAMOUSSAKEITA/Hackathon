# Ardi API — Sprint 1

## Installation

```bash
cd api
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Documentation interactive : `http://127.0.0.1:8000/docs`

Santé : `GET http://127.0.0.1:8000/health`

Ferme démo : `GET http://127.0.0.1:8000/demo`

La base locale SQLite est créée automatiquement. Pour PostgreSQL/PostGIS,
copier `api/.env.example`, définir `DATABASE_URL` et créer l'extension
PostGIS conformément à `api/alembic/README.md`.

## Sprint 2

- `POST /auth/otp` accepte les rôles `agriculteur`,
  `acheteur_particulier` et `acheteur_professionnel`.
- `POST /auth/verify` accepte le code fixe de démonstration `123456`.
- `GET /demo/sprint-02` sert les trois profils et les traductions du Sprint 2.

## Sprint 3

- `GET /cultures` retourne les 15 cultures avec noms, Kc, rendement, prix,
  coûts, sols, tolérances et durée.
- `GET /cultures?sol=argileux` filtre les cultures compatibles avec le sol.

## Sprint 4

- `GET /demo/sprint-04` sert la parcelle prétracée.
- `POST /parcelles` calcule la surface côté serveur et rejette les polygones
  ouverts ou d'aire nulle.

## Sprint 5

- `GET /demo/sprint-05` sert l'analyse de démonstration.
- `POST /parcelles/{id}/analyse` recalcul l'eau disponible et l'énergie
  de pompage. À 60 m avec η = 0,5, le résultat est environ 0,3264 kWh/m³.

## Sprint 6

- `GET /parcelles/{id}/recommandations?tri=revenu`
- Tri disponible : `revenu`, `eau`, `rapidite`.
- Les cultures incompatibles sont exclues du classement.

## Sprint 7

- `POST /parcelles/{id}/simulation` recalcule surface, revenu, eau, énergie,
  écart et label à chaque jeu d'allocation.
- `POST /parcelles/{id}/plan` adopte uniquement un plan sans dépassement
  de la parcelle ou du puits.

## Sprint 8

- `POST /labels/calculate` calcule la lettre A–E selon le DT/m³, la compatibilité,
  l'irrigation localisée et la conformité.
- `GET /labels/{qr}` expose la fiche publique d'une ferme ou d'un produit.

## Sprint 9

- `POST /assistant` répond depuis les 20 questions du Sprint 9.
- Les questions hors périmètre sont refusées avec une proposition utile.
- `GET /demo/sprint-09` sert les questions, actions et chiffres visibles.

## Sprint 10

- `GET /produits` filtre les produits par label, catégorie ou région.
- `GET /produits/qr/{qr}` ouvre la fiche du produit correspondant.
- `POST /commandes` crée une commande simulée; `PATCH /commandes/{id}` change son statut.

## Sprint 11

- `POST /produits/publish` publie un produit rattaché à la ferme démo.
- `GET /ventes/sprint-11` expose le suivi des ventes.
- `PATCH /commandes/sprint-11/{id}` accepte ou contre-propose.
- `GET /notifications` liste les quatre types d'alertes.

## Sprint 12

- `GET /demo/sprint-12` sert le scénario intégré de huit étapes.
- `GET /demo/sprint-12/criteria` vérifie les chiffres et critères clés du pitch.

## Sprint 13

- `GET /parcelles/{id}/solaire` dimensionne puissance, panneaux, réservoir,
  coûts annuels et amortissement.
- `GET /parcelles/{id}/solaire?profondeur_m=90` recalcule la puissance pour
  une profondeur différente.

## Sprint 14

- `GET /parcelles/{id}/suivi` expose zones, NDVI, consommation d'eau et alertes.
- `POST /parcelles/{id}/suivi/alerte` confirme un écart après deux images concordantes.
- `POST /parcelles/{id}/suivi/contestation` reçoit une photo géolocalisée.
