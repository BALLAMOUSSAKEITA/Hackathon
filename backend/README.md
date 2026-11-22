# Ardi API - Sprints 1 a 8

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
- Fixture sprint 6 : `GET /fixture/sprint-06`
- Fixture sprint 7 : `GET /fixture/sprint-07`
- Fixture sprint 8 : `GET /fixture/sprint-08`
- Demander un code OTP simulé : `POST /auth/otp`
- Vérifier le code et créer un utilisateur : `POST /auth/verify`
- Utilisateurs : `GET /users`, `POST /users`
- Parcelles : `GET /parcelles`, `POST /parcelles`, `GET /parcelles/{parcel_id}`
- Analyse d'une parcelle : `POST /parcelles/{parcel_id}/analyse`
- Recommandations de cultures : `GET /parcelles/{parcel_id}/recommandations`
- Simuler un plan : `POST /parcelles/{parcel_id}/simulation`
- Adopter un plan : `POST /parcelles/{parcel_id}/plan`
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
à `sprint-08`. Le sprint 2 fournit les profils agriculteur,
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

Le sprint 6 fournit un classement calculé depuis sa propre fixture, avec
15 cultures, une interculture et les hypothèses de sol, climat, puits et
irrigation. Exemple :

```text
GET /parcelles/parcel-sprint-06/recommandations
GET /parcelles/parcel-sprint-06/recommandations?tri=eau
GET /parcelles/parcel-sprint-06/recommandations?tri=rapidite
```

Le tri par défaut utilise le revenu net ajusté du risque par m³ (`revenu_m3`).
Les autres tris sont `eau` (m³/ha croissants) et `rapidite` (jours avant
production croissants). Les cultures incompatibles avec le sol, la salinité,
la température ou la capacité du puits apparaissent séparément dans
`excluded_crops` et jamais dans `recommendations`. Les formules et hypothèses
utilisées sont retournées dans la réponse. Les prix et paramètres agronomiques
restent indicatifs, à confirmer localement.

Le sprint 7 fournit une parcelle, quatre cultures proposées, l'état actuel et
les hypothèses du puits. Le corps des deux routes contient `allocations`, une
liste de `{ "crop_id": "...", "area_ha": ... }`. La simulation recalcule le
revenu, l'eau, l'énergie, le label et l'écart par rapport à la situation
actuelle; elle retourne aussi les alertes de dépassement de surface ou d'eau.
L'adoption refuse une surface supérieure à la parcelle. Un dépassement d'eau
est conservé comme alerte dans le plan adopté. Les plans sont persistés via
l'entité `Plan` et consultables avec `GET /plans`.

Le sprint 8 fournit le bilan d'accueil, le plan chiffré, les vérifications
simulées, un produit et le QR `ARDI-S08-FARM-001`. La fixture expose les labels
actuel et potentiel calculés depuis le plan. `GET /labels/{qr_code}` retourne la
fiche publique avec la ferme, le produit, le grade, le statut et les
vérifications. Un label suspendu retourne son statut sans exposer de grade.
Le grade A exige au moins 2,2 DT/m³, une culture compatible, l'irrigation
localisée et une consommation conforme au plan. Les seuils B à E sont 1,5,
1,1 et 0,8 DT/m³; un dépassement répété du puits donne E.

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
