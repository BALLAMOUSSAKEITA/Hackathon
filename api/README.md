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
