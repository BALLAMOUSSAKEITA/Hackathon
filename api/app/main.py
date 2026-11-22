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
from .schemas import (
    AssistantRequest,
    OTPRequest,
    OTPVerify,
    CommandeCreate,
    ParcelleCreate,
    ParcelleResponse,
    SimulationRequest,
)


FIXTURE_PATH = Path(__file__).resolve().parents[2] / "fixtures" / "sprint-01.json"
SPRINT_2_FIXTURE_PATH = Path(__file__).resolve().parents[2] / "fixtures" / "sprint-02.json"
SPRINT_3_FIXTURE_PATH = Path(__file__).resolve().parents[2] / "fixtures" / "sprint-03.json"
SPRINT_4_FIXTURE_PATH = Path(__file__).resolve().parents[2] / "fixtures" / "sprint-04.json"
SPRINT_5_FIXTURE_PATH = Path(__file__).resolve().parents[2] / "fixtures" / "sprint-05.json"
SPRINT_6_FIXTURE_PATH = Path(__file__).resolve().parents[2] / "fixtures" / "sprint-06.json"
SPRINT_7_FIXTURE_PATH = Path(__file__).resolve().parents[2] / "fixtures" / "sprint-07.json"
SPRINT_8_FIXTURE_PATH = Path(__file__).resolve().parents[2] / "fixtures" / "sprint-08.json"
SPRINT_9_FIXTURE_PATH = Path(__file__).resolve().parents[2] / "fixtures" / "sprint-09.json"
SPRINT_10_FIXTURE_PATH = Path(__file__).resolve().parents[2] / "fixtures" / "sprint-10.json"
ALLOWED_ROLES = {"agriculteur", "acheteur_particulier", "acheteur_professionnel"}
DEMO_OTP = "123456"
pending_profiles: dict[str, dict[str, str]] = {}
adopted_plans: dict[str, dict[str, Any]] = {}
orders: dict[str, dict[str, Any]] = {}

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


@app.get("/demo/sprint-02")
def demo_sprint_2() -> dict[str, Any]:
    with SPRINT_2_FIXTURE_PATH.open("r", encoding="utf-8") as fixture_file:
        return json.load(fixture_file)


@app.get("/cultures")
def list_cultures(sol: str | None = None) -> dict[str, Any]:
    with SPRINT_3_FIXTURE_PATH.open("r", encoding="utf-8") as fixture_file:
        fixture = json.load(fixture_file)

    cultures = fixture["cultures"]
    if sol is not None:
        cultures = [culture for culture in cultures if sol in culture["soils"]]

    return {
        "hypotheses": fixture["hypotheses"],
        "cultures": cultures,
        "count": len(cultures),
    }


@app.get("/demo/sprint-04")
def demo_sprint_4() -> dict[str, Any]:
    with SPRINT_4_FIXTURE_PATH.open("r", encoding="utf-8") as fixture_file:
        return json.load(fixture_file)


@app.get("/demo/sprint-05")
def demo_sprint_5() -> dict[str, Any]:
    with SPRINT_5_FIXTURE_PATH.open("r", encoding="utf-8") as fixture_file:
        return json.load(fixture_file)


@app.get("/demo/sprint-06")
def demo_sprint_6() -> dict[str, Any]:
    with SPRINT_6_FIXTURE_PATH.open("r", encoding="utf-8") as fixture_file:
        return json.load(fixture_file)


@app.get("/parcelles/{parcelle_id}/recommandations")
def recommendations(parcelle_id: str, tri: str = "revenu") -> dict[str, Any]:
    with SPRINT_6_FIXTURE_PATH.open("r", encoding="utf-8") as fixture_file:
        fixture = json.load(fixture_file)

    if parcelle_id != fixture["parcelle"]["id"]:
        raise HTTPException(status_code=404, detail="Parcelle introuvable.")

    if tri not in {"revenu", "eau", "rapidite"}:
        raise HTTPException(status_code=422, detail="Tri inconnu.")

    compatible = [
        culture
        for culture in fixture["cultures"] + fixture["cultures_intercalaires"]
        if culture["compatible"]
    ]
    if tri == "revenu":
        compatible.sort(key=lambda culture: culture["dt_m3"], reverse=True)
    elif tri == "eau":
        compatible.sort(key=lambda culture: culture["m3_ha"])
    else:
        compatible.sort(key=lambda culture: culture["duree_mois"])

    return {
        "parcelle": fixture["parcelle"],
        "culture_actuelle": fixture["culture_actuelle"],
        "meilleure_option": compatible[0],
        "ecart_dt_m3": round(
            compatible[0]["dt_m3"] - fixture["culture_actuelle"]["dt_m3"],
            2,
        ),
        "tri": tri,
        "cultures": compatible,
        "exclusions": [
            {
                "id": culture["id"],
                "name": culture["name"],
                "raison": culture["exclusion"],
            }
            for culture in fixture["cultures"]
            if not culture["compatible"]
        ],
        "hypotheses": fixture["hypotheses"],
    }


