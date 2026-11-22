import json
import math
import uuid
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine, get_db
from .models import Parcelle, Utilisateur
from .schemas import ParcelleCreate, ParcelleResponse


FIXTURE_PATH = Path(__file__).resolve().parents[2] / "fixtures" / "sprint-01.json"

app = FastAPI(
    title="Ardi API",
    version="1.0.0",
    description="API du Sprint 1 — ferme de démonstration Ardi.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    fixture = load_fixture()
    db = SessionLocal()
    try:
        demo_user = db.get(Utilisateur, fixture["user"]["id"])
        if demo_user is None:
            db.add(
                Utilisateur(
                    id=fixture["user"]["id"],
                    phone=fixture["user"]["phone"],
                    name=fixture["user"]["name"],
                    role=fixture["user"]["role"],
                    language=fixture["user"]["language"],
                )
            )
            db.commit()
    finally:
        db.close()


def load_fixture() -> dict[str, Any]:
    with FIXTURE_PATH.open("r", encoding="utf-8") as fixture_file:
        return json.load(fixture_file)


def polygon_area_hectares(coordinates: list[list[float]]) -> float:
    if len(coordinates) < 4:
        raise ValueError("Un polygone fermé contient au moins quatre points.")

    if coordinates[0] != coordinates[-1]:
        raise ValueError("Le polygone doit être fermé.")

    longitude_latitude = [
        (float(point[0]), float(point[1]))
        for point in coordinates[:-1]
        if len(point) >= 2
    ]
    if len(longitude_latitude) < 3:
        raise ValueError("Le polygone doit contenir au moins trois sommets.")

    mean_latitude = math.radians(sum(lat for _, lat in longitude_latitude) / len(longitude_latitude))
    earth_radius_m = 6371000.0
    projected = [
        (
            math.radians(longitude) * earth_radius_m * math.cos(mean_latitude),
            math.radians(latitude) * earth_radius_m,
        )
        for longitude, latitude in longitude_latitude
    ]

    double_area = 0.0
    for index, (x1, y1) in enumerate(projected):
        x2, y2 = projected[(index + 1) % len(projected)]
        double_area += x1 * y2 - x2 * y1

    area_m2 = abs(double_area) / 2.0
    if area_m2 <= 0:
        raise ValueError("La surface du polygone doit être supérieure à zéro.")

    return round(area_m2 / 10000.0, 2)


@app.get("/")
def root() -> dict[str, str]:
    return {"name": "Ardi API", "version": "1.0.0", "docs": "/docs"}


@app.get("/health")
def health() -> dict[str, object]:
    return {"status": "ok", "service": "ardi-api", "sprint": 1}


@app.get("/demo")
def demo() -> dict[str, Any]:
    return load_fixture()


@app.post("/parcelles", response_model=ParcelleResponse, status_code=201)
def create_parcelle(payload: ParcelleCreate, db: Session = Depends(get_db)) -> dict[str, Any]:
    if payload.owner_id != "usr-demo":
        existing_owner = db.get(Utilisateur, payload.owner_id)
        if existing_owner is None:
            raise HTTPException(status_code=404, detail="Utilisateur propriétaire introuvable.")

    try:
        surface = polygon_area_hectares(payload.geometry.coordinates[0])
    except (TypeError, IndexError, ValueError) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    parcelle_id = f"parcelle-{uuid.uuid4().hex[:8]}"
    geometry = payload.geometry.model_dump()
    parcelle = Parcelle(
        id=parcelle_id,
        owner_id=payload.owner_id,
        name=payload.name,
        geometry=geometry,
        surface_hectares=surface,
        water_source=payload.water_source,
        well_depth_m=payload.well_depth_m,
        pump_flow_m3_h=payload.pump_flow_m3_h,
        current_crop=payload.current_crop,
        energy=payload.energy,
    )
    db.add(parcelle)
    db.commit()
    db.refresh(parcelle)
    return {
        "id": parcelle.id,
        "owner_id": parcelle.owner_id,
        "name": parcelle.name,
        "geometry": parcelle.geometry,
        "surface_hectares": parcelle.surface_hectares,
        "water_source": parcelle.water_source,
        "well_depth_m": parcelle.well_depth_m,
        "pump_flow_m3_h": parcelle.pump_flow_m3_h,
        "current_crop": parcelle.current_crop,
        "energy": parcelle.energy,
    }
