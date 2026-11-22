import json
import math
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pyproj import Geod
from shapely.errors import GEOSException
from shapely.geometry import shape
from shapely.geometry.polygon import orient
from shapely.validation import explain_validity
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from . import models
from .schemas import (
    OTPRequest,
    OTPResponse,
    OTPVerify,
    ParcelleCreate,
    ParcelleOut,
    UserCreate,
    UserOut,
)


FIXTURES_DIR = Path(__file__).resolve().parents[1] / "fixtures"
DEMO_OTP_CODE = "123456"
pending_otp_phones: set[str] = set()
GEOD = Geod(ellps="WGS84")


def calculate_polygon_area_ha(geometry: dict[str, Any]) -> float:
    if geometry.get("type") != "Polygon":
        raise HTTPException(422, "GeoJSON geometry must be a Polygon")

    coordinates = geometry.get("coordinates")
    if not isinstance(coordinates, list) or not coordinates:
        raise HTTPException(422, "Polygon must contain at least one ring")

    for ring in coordinates:
        if not isinstance(ring, list) or len(ring) < 4 or ring[0] != ring[-1]:
            raise HTTPException(
                422, "Polygon rings must be closed and have at least four positions"
            )
        for position in ring:
            if not isinstance(position, list) or len(position) not in (2, 3):
                raise HTTPException(
                    422, "Each GeoJSON position must contain two or three coordinates"
                )
            if any(
                isinstance(coordinate, bool)
                or not isinstance(coordinate, (int, float))
                for coordinate in position
            ):
                raise HTTPException(422, "GeoJSON coordinates must be numeric")
            longitude, latitude = position[:2]
            try:
                coordinates_are_finite = all(
                    math.isfinite(coordinate) for coordinate in position
                )
            except OverflowError:
                coordinates_are_finite = False
            if not coordinates_are_finite:
                raise HTTPException(422, "GeoJSON coordinates must be finite")
            if not -180 <= longitude <= 180 or not -90 <= latitude <= 90:
                raise HTTPException(
                    422, "GeoJSON coordinates are outside longitude/latitude bounds"
                )

    try:
        polygon = shape(geometry)
    except (GEOSException, TypeError, ValueError, IndexError) as error:
        raise HTTPException(422, "Invalid GeoJSON polygon coordinates") from error
    if polygon.is_empty or not polygon.is_valid:
        raise HTTPException(422, f"Invalid polygon: {explain_validity(polygon)}")

    area_m2, _ = GEOD.geometry_area_perimeter(orient(polygon, sign=1.0))
    area_ha = round(abs(area_m2) / 10_000, 4)
    if not math.isfinite(area_ha) or area_ha <= 0:
        raise HTTPException(422, "Polygon must enclose a positive area")
    return area_ha


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        for fixture_name in (
            "sprint-01.json",
            "sprint-02.json",
            "sprint-03.json",
            "sprint-04.json",
        ):
            fixture = FIXTURES_DIR / fixture_name
            data = json.loads(fixture.read_text(encoding="utf-8"))
            for section, model in ENTITY_MODELS.items():
                if section == "users":
                    rows = data.get("users", data.get("profiles", []))
                elif section == "produits":
                    rows = data.get("products", [])
                elif section == "commandes":
                    rows = data.get("orders", [])
                elif section == "alertes":
                    rows = data.get("alerts", [])
                else:
                    rows = data.get(section, [])
                for row in rows:
                    if section == "cultures":
                        culture_values = {key: value for key, value in row.items() if key != "details"}
                        culture = db.get(model, row["id"])
                        if culture is None:
                            culture = model(**culture_values)
                            db.add(culture)
                        else:
                            for key, value in culture_values.items():
                                setattr(culture, key, value)
                        if "details" in row:
                            detail = db.get(models.CultureDetail, row["id"])
                            if detail is None:
                                db.add(
                                    models.CultureDetail(
                                        culture_id=row["id"], **row["details"]
                                    )
                                )
                            else:
                                for key, value in row["details"].items():
                                    setattr(detail, key, value)
                        continue
                    if db.get(model, row["id"]) is None:
                        db.add(model(**row))
            db.flush()
        db.commit()
    finally:
        db.close()
    yield


app = FastAPI(
    title="Ardi API",
    version="1.0.0",
    description="API FastAPI Ardi, sprints de demonstration 1 a 3.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ENTITY_MODELS = {
    "users": models.User,
    "parcelles": models.Parcelle,
    "analyses": models.Analyse,
    "cultures": models.Culture,
    "plans": models.Plan,
    "labels": models.Label,
    "verifications": models.Verification,
    "produits": models.Produit,
    "commandes": models.Commande,
    "alertes": models.Alerte,
}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ardi-api", "fixture": "sprint-01"}


@app.get("/fixture/sprint-01")
def sprint_fixture() -> dict[str, Any]:
    return json.loads((FIXTURES_DIR / "sprint-01.json").read_text(encoding="utf-8"))


@app.get("/fixture/sprint-02")
def sprint_02_fixture() -> dict[str, Any]:
    return json.loads((FIXTURES_DIR / "sprint-02.json").read_text(encoding="utf-8"))


@app.get("/fixture/sprint-03")
def sprint_03_fixture() -> dict[str, Any]:
    return json.loads((FIXTURES_DIR / "sprint-03.json").read_text(encoding="utf-8"))


@app.get("/fixture/sprint-04")
def sprint_04_fixture() -> dict[str, Any]:
    return json.loads((FIXTURES_DIR / "sprint-04.json").read_text(encoding="utf-8"))