@app.post("/parcelles/{parcelle_id}/analyse")
def analyse_parcelle(parcelle_id: str) -> dict[str, Any]:
    with SPRINT_5_FIXTURE_PATH.open("r", encoding="utf-8") as fixture_file:
        fixture = json.load(fixture_file)

    if parcelle_id != fixture["parcelle"]["id"]:
        raise HTTPException(status_code=404, detail="Parcelle introuvable.")

    water_available = (
        fixture["eau"]["debit_m3_h"] * fixture["eau"]["heures_pompage_saison"]
    )
    kwh_per_m3 = (
        0.00272
        * fixture["eau"]["profondeur_m"]
        / fixture["energie"]["efficacite_pompe"]
    )
    return {
        **fixture,
        "eau": {
            **fixture["eau"],
            "eau_disponible_m3": round(water_available, 2),
        },
        "energie": {
            **fixture["energie"],
            "kwh_m3": round(kwh_per_m3, 4),
        },
    }


@app.get("/demo/sprint-07")
def demo_sprint_7() -> dict[str, Any]:
    with SPRINT_7_FIXTURE_PATH.open("r", encoding="utf-8") as fixture_file:
        return json.load(fixture_file)


def label_from_dt_m3(dt_m3: float) -> str:
    if dt_m3 >= 2.2:
        return "A"
    if dt_m3 >= 1.5:
        return "B"
    if dt_m3 >= 1.1:
        return "C"
    if dt_m3 >= 0.8:
        return "D"
    return "E"


@app.post("/parcelles/{parcelle_id}/simulation")
def simulate_plan(parcelle_id: str, payload: SimulationRequest) -> dict[str, Any]:
    with SPRINT_7_FIXTURE_PATH.open("r", encoding="utf-8") as fixture_file:
        fixture = json.load(fixture_file)

    if parcelle_id != fixture["parcelle"]["id"]:
        raise HTTPException(status_code=404, detail="Parcelle introuvable.")

    known = {culture["id"]: culture for culture in fixture["cultures_proposees"]}
    unknown = set(payload.allocations) - set(known)
    if unknown:
        raise HTTPException(status_code=422, detail="Culture inconnue dans le simulateur.")

    total_surface = sum(payload.allocations.values())
    parcelle_surface = fixture["parcelle"]["surface_hectares"]
    if total_surface > parcelle_surface + 0.001:
        raise HTTPException(
            status_code=422,
            detail=f"Surface dépassée : {total_surface:.2f} ha pour {parcelle_surface:.2f} ha.",
        )

    total_water = sum(
        hectares * known[culture_id]["m3_ha"]
        for culture_id, hectares in payload.allocations.items()
        if hectares > 0
    )
    total_energy = sum(
        hectares * known[culture_id]["m3_ha"] * known[culture_id]["kwh_m3"]
        for culture_id, hectares in payload.allocations.items()
        if hectares > 0
    )
    weighted_revenue = sum(
        hectares
        * known[culture_id]["rendement_t_ha"]
        * known[culture_id]["prix_tnd_kg"]
        * 1000
        for culture_id, hectares in payload.allocations.items()
        if hectares > 0
    )
    total_costs = sum(
        hectares * known[culture_id]["couts_tnd_ha"]
        for culture_id, hectares in payload.allocations.items()
        if hectares > 0
    )
    dt_m3 = (
        (weighted_revenue - total_costs) / total_water
        if total_water > 0
        else 0
    )
    water_limit = fixture["parcelle"]["capacity_puit_m3"]
    label = label_from_dt_m3(dt_m3)
    current = fixture["situation_actuelle"]

    return {
        "allocations": payload.allocations,
        "surface_totale_ha": round(total_surface, 3),
        "surface_max_ha": parcelle_surface,
        "surface_depassee": total_surface > parcelle_surface,
        "revenu_tnd": round(weighted_revenue - total_costs, 2),
        "eau_m3": round(total_water, 2),
        "energie_kwh": round(total_energy, 2),
        "puits_max_m3": water_limit,
        "puits_depasse": total_water > water_limit,
        "dt_m3": round(dt_m3, 2),
        "label": label,
        "ecarts": {
            "eau_m3_economisees": round(current["eau_m3"] - total_water, 2),
            "energie_kwh_economisees": round(current["energie_kwh"] - total_energy, 2),
            "revenu_tnd": round(weighted_revenue - total_costs - current["revenu_tnd"], 2),
            "dt_m3": round(dt_m3 - current["dt_m3"], 2),
        },
        "hypotheses": fixture["hypotheses"],
    }


