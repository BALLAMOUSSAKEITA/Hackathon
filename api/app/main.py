from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select

from app.auth import router as auth_router
from app.contrat import CONTRAT
from app.database import SessionLocal, engine, init_db, load_fixture, postgis_version
from app.models import Label, Parcelle, Produit, Utilisateur
from app.seed import seed_demo


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    with SessionLocal() as session:
        seed_demo(session)
    yield


app = FastAPI(title="Ardi", version="0.1.0", lifespan=lifespan)
app.include_router(auth_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    fixture = load_fixture()
    with SessionLocal() as session:
        counts = {
            "utilisateurs": session.scalar(select(func.count()).select_from(Utilisateur)) or 0,
            "parcelles": session.scalar(select(func.count()).select_from(Parcelle)) or 0,
            "labels": session.scalar(select(func.count()).select_from(Label)) or 0,
            "produits": session.scalar(select(func.count()).select_from(Produit)) or 0,
        }
    return {
        "statut": "ok",
        "base": engine.dialect.name,
        "postgis": postgis_version(),
        "ferme": fixture["ferme"]["nom"],
        "fixture": "fixtures/sprint-01.json",
        "enregistrements": counts,
    }


@app.get("/demo")
def demo() -> dict:
    return load_fixture()


@app.get("/contrat")
def contrat() -> dict:
    return CONTRAT
