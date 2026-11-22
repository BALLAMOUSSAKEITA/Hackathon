# Ardi — Sprint 1

Socle technique du parcours agriculteur/acheteur pour le hackathon.

## Contenu

- `mobile/` : application Expo React Native, thème, navigation, écrans 0 à 16
  (états vides hors Sprint 1), RTL arabe et cibles tactiles.
- `api/` : API FastAPI, modèles SQLAlchemy, SQLite locale et PostgreSQL/PostGIS.
- `fixtures/sprint-01.json` : ferme de démonstration partagée.
- `docs/api-contract.md` : contrat partagé.
- `docs/scenario-demo.md` : scénario de pitch en huit étapes.
- `fixtures/sprint-02.json` : profils, OTP démo et traductions du Sprint 2.

## Démarrage rapide

API :

```bash
cd api
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Application :

```bash
cd mobile
npm install
npx expo start
```
