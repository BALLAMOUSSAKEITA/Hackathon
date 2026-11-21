# Ardi API - Sprints 1 et 2

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
- Demander un code OTP simulé : `POST /auth/otp`
- Vérifier le code et créer un utilisateur : `POST /auth/verify`
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

Les données de démonstration sont chargées depuis `fixtures/sprint-01.json` et
`fixtures/sprint-02.json`. Le sprint 2 fournit les profils agriculteur,
acheteur particulier et acheteur professionnel.

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
