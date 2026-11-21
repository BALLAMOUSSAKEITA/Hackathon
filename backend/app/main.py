import json
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
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


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        for fixture_name in ("sprint-01.json", "sprint-02.json"):
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
                    if db.get(model, row["id"]) is None:
                        db.add(model(**row))
        db.commit()
    finally:
        db.close()
    yield


app = FastAPI(
    title="Ardi API",
    version="1.0.0",
    description="API FastAPI du socle technique Ardi, sprint 1.",
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
    if payload.geometry.get("type") != "Polygon":
        raise HTTPException(422, "GeoJSON geometry must be a Polygon")
    if db.get(models.User, payload.owner_id) is None:
        raise HTTPException(404, "Owner not found")
    if db.get(models.Parcelle, payload.id):
        raise HTTPException(409, "Parcel already exists")
    parcel = models.Parcelle(**payload.model_dump())
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
def list_cultures(db: Session = Depends(get_db)):
    return db.query(models.Culture).all()


@app.get("/analyses")
def list_analyses(db: Session = Depends(get_db)):
    return db.query(models.Analyse).all()


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