@app.post("/parcelles/{parcelle_id}/plan")
def adopt_plan(parcelle_id: str, payload: SimulationRequest) -> dict[str, Any]:
    simulation = simulate_plan(parcelle_id, payload)
    if simulation["surface_depassee"]:
        raise HTTPException(status_code=422, detail="Surface de parcelle dépassée.")
    if simulation["puits_depasse"]:
        raise HTTPException(status_code=422, detail="Capacité du puits dépassée.")

    adopted_plans[parcelle_id] = simulation
    return {
        "status": "adopte",
        "parcelle_id": parcelle_id,
        "plan": simulation,
    }


def calculate_label(dt_m3: float, compatible: bool, localized: bool, conforms: bool) -> str:
    if not compatible or not localized or not conforms:
        return "E"
    return label_from_dt_m3(dt_m3)


@app.get("/demo/sprint-08")
def demo_sprint_8() -> dict[str, Any]:
    with SPRINT_8_FIXTURE_PATH.open("r", encoding="utf-8") as fixture_file:
        return json.load(fixture_file)


@app.post("/labels/calculate")
def calculate_demo_label(payload: dict[str, Any]) -> dict[str, Any]:
    dt_m3 = float(payload.get("dt_m3", 0))
    compatible = bool(payload.get("compatible", False))
    localized = payload.get("irrigation") == "localisee"
    conforms = bool(payload.get("conforme", False))
    return {
        "letter": calculate_label(dt_m3, compatible, localized, conforms),
        "dt_m3": dt_m3,
        "compatible": compatible,
        "irrigation": "localisee" if localized else str(payload.get("irrigation", "unknown")),
        "conforme": conforms,
    }


@app.get("/labels/{qr}")
def public_label(qr: str) -> dict[str, Any]:
    with SPRINT_8_FIXTURE_PATH.open("r", encoding="utf-8") as fixture_file:
        fixture = json.load(fixture_file)

    known_qr = {fixture["ferme"]["qr"], fixture["produit"]["qr"]}
    if qr not in known_qr:
        raise HTTPException(status_code=404, detail="QR introuvable.")

    plan = fixture["plan"]
    letter = calculate_label(
        plan["dt_m3"],
        plan["compatible"],
        plan["irrigation"] == "localisee",
        plan["conforme"],
    )
    return {
        "qr": qr,
        "note": letter,
        "ferme": fixture["ferme"]["name"],
        "produit": fixture["produit"]["name"] if qr == fixture["produit"]["qr"] else None,
        "status": "actif" if fixture["ferme"]["status"] == "actif" else "suspendu",
        "economie_eau_m3": plan["eau_economisee_m3"],
        "economie_energie_kwh": plan["energie_economisee_kwh"],
        "verifications": fixture["verifications"],
    }


@app.get("/demo/sprint-09")
def demo_sprint_9() -> dict[str, Any]:
    with SPRINT_9_FIXTURE_PATH.open("r", encoding="utf-8") as fixture_file:
        return json.load(fixture_file)


def normalize_question(value: str) -> str:
    return " ".join(value.lower().replace("?", "").replace("/", " ").split())


@app.post("/assistant")
def assistant(payload: AssistantRequest) -> dict[str, Any]:
    with SPRINT_9_FIXTURE_PATH.open("r", encoding="utf-8") as fixture_file:
        fixture = json.load(fixture_file)

    question = normalize_question(payload.question)
    matched = None
    scope_terms = (
        "surface", "parcelle", "puits", "bir", "debit", "pompe",
        "zra3a", "culture", "choix", "option", "ecart", "far9",
        " eau", "eau ", "ma disponible", "kwh", "energie", "pluie", "rain", "label",
        "economie", "olivier", "dattier", "intercalaire", "pois",
        "ferme", "m3", "dt", "thani", "deuxieme",
    )
    question_in_scope = any(term in f" {question} " for term in scope_terms)
    if question_in_scope:
        exact_matches = [
            item
            for item in fixture["questions"]
            if normalize_question(item["darija"]) == question
            or normalize_question(item["fr"]) == question
        ]
        if exact_matches:
            matched = exact_matches[0]
        else:
            ranked: list[tuple[int, dict[str, Any]]] = []
            for item in fixture["questions"]:
                keyword_count = sum(
                    1
                    for keyword in item["keywords"]
                    if keyword.lower() in question
                )
                if keyword_count:
                    ranked.append((keyword_count, item))
            if ranked:
                ranked.sort(key=lambda pair: pair[0], reverse=True)
                matched = ranked[0][1]

    if matched is None:
        return {
            "text": fixture["out_of_scope"]["answer"],
            "translation_fr": fixture["out_of_scope"]["fr_answer"],
            "audio": matched is not None and payload.audio,
            "actions": [],
            "in_scope": False,
        }

    actions = fixture["actions"]
    return {
        "text": matched["answer"],
        "translation_fr": matched["fr_answer"],
        "audio": payload.audio,
        "actions": actions,
        "in_scope": True,
        "question_id": matched["id"],
    }


