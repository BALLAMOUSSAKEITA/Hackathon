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
- `fixtures/sprint-03.json` : 15 cultures tunisiennes complètes du Sprint 3.
- `fixtures/sprint-04.json` : parcelle prétracée, puits, culture et énergie du Sprint 4.
- `fixtures/sprint-05.json` : sol, climat, eau, énergie et NDVI du Sprint 5.

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
