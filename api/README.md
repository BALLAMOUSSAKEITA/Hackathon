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
