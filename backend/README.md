# Ardi API - Sprints 1 a 15

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
- Fixture sprint 9 : `GET /fixture/sprint-09`
- Fixture sprint 10 : `GET /fixture/sprint-10`
- Fixture sprint 11 : `GET /fixture/sprint-11`
- Fixture sprint 12 : `GET /fixture/sprint-12`
- Fixture sprint 13 : `GET /fixture/sprint-13`
- Fixture sprint 14 : `GET /fixture/sprint-14`
- Fixture sprint 15 : `GET /fixture/sprint-15`
- Demander un code OTP simulé : `POST /auth/otp`
- Vérifier le code et créer un utilisateur : `POST /auth/verify`
- Utilisateurs : `GET /users`, `POST /users`
- Parcelles : `GET /parcelles`, `POST /parcelles`, `GET /parcelles/{parcel_id}`
- Analyse d'une parcelle : `POST /parcelles/{parcel_id}/analyse`
- Dimensionnement solaire : `GET /parcelles/{parcel_id}/solaire`
- Suivi satellite : `GET /parcelles/{parcel_id}/suivi`
- Impact acheteur : `GET /acheteurs/{buyer_id}/impact`
- Export des achats : `GET /acheteurs/{buyer_id}/impact/export`
- Commandes en gros : `GET /commandes/gros`, `POST /commandes/gros`
- Recommandations de cultures : `GET /parcelles/{parcel_id}/recommandations`
- Simuler un plan : `POST /parcelles/{parcel_id}/simulation`
- Adopter un plan : `POST /parcelles/{parcel_id}/plan`
- Assistant vocal : `POST /assistant`
- Cultures : `GET /cultures`, `GET /cultures/{culture_id}`
- Filtrer les cultures par sol : `GET /cultures?soil=sandy`
- Analyses : `GET /analyses`
- Labels : `GET /labels`, `GET /labels/{qr_code}`
- Produits : `GET /produits?label=A&category=huile_olive&region=Sidi%20Bouzid`,
  `POST /produits`
- Plans : `GET /plans`
- Vérifications : `GET /verifications`
- Commandes : `GET /commandes`, `POST /commandes`, `PATCH /commandes/{id}`
- Alertes : `GET /alertes`, `PATCH /alertes/{id}`

Les données de démonstration sont chargées depuis les fixtures `sprint-01`
à `sprint-15`. Le sprint 2 fournit les profils agriculteur,
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

Le sprint 9 expose la parcelle, l'analyse, le classement, le plan, les cartes
d'action et 20 questions/réponses chiffrées dans `GET /fixture/sprint-09`.
`POST /assistant` reçoit exactement un `question_text` ou un
`audio_transcript` (transcription fournie par la reconnaissance vocale du
client), et peut répondre en `darija`, `ar` ou `fr`. Les réponses sont
déterministes et limitées aux entrées du fichier; hors fichier, l'assistant
refuse de répondre et propose une question utile. Le champ `audio` contient
le texte et la locale prêts pour la synthèse vocale de l'appareil; la fixture
ne prétend pas générer un fichier audio.

Le sprint 10 alimente `GET /produits` avec son catalogue et accepte les filtres
`label` (grade, statut ou identifiant), `category` et `region`. Les fiches
publiques sont accessibles via les QR `ARDI-S10-OLIVE-001` et
`ARDI-S10-DATES-001`. `POST /commandes` prend `buyer_id`, `product_id`,
`quantity_kg` et `payment_method` (`D17`, `card` ou `cash_on_delivery`).
Le paiement est simulé, le total est calculé par l'API, et aucune donnée de
carte n'est acceptée ni stockée. `PATCH /commandes/{id}` peut modifier la
quantité, le moyen de paiement ou le statut (`pending`, `confirmed`,
`cancelled`).

Le sprint 11 fournit dans `GET /fixture/sprint-11` une ferme, un label actif,
un produit, une commande reçue, un devis et quatre alertes datées.
`POST /produits` publie un produit de la ferme et du label actifs du fichier, avec
nom, catégorie, prix, stock et URL de photo. `PATCH /commandes/{id}` accepte
une commande (`status: accepted`) ou enregistre un
`counteroffer_price_tnd_kg`; l'offre est alors visible avec le statut
`counteroffered`. `GET /fermes/{farm_id}/prix-moyens` compare le prix moyen
des produits labellisés de la ferme au prix typique du marché.
`PATCH /alertes/{id}` avec `{"read": true}` marque durablement une alerte comme lue.

Le sprint 12 regroupe le scénario de démonstration dans
`GET /fixture/sprint-12`, sans dépendre des fixtures des sprints précédents.
Il contient dix parcelles et leurs analyses. Les calculs d'eau suivent
`débit_m3_h * heures_de_pompage_par_jour * jours_de_saison`; l'énergie suit
`0.00272 * profondeur_m / eta`. La réponse ajoute, pour chaque parcelle, les
cultures exclues et le temps mesuré du classement, ainsi que le classement de
la parcelle principale.

Le sprint 13 expose `GET /parcelles/{parcel_id}/solaire`. Le calcul utilise
l'irradiation NASA POWER (instantané de fixture pour la parcelle de démo,
dernière analyse disponible ou consultation NASA POWER pour les autres),
le débit, la profondeur et des hypothèses affichées dans la réponse. Il estime
la puissance et le nombre de panneaux, un réservoir pour une demi-journée,
les coûts d'exploitation par saison comparés au gasoil et à la STEG, et le
temps d'amortissement. Les prix et paramètres de dimensionnement de la fixture
sont indicatifs, pas un devis. Une parcelle sans profondeur ou débit retourne
`available: false`; les aides restent informatives, sans promesse d'éligibilité.

Le sprint 14 fournit deux images Sentinel-2 de démonstration espacées de cinq
jours, les zones de la parcelle, l'humidité, une série NDVI mensuelle sur
12 mois et le plan d'eau. `GET /parcelles/{parcel_id}/suivi` retourne ces
éléments, le volume consommé par rapport au plan et les alertes calculées
(stress hydrique, pluie prévue, dépassement du plan). Les images exploitables
non traitées sont mises à jour en tâche de fond et une seule alerte d'irrigation
est conservée par parcelle. Un seul signal d'image reste « à confirmer »; deux
images concordantes passent à « écart confirmé ». Les images et seuils sont des
instantanés indicatifs, pas une connexion à un flux satellite temps réel.

Le sprint 15 calcule l'impact acheteur depuis les commandes non annulées du
fichier : eau et énergie soutenues par la quantité achetée, fermes distinctes,
et part du label A pondérée par les kilogrammes. Les facteurs d'impact au kg
sont indicatifs et présents dans la fixture. L'export retourne les lignes CSV
avec commandes, labels, fermes, eau et énergie. `POST /commandes/gros` est
réservé aux profils `professional`; il crée un statut `wholesale_pending` sans
moyen de paiement ni montant facturé.

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
