# Ardi API - Sprint 1

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
- Utilisateurs : `GET /users`, `POST /users`
- Parcelles : `GET /parcelles`, `POST /parcelles`
- Cultures : `GET /cultures`
- Analyses : `GET /analyses`
- Labels : `GET /labels`, `GET /labels/{qr_code}`
- Produits : `GET /produits`
- Plans : `GET /plans`
- Vérifications : `GET /verifications`
- Commandes : `GET /commandes`
- Alertes : `GET /alertes`

Toutes les données de démonstration sont chargées depuis `fixtures/sprint-01.json`.

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