@app.post("/auth/otp", response_model=OTPResponse)
def request_otp(payload: OTPRequest) -> OTPResponse:
    pending_otp_phones.add(payload.phone)
    return OTPResponse(
        phone=payload.phone,
        message="Code SMS simule; utilisez le code fixe de demonstration.",
        demo_code=DEMO_OTP_CODE,
    )


@app.post("/auth/verify", response_model=UserOut, status_code=201)
def verify_otp(payload: OTPVerify, db: Session = Depends(get_db)):
    if payload.phone not in pending_otp_phones:
        raise HTTPException(400, "Request an OTP before verifying it")
    if payload.code != DEMO_OTP_CODE:
        raise HTTPException(400, "Invalid demo OTP code")
    existing_user = db.query(models.User).filter(models.User.phone == payload.phone).first()
    if existing_user:
        raise HTTPException(409, "Phone number is already registered")

    user = models.User(
        id=str(uuid4()),
        phone=payload.phone,
        name=payload.name,
        role=payload.role,
        language=payload.language,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    pending_otp_phones.discard(payload.phone)
    return user


@app.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()


@app.post("/users", response_model=UserOut, status_code=201)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    if db.get(models.User, payload.id):
        raise HTTPException(409, "User already exists")
    user = models.User(**payload.model_dump())
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.get("/parcelles", response_model=list[ParcelleOut])
def list_parcelles(owner_id: str | None = Query(default=None), db: Session = Depends(get_db)):
    query = db.query(models.Parcelle)
    if owner_id:
        query = query.filter(models.Parcelle.owner_id == owner_id)
    return query.all()


@app.post("/parcelles", response_model=ParcelleOut, status_code=201)
def create_parcelle(payload: ParcelleCreate, db: Session = Depends(get_db)):
    area_ha = calculate_polygon_area_ha(payload.geometry)
    if db.get(models.User, payload.owner_id) is None:
        raise HTTPException(404, "Owner not found")
    if db.get(models.Parcelle, payload.id):
        raise HTTPException(409, "Parcel already exists")
    parcel_data = payload.model_dump()
    parcel_data["area_ha"] = area_ha
    parcel = models.Parcelle(**parcel_data)
    db.add(parcel)
    db.commit()
    db.refresh(parcel)
    return parcel


@app.get("/parcelles/{parcel_id}")
def get_parcelle(parcel_id: str, db: Session = Depends(get_db)):
    parcel = db.get(models.Parcelle, parcel_id)
    if not parcel:
        raise HTTPException(404, "Parcel not found")
    return parcel


@app.get("/cultures")
def list_cultures(
    soil: str | None = Query(default=None, min_length=1),
    db: Session = Depends(get_db),
):
    cultures = db.query(models.Culture).order_by(models.Culture.id).all()
    soil_filter = soil.strip().lower().replace("-", "_") if soil else None
    result = []
    for culture in cultures:
        detail = db.get(models.CultureDetail, culture.id)
        if soil_filter and (detail is None or soil_filter not in detail.compatible_soils):
            continue
        result.append(culture_payload(culture, detail))
    return result


@app.get("/cultures/{culture_id}")
def get_culture(culture_id: str, db: Session = Depends(get_db)):
    culture = db.get(models.Culture, culture_id)
    if culture is None:
        raise HTTPException(404, "Culture not found")
    detail = db.get(models.CultureDetail, culture_id)
    if detail is None:
        raise HTTPException(404, "Culture details not found")
    return culture_payload(culture, detail)


@app.get("/analyses")
def list_analyses(db: Session = Depends(get_db)):
    return db.query(models.Analyse).all()


def culture_payload(culture: models.Culture, detail: models.CultureDetail | None) -> dict[str, Any]:
    item = {
        "id": culture.id,
        "name": culture.name,
        "water_need_mm": culture.water_need_mm,
        "yield_t_ha": culture.yield_t_ha,
        "price_tnd_t": culture.price_tnd_t,
        "duration_days": culture.duration_days,
        "water_demand": culture.water_demand,
    }
    if detail is not None:
        item.update(
            {
                "kc_by_stage": detail.kc_by_stage,
                "yield_range_t_ha": detail.yield_range_t_ha,
                "price_range_tnd_t": detail.price_range_tnd_t,
                "price_source": detail.price_source,
                "costs_tnd_ha": detail.costs_tnd_ha,
                "compatible_soils": detail.compatible_soils,
                "salt_tolerance_dS_m": detail.salt_tolerance_dS_m,
                "heat_tolerance_c": detail.heat_tolerance_c,
                "first_production_days": detail.first_production_days,
                "kc_source": detail.kc_source,
            }
        )
    return item


@app.get("/labels")
def list_labels(db: Session = Depends(get_db)):
    return db.query(models.Label).all()


@app.get("/labels/{qr_code}")
def public_label(qr_code: str, db: Session = Depends(get_db)):
    label = db.query(models.Label).filter(models.Label.qr_code == qr_code).first()
    if not label:
        raise HTTPException(404, "Label not found")
    if label.status != "active":
        raise HTTPException(409, "Label is not active")
    return label


@app.get("/produits")
def list_products(db: Session = Depends(get_db)):
    return db.query(models.Produit).all()


@app.get("/plans")
def list_plans(db: Session = Depends(get_db)):
    return db.query(models.Plan).all()


@app.get("/verifications")
def list_verifications(db: Session = Depends(get_db)):
    return db.query(models.Verification).all()


@app.get("/commandes")
def list_orders(db: Session = Depends(get_db)):
    return db.query(models.Commande).all()


@app.get("/alertes")
def list_alerts(db: Session = Depends(get_db)):
    return db.query(models.Alerte).all()
