# Ardi API - Sprints 1 a 5

API FastAPI pour le socle technique Ardi.

## Démarrage rapide

```powershell
cd backend
python -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Documentation interactive : `http://127.0.0.1:8000/docs`

## Démonstration

- Santé : `GET /health`
- Fixture sprint 1 : `GET /fixture/sprint-01`
- Fixture sprint 2 : `GET /fixture/sprint-02`
- Fixture sprint 3 : `GET /fixture/sprint-03`
- Fixture sprint 4 : `GET /fixture/sprint-04`
- Fixture sprint 5 : `GET /fixture/sprint-05`
- Demander un code OTP simulé : `POST /auth/otp`
- Vérifier le code et créer un utilisateur : `POST /auth/verify`
- Utilisateurs : `GET /users`, `POST /users`
- Parcelles : `GET /parcelles`, `POST /parcelles`, `GET /parcelles/{parcel_id}`
- Analyse d'une parcelle : `POST /parcelles/{parcel_id}/analyse`
- Cultures : `GET /cultures`, `GET /cultures/{culture_id}`
- Filtrer les cultures par sol : `GET /cultures?soil=sandy`
- Analyses : `GET /analyses`
- Labels : `GET /labels`, `GET /labels/{qr_code}`
- Produits : `GET /produits`
- Plans : `GET /plans`
- Vérifications : `GET /verifications`
- Commandes : `GET /commandes`
- Alertes : `GET /alertes`

Les données de démonstration sont chargées depuis les fixtures `sprint-01`
à `sprint-05`. Le sprint 2 fournit les profils agriculteur,
acheteur particulier et acheteur professionnel. Le sprint 3 fournit 15 cultures
avec Kc par stade, rendements, fourchettes de prix, coûts et compatibilité de sol.
Les valeurs agronomiques et économiques sont indicatives; les sources de prix
ONAGRI/marché de gros et la calibration locale restent à confirmer.
Le sprint 4 fournit une parcelle de démonstration. `POST /parcelles` valide le
GeoJSON Polygon, recalcule sa surface en hectares sur l'ellipsoïde WGS84 et
rejette les géométries invalides.
Le sprint 5 fournit une analyse figée de démonstration avec les sources, la
réponse solaire et les 12 points NDVI. Pour les autres parcelles, l'API interroge
SoilGrids, Open-Meteo et NASA POWER en parallèle et met les réponses en cache
dans le processus. Le débit, les heures de pompage et le nombre de jours
déterminent l'eau disponible; l'énergie suit `0.00272 * profondeur / rendement`.
Pour analyser la parcelle de démo, appeler
`POST /parcelles/parcel-sprint-05/analyse` sans corps. Les paramètres
`pump_hours_per_day`, `season_days` et `efficiency` peuvent être fournis pour
remplacer les hypothèses du fichier.

Pour la démonstration, `POST /auth/otp` retourne le code fixe `123456`.
`POST /auth/verify` reçoit `phone`, `code`, `name`, `role` (`farmer`, `buyer`
ou `professional`) et `language` (`fr`, `ar` ou `darija`). Le code fixe est
réservé à la démo et ne doit pas être utilisé en production.

## PostgreSQL + PostGIS

Le développement peut utiliser SQLite. Pour PostgreSQL/PostGIS :

```powershell
docker compose up -d
$env:DATABASE_URL="postgresql+psycopg://ardi:ardi@localhost:5432/ardi"
uvicorn app.main:app --reload
```

PostGIS doit être activé dans la base avant le déploiement :

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```