@app.get("/demo/sprint-10")
def demo_sprint_10() -> dict[str, Any]:
    with SPRINT_10_FIXTURE_PATH.open("r", encoding="utf-8") as fixture_file:
        return json.load(fixture_file)


@app.get("/produits")
def list_products(
    label: str | None = None,
    category: str | None = None,
    region: str | None = None,
) -> dict[str, Any]:
    with SPRINT_10_FIXTURE_PATH.open("r", encoding="utf-8") as fixture_file:
        fixture = json.load(fixture_file)

    products = fixture["produits"]
    if label:
        products = [product for product in products if product["label"].upper() == label.upper()]
    if category:
        products = [product for product in products if product["category"] == category]
    if region:
        products = [product for product in products if product["region"].lower() == region.lower()]
    return {"count": len(products), "produits": products}


@app.get("/produits/qr/{qr}")
def product_by_qr(qr: str) -> dict[str, Any]:
    with SPRINT_10_FIXTURE_PATH.open("r", encoding="utf-8") as fixture_file:
        fixture = json.load(fixture_file)

    product = next((item for item in fixture["produits"] if item["qr"] == qr), None)
    if product is None:
        raise HTTPException(status_code=404, detail="Produit QR introuvable.")
    return product


@app.post("/commandes", status_code=201)
def create_order(payload: CommandeCreate) -> dict[str, Any]:
    with SPRINT_10_FIXTURE_PATH.open("r", encoding="utf-8") as fixture_file:
        fixture = json.load(fixture_file)

    product = next(
        (item for item in fixture["produits"] if item["id"] == payload.product_id),
        None,
    )
    if product is None:
        raise HTTPException(status_code=404, detail="Produit introuvable.")
    if payload.quantity > product["stock"]:
        raise HTTPException(status_code=422, detail="Stock insuffisant.")
    if payload.payment_method not in {"d17", "carte", "livraison"}:
        raise HTTPException(status_code=422, detail="Moyen de paiement inconnu.")

    order_id = f"commande-{uuid.uuid4().hex[:8]}"
    order = {
        "id": order_id,
        "buyer_id": payload.buyer_id,
        "product_id": payload.product_id,
        "quantity": payload.quantity,
        "payment_method": payload.payment_method,
        "status": "en_attente",
        "total_tnd": round(payload.quantity * product["price_tnd"], 2),
        "impact_eau_m3": round(payload.quantity * product["impact_eau_m3"], 2),
        "impact_energie_kwh": round(payload.quantity * product["impact_energie_kwh"], 2),
    }
    orders[order_id] = order
    return order


@app.patch("/commandes/{commande_id}")
def update_order(commande_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    order = orders.get(commande_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Commande introuvable.")
    status = payload.get("status")
    if status not in {"en_attente", "acceptee", "refusee", "livree"}:
        raise HTTPException(status_code=422, detail="Statut de commande inconnu.")
    order["status"] = status
    return order


@app.post("/auth/otp", status_code=200)
def request_otp(payload: OTPRequest) -> dict[str, str]:
    if payload.role not in ALLOWED_ROLES:
        raise HTTPException(status_code=422, detail="Rôle inconnu.")

    pending_profiles[payload.phone] = {
        "phone": payload.phone,
        "role": payload.role,
        "name": payload.name,
        "language": payload.language,
    }
    return {"status": "envoye", "code": DEMO_OTP}


@app.post("/auth/verify", status_code=200)
def verify_otp(payload: OTPVerify, db: Session = Depends(get_db)) -> dict[str, object]:
    profile = pending_profiles.get(payload.phone)
    if profile is None:
        raise HTTPException(status_code=404, detail="Demande OTP introuvable.")
    if payload.code != DEMO_OTP:
        raise HTTPException(status_code=401, detail="Code OTP invalide.")

    existing = db.query(Utilisateur).filter(Utilisateur.phone == payload.phone).first()
    if existing is None:
        existing = Utilisateur(
            id=f"usr-{uuid.uuid4().hex[:8]}",
            phone=profile["phone"],
            name=profile["name"],
            role=profile["role"],
            language=profile["language"],
        )
        db.add(existing)
        db.commit()
        db.refresh(existing)

    pending_profiles.pop(payload.phone, None)
    return {
        "id": existing.id,
        "phone": existing.phone,
        "name": existing.name,
        "role": existing.role,
        "language": existing.language,
    }


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
