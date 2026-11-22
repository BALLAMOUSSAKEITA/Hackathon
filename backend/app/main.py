import csv
import io
import json
import math
import os
import re
import unicodedata
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from statistics import mean
from time import perf_counter
from typing import Any, Literal
from uuid import uuid4

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi.responses import Response
import httpx
from pyproj import Geod
from shapely.errors import GEOSException
from shapely.geometry import shape
from shapely.geometry.polygon import orient
from shapely.validation import explain_validity
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from . import models
from .schemas import (
    AnalyseRequest,
    AssistantRequest,
    AlertReadRequest,
    CulturePriceUpdate,
    OTPRequest,
    OTPResponse,
    OTPVerify,
    OrderCreate,
    OrderPatch,
    ParcelleCreate,
    ParcelleOut,
    ProductCreate,
    SimulationAllocation,
    SimulationRequest,
    UserCreate,
    UserOut,
    WholesaleOrderCreate,
)


FIXTURES_DIR = Path(__file__).resolve().parents[1] / "fixtures"
DEMO_OTP_CODE = "123456"
pending_otp_phones: set[str] = set()
GEOD = Geod(ellps="WGS84")
SPRINT_SCHEMA_COLUMNS = {
    "parcelles": {"location_consent": "BOOLEAN NOT NULL DEFAULT 0"},
    "commandes": {
        "payment_method": "VARCHAR",
        "total_tnd": "FLOAT",
        "payment_status": "VARCHAR",
        "counteroffer_price_tnd_kg": "FLOAT",
    },
    "produits": {"photo_url": "VARCHAR"},
    "alertes": {"date": "VARCHAR", "read": "BOOLEAN"},
    "culture_details": {"price_updated_at": "VARCHAR"},
}


def ensure_sprint_schema_columns() -> None:
    for table, additions in SPRINT_SCHEMA_COLUMNS.items():
        columns = {
            column["name"] for column in inspect(engine).get_columns(table)
        }
        with engine.begin() as connection:
            for column, column_type in additions.items():
                if column not in columns:
                    connection.execute(
                        text(
                            f"ALTER TABLE {table} ADD COLUMN {column} {column_type}"
                        )
                    )
                    columns.add(column)


def configure_https_redirect(application: FastAPI) -> None:
    if os.getenv("ARDI_ENV", "development").strip().casefold() == "production":
        application.add_middleware(HTTPSRedirectMiddleware)


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


class ExternalSourceError(Exception):
    pass


def fetch_json(source: str, url: str, params: dict[str, Any]) -> dict[str, Any]:
    try:
        response = httpx.get(
            url,
            params=params,
            timeout=httpx.Timeout(2.5, connect=1.0),
        )
        response.raise_for_status()
        return response.json()
    except (httpx.HTTPError, ValueError) as error:
        raise ExternalSourceError(f"{source} is unavailable or returned invalid data") from error


@lru_cache(maxsize=128)
def fetch_soilgrids(latitude: float, longitude: float) -> dict[str, Any]:
    data = fetch_json(
        "SoilGrids",
        "https://rest.isric.org/soilgrids/v2.0/properties/query",
        {
            "lat": latitude,
            "lon": longitude,
            "property": ["phh2o", "soc", "sand", "clay"],
            "depth": "0-5cm",
            "value": "mean",
        },
    )
    try:
        layers = data["properties"]["layers"]

        def layer_mean(name: str) -> float:
            layer = next(item for item in layers if item["name"] == name)
            depth = next(item for item in layer["depths"] if item["label"] == "0-5cm")
            value = float(depth["values"]["mean"])
            if not math.isfinite(value):
                raise ValueError("SoilGrids returned a non-finite value")
            return value

        ph = layer_mean("phh2o") / 10
        organic_carbon_g_kg = layer_mean("soc")
        sand_percent = layer_mean("sand") / 10
        clay_percent = layer_mean("clay") / 10
        if (
            not 0 <= ph <= 14
            or not 0 <= organic_carbon_g_kg <= 1000
            or not 0 <= sand_percent <= 100
            or not 0 <= clay_percent <= 100
        ):
            raise ValueError("SoilGrids returned a value outside expected ranges")
    except (KeyError, StopIteration, TypeError, ValueError) as error:
        raise ExternalSourceError("SoilGrids response is missing required soil properties") from error

    if clay_percent >= 40:
        texture = "clay"
    elif sand_percent >= 70:
        texture = "sandy"
    elif sand_percent >= 52 and clay_percent < 20:
        texture = "sandy_loam"
    elif clay_percent >= 27:
        texture = "clay_loam"
    else:
        texture = "loam"

    return {
        "texture": texture,
        "ph": round(ph, 2),
        "organic_matter_percent": round(organic_carbon_g_kg * 1.724 / 10, 2),
        "source": "SoilGrids v2.0",
    }


@lru_cache(maxsize=128)
def fetch_open_meteo(
    latitude: float,
    longitude: float,
    start_date: str,
    end_date: str,
) -> dict[str, Any]:
    data = fetch_json(
        "Open-Meteo",
        "https://archive-api.open-meteo.com/v1/archive",
        {
            "latitude": latitude,
            "longitude": longitude,
            "start_date": start_date,
            "end_date": end_date,
            "daily": "precipitation_sum,temperature_2m_mean,et0_fao_evapotranspiration",
            "timezone": "UTC",
        },
    )
    try:
        daily = data["daily"]
        precipitation = [float(value) for value in daily["precipitation_sum"] if value is not None]
        temperatures = [float(value) for value in daily["temperature_2m_mean"] if value is not None]
        et0_values = [
            float(value)
            for value in daily["et0_fao_evapotranspiration"]
            if value is not None
        ]
        if not precipitation or not temperatures or not et0_values:
            raise ValueError("Open-Meteo returned empty daily series")
        if not all(
            math.isfinite(value)
            for series in (precipitation, temperatures, et0_values)
            for value in series
        ):
            raise ValueError("Open-Meteo returned a non-finite value")
        if (
            any(value < 0 for value in precipitation)
            or any(value < 0 for value in et0_values)
            or any(not -90 <= value <= 70 for value in temperatures)
        ):
            raise ValueError("Open-Meteo returned a value outside expected ranges")
    except (KeyError, TypeError, ValueError) as error:
        raise ExternalSourceError("Open-Meteo response is missing required climate data") from error

    return {
        "rain_mm": round(sum(precipitation), 1),
        "period_days": len(precipitation),
        "temperature_c": round(mean(temperatures), 1),
        "et0_daily_mm": round(mean(et0_values), 2),
        "source": "Open-Meteo archive",
    }


@lru_cache(maxsize=128)
def fetch_nasa_power(latitude: float, longitude: float) -> dict[str, Any]:
    data = fetch_json(
        "NASA POWER",
        "https://power.larc.nasa.gov/api/temporal/climatology/point",
        {
            "parameters": "ALLSKY_SFC_SW_DWN",
            "community": "AG",
            "longitude": longitude,
            "latitude": latitude,
            "format": "JSON",
        },
    )
    try:
        irradiance = float(data["properties"]["parameter"]["ALLSKY_SFC_SW_DWN"]["ANN"])
        if not math.isfinite(irradiance) or irradiance < 0:
            raise ValueError("NASA POWER returned an invalid irradiance value")
    except (KeyError, TypeError, ValueError) as error:
        raise ExternalSourceError("NASA POWER response is missing solar irradiance") from error
    return {
        "irradiance_kwh_m2_day": round(irradiance, 2),
        "source": "NASA POWER",
    }


def fetch_external_analysis(latitude: float, longitude: float) -> dict[str, dict[str, Any]]:
    end_date = datetime.now(timezone.utc).date() - timedelta(days=7)
    start_date = end_date - timedelta(days=364)
    coordinates = (round(latitude, 4), round(longitude, 4))

    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            "soil": executor.submit(fetch_soilgrids, *coordinates),
            "climate": executor.submit(
                fetch_open_meteo,
                *coordinates,
                start_date.isoformat(),
                end_date.isoformat(),
            ),
            "solar": executor.submit(fetch_nasa_power, *coordinates),
        }
        try:
            return {
                key: future.result(timeout=4)
                for key, future in futures.items()
            }
        except FuturesTimeoutError as error:
            for future in futures.values():
                future.cancel()
            raise HTTPException(504, "External analysis sources exceeded the time limit") from error
        except ExternalSourceError as error:
            for future in futures.values():
                future.cancel()
            raise HTTPException(502, str(error)) from error


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_sprint_schema_columns()
    db = next(get_db())
    try:
        for fixture_name in (
            "sprint-01.json",
            "sprint-02.json",
            "sprint-03.json",
            "sprint-04.json",
            "sprint-05.json",
            "sprint-06.json",
            "sprint-07.json",
            "sprint-08.json",
            "sprint-09.json",
            "sprint-10.json",
            "sprint-11.json",
            "sprint-12.json",
            "sprint-13.json",
            "sprint-14.json",
            "sprint-15.json",
            "sprint-16.json",
            "sprint-17.json",
        ):
            fixture = FIXTURES_DIR / fixture_name
            data = json.loads(fixture.read_text(encoding="utf-8"))
            for section, model in ENTITY_MODELS.items():
                if fixture_name == "sprint-12.json" and section == "cultures":
                    continue
                if fixture_name == "sprint-14.json" and section == "alertes":
                    # These are alert templates, not initial database alerts.
                    continue
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
                        detail = db.get(models.CultureDetail, row["id"])
                        preserve_price = (
                            detail is not None and detail.price_updated_at is not None
                        )
                        if culture is None:
                            culture = model(**culture_values)
                            db.add(culture)
                        else:
                            for key, value in culture_values.items():
                                if preserve_price and key == "price_tnd_t":
                                    continue
                                setattr(culture, key, value)
                        if "details" in row:
                            if detail is None:
                                db.add(
                                    models.CultureDetail(
                                        culture_id=row["id"], **row["details"]
                                    )
                                )
                            else:
                                for key, value in row["details"].items():
                                    if preserve_price and key in (
                                        "price_range_tnd_t",
                                        "price_source",
                                    ):
                                        continue
                                    setattr(detail, key, value)
                        continue
                    if db.get(model, row["id"]) is None:
                        db.add(model(**row))
            db.flush()
            if fixture_name == "sprint-17.json":
                for price in data.get("prices", []):
                    culture = db.get(models.Culture, price["culture_id"])
                    detail = db.get(models.CultureDetail, price["culture_id"])
                    if culture is None or detail is None:
                        raise ValueError(
                            f"Price fixture references unknown culture {price['culture_id']}"
                        )
                    if detail.price_updated_at is None:
                        culture.price_tnd_t = price["typical_tnd_t"]
                        detail.price_range_tnd_t = {
                            "min": price["min_tnd_t"],
                            "typical": price["typical_tnd_t"],
                            "max": price["max_tnd_t"],
                        }
                        detail.price_source = price["source"]
                        detail.price_updated_at = price["effective_date"]
                db.flush()
        db.commit()
    finally:
        db.close()
    yield


app = FastAPI(
    title="Ardi API",
    version="1.0.0",
    description="API FastAPI Ardi, sprints de demonstration 1 a 17.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
configure_https_redirect(app)

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


@app.get("/fixture/sprint-05")
def sprint_05_fixture() -> dict[str, Any]:
    return json.loads((FIXTURES_DIR / "sprint-05.json").read_text(encoding="utf-8"))


@app.get("/fixture/sprint-06")
def sprint_06_fixture() -> dict[str, Any]:
    return json.loads((FIXTURES_DIR / "sprint-06.json").read_text(encoding="utf-8"))


@app.get("/fixture/sprint-07")
def sprint_07_fixture() -> dict[str, Any]:
    return json.loads((FIXTURES_DIR / "sprint-07.json").read_text(encoding="utf-8"))


@app.get("/fixture/sprint-08")
def sprint_08_fixture() -> dict[str, Any]:
    data = json.loads((FIXTURES_DIR / "sprint-08.json").read_text(encoding="utf-8"))
    data["calculated_labels"] = {
        plan_name: calculate_label_grade(plan)
        for plan_name, plan in data["plan"].items()
    }
    data["home"]["current_label_grade"] = data["calculated_labels"]["current"]
    data["home"]["potential_label_grade"] = data["calculated_labels"]["potential"]
    data["labels"][0]["grade"] = data["calculated_labels"]["current"]
    return data


@app.get("/fixture/sprint-09")
def sprint_09_fixture() -> dict[str, Any]:
    return json.loads((FIXTURES_DIR / "sprint-09.json").read_text(encoding="utf-8"))


@app.get("/fixture/sprint-10")
def sprint_10_fixture() -> dict[str, Any]:
    return json.loads((FIXTURES_DIR / "sprint-10.json").read_text(encoding="utf-8"))


@app.get("/fixture/sprint-11")
def sprint_11_fixture() -> dict[str, Any]:
    return json.loads((FIXTURES_DIR / "sprint-11.json").read_text(encoding="utf-8"))


@app.get("/fixture/sprint-12")
def sprint_12_fixture(db: Session = Depends(get_db)) -> dict[str, Any]:
    calculation_started = perf_counter()
    data = json.loads((FIXTURES_DIR / "sprint-12.json").read_text(encoding="utf-8"))
    parcel_calculations = []
    for parcel in data["parcelles"]:
        result = recommend_crops(parcel["id"], tri="revenu_m3", db=db)
        parcel_calculations.append(
            {
                "parcel_id": result["parcel_id"],
                "available_water_m3": result["available_water_m3"],
                "energy_kwh_m3": result["energy_kwh_m3"],
                "excluded_crops": result["excluded_crops"],
                "calculation_time_ms": result["calculation_time_ms"],
            }
        )
    data["parcel_calculations"] = parcel_calculations
    data["ranking"] = recommend_crops(
        data["parcelles"][0]["id"], tri="revenu_m3", db=db
    )
    data["total_calculation_time_ms"] = round(
        (perf_counter() - calculation_started) * 1000, 3
    )
    return data


@app.get("/fixture/sprint-13")
def sprint_13_fixture() -> dict[str, Any]:
    return json.loads((FIXTURES_DIR / "sprint-13.json").read_text(encoding="utf-8"))


@app.get("/fixture/sprint-14")
def sprint_14_fixture() -> dict[str, Any]:
    return json.loads((FIXTURES_DIR / "sprint-14.json").read_text(encoding="utf-8"))


def load_sprint_15_fixture() -> dict[str, Any]:
    return json.loads((FIXTURES_DIR / "sprint-15.json").read_text(encoding="utf-8"))


@app.get("/fixture/sprint-15")
def sprint_15_fixture() -> dict[str, Any]:
    return load_sprint_15_fixture()


@lru_cache(maxsize=1)
def load_sprint_16_fixture() -> dict[str, Any]:
    return json.loads((FIXTURES_DIR / "sprint-16.json").read_text(encoding="utf-8"))


@app.get("/fixture/sprint-16")
def sprint_16_fixture() -> dict[str, Any]:
    return load_sprint_16_fixture()


@app.get("/fixture/sprint-17")
def sprint_17_fixture() -> dict[str, Any]:
    return json.loads((FIXTURES_DIR / "sprint-17.json").read_text(encoding="utf-8"))


def normalize_assistant_question(question: str) -> str:
    normalized = unicodedata.normalize("NFKD", question.casefold())
    normalized = "".join(
        character
        for character in normalized
        if not unicodedata.combining(character)
    )
    normalized = normalized.translate(
        str.maketrans({"ى": "ي", "ة": "ه", "ؤ": "و", "ئ": "ي"})
    )
    normalized = re.sub(r"[^\w\s]", " ", normalized, flags=re.UNICODE)
    return " ".join(normalized.split())


def match_assistant_question(
    question: str, fixture: dict[str, Any]
) -> dict[str, Any] | None:
    query_tokens = set(normalize_assistant_question(question).split())
    matches = []
    for item in fixture["questions"]:
        longest_match = 0
        for phrase in item["phrases"]:
            phrase_tokens = set(normalize_assistant_question(phrase).split())
            if phrase_tokens and phrase_tokens <= query_tokens:
                longest_match = max(longest_match, len(phrase_tokens))
        if longest_match:
            matches.append((longest_match, item))
    if not matches:
        return None

    best_length = max(length for length, _ in matches)
    best_matches = [item for length, item in matches if length == best_length]
    return best_matches[0] if len(best_matches) == 1 else None


@app.post("/assistant")
def answer_assistant(payload: AssistantRequest) -> dict[str, Any]:
    fixture = json.loads((FIXTURES_DIR / "sprint-09.json").read_text(encoding="utf-8"))
    question = payload.question_text or payload.audio_transcript or ""
    matched = match_assistant_question(question, fixture)
    if matched is None:
        answers = fixture["out_of_scope"]["answer"]
        answer_text = answers[payload.language]
        suggested_question = fixture["out_of_scope"]["suggested_question"][
            payload.language
        ]
        question_id = None
        found = False
    else:
        answers = matched["answers"]
        answer_text = answers[payload.language]
        suggested_question = None
        question_id = matched["id"]
        found = True

    locale = {
        "darija": "ar-TN",
        "ar": "ar-TN",
        "fr": "fr-TN",
    }[payload.language]
    return {
        "found_in_fixture": found,
        "question_id": question_id,
        "input_type": "audio_transcript" if payload.audio_transcript else "text",
        "answer_text": answer_text,
        "translation_fr": answers["fr"],
        "suggested_question": suggested_question,
        "audio": {
            "status": "client_tts",
            "locale": locale,
            "text": answer_text,
        },
        "actions": list(fixture["actions"].values()),
        "source": "sprint-09.json",
    }


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


def require_farmer_owner(owner_id: str, db: Session) -> models.User:
    normalized_owner_id = owner_id.strip()
    if not normalized_owner_id:
        raise HTTPException(422, "owner_id must not be blank")
    owner = db.get(models.User, normalized_owner_id)
    if owner is None:
        raise HTTPException(404, "Parcel owner not found")
    if owner.role != "farmer":
        raise HTTPException(403, "Parcel owner must be a farmer")
    return owner


@app.get("/parcelles", response_model=list[ParcelleOut])
def list_parcelles(
    owner_id: str = Query(min_length=1),
    db: Session = Depends(get_db),
):
    require_farmer_owner(owner_id, db)
    return (
        db.query(models.Parcelle)
        .filter(models.Parcelle.owner_id == owner_id.strip())
        .all()
    )


@app.post("/parcelles", response_model=ParcelleOut, status_code=201)
def create_parcelle(payload: ParcelleCreate, db: Session = Depends(get_db)):
    if not payload.location_consent:
        raise HTTPException(
            403, "Explicit consent is required before storing parcel location"
        )
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
def get_parcelle(
    parcel_id: str,
    owner_id: str = Query(min_length=1),
    db: Session = Depends(get_db),
):
    require_farmer_owner(owner_id, db)
    parcel = db.get(models.Parcelle, parcel_id)
    if parcel is None or parcel.owner_id != owner_id.strip():
        raise HTTPException(404, "Parcel not found")
    return parcel


@app.post("/parcelles/{parcel_id}/analyse")
def analyze_parcelle(
    parcel_id: str,
    payload: AnalyseRequest | None = None,
    db: Session = Depends(get_db),
):
    parcel = db.get(models.Parcelle, parcel_id)
    if parcel is None:
        raise HTTPException(404, "Parcel not found")
    if parcel.pump_flow_m3_h is None or parcel.well_depth_m is None:
        raise HTTPException(422, "Parcel needs pump flow and well depth for water and energy analysis")

    fixture = json.loads((FIXTURES_DIR / "sprint-05.json").read_text(encoding="utf-8"))
    fixture_parcel_ids = {row["id"] for row in fixture["parcelles"]}
    uses_fixture = parcel_id in fixture_parcel_ids
    if uses_fixture:
        source_data = fixture["analysis_inputs"]
        water_settings = fixture["water"]
        ndvi_monthly = fixture["ndvi_monthly"]
        ndvi_source = fixture["ndvi_source"]
    else:
        centroid = shape(parcel.geometry).centroid
        source_data = fetch_external_analysis(centroid.y, centroid.x)
        water_settings = {}
        ndvi_monthly = []
        ndvi_source = "No fixed NDVI series is available for this parcel"

    pump_hours_per_day = (
        payload.pump_hours_per_day
        if payload and payload.pump_hours_per_day is not None
        else water_settings.get("pump_hours_per_day", 6)
    )
    season_days = (
        payload.season_days
        if payload and payload.season_days is not None
        else water_settings.get("season_days", 180)
    )
    efficiency = (
        payload.efficiency
        if payload and payload.efficiency is not None
        else water_settings.get("efficiency", 0.5)
    )
    available_water_m3 = round(
        parcel.pump_flow_m3_h * pump_hours_per_day * season_days, 2
    )
    pumping_energy_kwh_m3 = round(0.00272 * parcel.well_depth_m / efficiency, 4)

    soil = source_data["soil"]
    climate = source_data["climate"]
    solar = source_data["solar"]
    sources = {
        "soil": soil["source"],
        "climate": climate["source"],
        "solar": solar["source"],
        "ndvi": ndvi_source,
    }
    assumptions = {
        "pump_flow_m3_h": parcel.pump_flow_m3_h,
        "pump_hours_per_day": pump_hours_per_day,
        "season_days": season_days,
        "water_formula": "pump_flow_m3_h * pump_hours_per_day * season_days",
        "well_depth_m": parcel.well_depth_m,
        "efficiency": efficiency,
        "energy_formula": "0.00272 * well_depth_m / efficiency",
        "climate_period_days": climate.get("period_days"),
        "et0_period": "daily mean, mm/day",
        "settings_source": "sprint-05 fixture" if uses_fixture else "request or documented defaults",
    }
    analysis = models.Analyse(
        id=str(uuid4()),
        parcel_id=parcel_id,
        soil_texture=soil["texture"],
        ph=soil["ph"],
        organic_matter_percent=soil["organic_matter_percent"],
        rain_mm=climate["rain_mm"],
        temperature_c=climate["temperature_c"],
        et0_mm=climate["et0_daily_mm"],
        available_water_m3=available_water_m3,
        pumping_energy_kwh_m3=pumping_energy_kwh_m3,
    )
    db.add(analysis)
    db.flush()
    detail = models.AnalyseDetail(
        analysis_id=analysis.id,
        solar_irradiance_kwh_m2_day=solar["irradiance_kwh_m2_day"],
        sources=sources,
        ndvi_monthly=ndvi_monthly,
        assumptions=assumptions,
    )
    db.add(detail)
    db.commit()
    db.refresh(analysis)

    return {
        "id": analysis.id,
        "parcel_id": analysis.parcel_id,
        "soil_texture": analysis.soil_texture,
        "ph": analysis.ph,
        "organic_matter_percent": analysis.organic_matter_percent,
        "rain_mm": analysis.rain_mm,
        "temperature_c": analysis.temperature_c,
        "et0_mm": analysis.et0_mm,
        "solar_irradiance_kwh_m2_day": detail.solar_irradiance_kwh_m2_day,
        "available_water_m3": analysis.available_water_m3,
        "pumping_energy_kwh_m3": analysis.pumping_energy_kwh_m3,
        "ndvi_monthly": detail.ndvi_monthly,
        "sources": detail.sources,
        "assumptions": detail.assumptions,
    }


def calculate_solar_sizing(
    well_depth_m: float,
    pump_flow_m3_h: float,
    irradiance_kwh_m2_day: float,
    settings: dict[str, Any],
) -> dict[str, Any]:
    numeric_inputs = (
        well_depth_m,
        pump_flow_m3_h,
        irradiance_kwh_m2_day,
    )
    if any(
        isinstance(value, bool)
        or not isinstance(value, (int, float))
        or not math.isfinite(value)
        for value in numeric_inputs
    ):
        raise HTTPException(422, "Solar sizing inputs must be finite numbers")

    numeric_settings = (
        "pump_hours_per_day",
        "season_days",
        "eta",
        "system_performance_ratio",
        "panel_power_w",
        "tank_autonomy_days",
        "steg_price_tnd_kwh",
        "diesel_price_tnd_liter",
        "diesel_liter_per_kwh",
        "solar_panel_cost_tnd_kwp",
        "annual_maintenance_fraction",
    )
    if any(
        isinstance(settings.get(key), bool)
        or not isinstance(settings.get(key), (int, float))
        or not math.isfinite(settings[key])
        for key in numeric_settings
    ):
        raise HTTPException(422, "Solar sizing assumptions must be finite numbers")
    if (
        well_depth_m <= 0
        or pump_flow_m3_h <= 0
        or irradiance_kwh_m2_day <= 0
        or settings["pump_hours_per_day"] <= 0
        or settings["pump_hours_per_day"] > 24
        or settings["season_days"] <= 0
        or not 0 < settings["eta"] <= 1
        or not 0 < settings["system_performance_ratio"] <= 1
        or settings["panel_power_w"] <= 0
        or settings["tank_autonomy_days"] < 0
        or settings["steg_price_tnd_kwh"] < 0
        or settings["diesel_price_tnd_liter"] < 0
        or settings["diesel_liter_per_kwh"] < 0
        or settings["solar_panel_cost_tnd_kwp"] <= 0
        or settings["annual_maintenance_fraction"] < 0
    ):
        raise HTTPException(422, "Solar sizing assumptions are outside valid ranges")

    energy_kwh_m3 = 0.00272 * well_depth_m / settings["eta"]
    daily_water_m3 = pump_flow_m3_h * settings["pump_hours_per_day"]
    daily_energy_kwh = energy_kwh_m3 * daily_water_m3
    pump_power_kw = energy_kwh_m3 * pump_flow_m3_h
    performance_ratio = settings["system_performance_ratio"]
    required_array_kwp = max(
        pump_power_kw / performance_ratio,
        daily_energy_kwh / (irradiance_kwh_m2_day * performance_ratio),
    )
    panel_count = math.ceil(required_array_kwp * 1000 / settings["panel_power_w"])
    installed_array_kwp = panel_count * settings["panel_power_w"] / 1000
    tank_volume_liters = math.ceil(
        daily_water_m3 * settings["tank_autonomy_days"] * 1000
    )

    annual_energy_kwh = daily_energy_kwh * settings["season_days"]
    diesel_price_tnd_kwh = (
        settings["diesel_price_tnd_liter"] * settings["diesel_liter_per_kwh"]
    )
    solar_capex_tnd = installed_array_kwp * settings["solar_panel_cost_tnd_kwp"]
    solar_maintenance_tnd = (
        solar_capex_tnd * settings["annual_maintenance_fraction"]
    )
    diesel_annual_cost_tnd = annual_energy_kwh * diesel_price_tnd_kwh
    steg_annual_cost_tnd = annual_energy_kwh * settings["steg_price_tnd_kwh"]

    def payback_years(annual_cost: float) -> float | None:
        annual_saving = annual_cost - solar_maintenance_tnd
        return (
            round(solar_capex_tnd / annual_saving, 2)
            if annual_saving > 0
            else None
        )

    return {
        "energy_kwh_m3": round(energy_kwh_m3, 4),
        "daily_water_m3": round(daily_water_m3, 2),
        "daily_energy_kwh": round(daily_energy_kwh, 2),
        "pump_power_kw": round(pump_power_kw, 2),
        "required_array_kwp": round(required_array_kwp, 2),
        "installed_array_kwp": round(installed_array_kwp, 2),
        "panel_count": panel_count,
        "panel_power_w": settings["panel_power_w"],
        "tank_volume_liters": tank_volume_liters,
        "annual_water_m3": round(daily_water_m3 * settings["season_days"], 2),
        "annual_energy_kwh": round(annual_energy_kwh, 2),
        "solar_capex_tnd": round(solar_capex_tnd, 2),
        "annual_costs_tnd": {
            "solar_maintenance": round(solar_maintenance_tnd, 2),
            "diesel": round(diesel_annual_cost_tnd, 2),
            "steg": round(steg_annual_cost_tnd, 2),
        },
        "annual_savings_tnd": {
            "vs_diesel": round(diesel_annual_cost_tnd - solar_maintenance_tnd, 2),
            "vs_steg": round(steg_annual_cost_tnd - solar_maintenance_tnd, 2),
        },
        "payback_years": {
            "vs_diesel": payback_years(diesel_annual_cost_tnd),
            "vs_steg": payback_years(steg_annual_cost_tnd),
        },
    }


@app.get("/parcelles/{parcel_id}/solaire")
def solar_sizing(parcel_id: str, db: Session = Depends(get_db)):
    parcel = db.get(models.Parcelle, parcel_id)
    if parcel is None:
        raise HTTPException(404, "Parcel not found")

    fixture = json.loads(
        (FIXTURES_DIR / "sprint-13.json").read_text(encoding="utf-8")
    )
    if parcel.well_depth_m is None or parcel.well_depth_m <= 0:
        return {
            "parcel_id": parcel_id,
            "available": False,
            "reason": "well_depth_required",
            "message": "A well depth is required for solar pump sizing.",
        }
    if parcel.pump_flow_m3_h is None or parcel.pump_flow_m3_h <= 0:
        return {
            "parcel_id": parcel_id,
            "available": False,
            "reason": "pump_flow_required",
            "message": "A pump flow is required for solar pump sizing.",
        }

    fixture_parcel_ids = {row["id"] for row in fixture["parcelles"]}
    if parcel_id in fixture_parcel_ids:
        solar_data = fixture["solar"]
        solar_source = solar_data["source"]
    else:
        analysis = (
            db.query(models.Analyse)
            .filter(models.Analyse.parcel_id == parcel_id)
            .first()
        )
        detail = db.get(models.AnalyseDetail, analysis.id) if analysis else None
        if detail is not None:
            solar_data = {
                "irradiance_kwh_m2_day": detail.solar_irradiance_kwh_m2_day,
            }
            solar_source = detail.sources.get("solar", "NASA POWER")
        else:
            try:
                centroid = shape(parcel.geometry).centroid
            except (GEOSException, TypeError, ValueError, IndexError) as error:
                raise HTTPException(
                    422, "Parcel geometry is invalid for solar irradiance lookup"
                ) from error
            try:
                solar_data = fetch_nasa_power(centroid.y, centroid.x)
            except ExternalSourceError as error:
                raise HTTPException(502, str(error)) from error
            solar_source = solar_data["source"]

    sizing = calculate_solar_sizing(
        float(parcel.well_depth_m),
        float(parcel.pump_flow_m3_h),
        float(solar_data["irradiance_kwh_m2_day"]),
        fixture["system"],
    )
    return {
        "parcel_id": parcel_id,
        "available": True,
        "well_depth_m": parcel.well_depth_m,
        "pump_flow_m3_h": parcel.pump_flow_m3_h,
        "solar_irradiance_kwh_m2_day": solar_data["irradiance_kwh_m2_day"],
        "sources": {"solar_irradiance": solar_source},
        "recommended_pumping_window": fixture["recommended_pumping_window"],
        "assistance_information": fixture["assistance_information"],
        "assumptions": fixture["system"],
        **sizing,
    }


def evaluate_sprint_14_alerts(
    fixture: dict[str, Any], zones: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    thresholds = fixture["thresholds"]
    water_plan = fixture["water_plan"]
    usable_images = [
        image
        for image in fixture["images"]
        if image["exploitable"]
        and image["cloud_cover_pct"] <= thresholds["maximum_cloud_cover_pct"]
    ]
    alerts = []

    if water_plan["actual_water_m3"] > water_plan["planned_water_m3"]:
        template = next(
            alert
            for alert in fixture["alerts"]
            if alert["type"] == "irrigation_non_conforme"
        )
        evidence_image_ids = [
            image["id"]
            for image in usable_images
            if image.get("irrigation_deviation_detected", False)
        ]
        alerts.append(
            {
                **template,
                "parcel_id": fixture["parcelles"][0]["id"],
                "message": (
                    f"{template['message']} "
                    f"Consommation {water_plan['actual_water_m3']} m3 pour "
                    f"{water_plan['planned_water_m3']} m3 prevus."
                ),
                "date": water_plan["period_end"],
                "read": False,
                "status": (
                    "écart confirmé"
                    if len(evidence_image_ids) >= 2
                    else "à confirmer"
                ),
                "evidence_image_ids": evidence_image_ids,
            }
        )

    for zone in zones:
        if (
            zone["ndvi"] <= thresholds["minimum_ndvi_for_stress"]
            or zone["soil_moisture_pct"]
            <= thresholds["minimum_soil_moisture_pct"]
        ):
            alerts.append(
                {
                    "id": f"alert-sprint-14-stress-{zone['id']}",
                    "parcel_id": fixture["parcelles"][0]["id"],
                    "type": "stress_hydrique",
                    "message": (
                        f"Stress hydrique potentiel detecte dans {zone['name']}."
                    ),
                    "severity": "warning",
                    "date": fixture["images"][-1]["captured_at"],
                    "read": False,
                    "status": "actif",
                    "zone_id": zone["id"],
                }
            )

    forecast = water_plan["forecast"]
    if (
        forecast["precipitation_mm"]
        >= thresholds["rain_alert_precipitation_mm"]
        and forecast["probability_pct"]
        >= thresholds["rain_alert_probability_pct"]
    ):
        alerts.append(
            {
                "id": "alert-sprint-14-rain",
                "parcel_id": fixture["parcelles"][0]["id"],
                "type": "pluie_prevue",
                "message": (
                    f"Pluie prevue: {forecast['precipitation_mm']} mm "
                    f"({forecast['probability_pct']} % de probabilite)."
                ),
                "severity": "info",
                "date": water_plan["period_end"],
                "read": False,
                "status": "actif",
                "source": forecast["source"],
            }
        )
    return alerts


def process_sprint_14_images(parcel_id: str) -> None:
    fixture = json.loads(
        (FIXTURES_DIR / "sprint-14.json").read_text(encoding="utf-8")
    )
    fixture_parcel_ids = {row["id"] for row in fixture["parcelles"]}
    if parcel_id not in fixture_parcel_ids:
        raise ValueError(f"No Sprint 14 image fixture for parcel {parcel_id}")

    session_generator = get_db()
    db = next(session_generator)
    try:
        tracking = db.get(models.SuiviSatellite, parcel_id)
        zones = (
            [dict(zone) for zone in tracking.zones]
            if tracking is not None
            else [dict(zone) for zone in fixture["zones"]]
        )
        zones_by_id = {zone["id"]: zone for zone in zones}
        processed_image_ids = (
            list(tracking.processed_image_ids) if tracking is not None else []
        )
        processed_ids = set(processed_image_ids)
        latest_image_id = tracking.last_image_id if tracking is not None else None
        latest_image_at = tracking.last_image_at if tracking is not None else None
        updated_image = False

        for image in sorted(fixture["images"], key=lambda item: item["captured_at"]):
            if (
                image["id"] in processed_ids
                or not image["exploitable"]
                or image["cloud_cover_pct"]
                > fixture["thresholds"]["maximum_cloud_cover_pct"]
            ):
                continue
            processed_image_ids.append(image["id"])
            processed_ids.add(image["id"])
            if latest_image_at is None or image["captured_at"] >= latest_image_at:
                for reading in image["zones"]:
                    zone = zones_by_id[reading["zone_id"]]
                    zone["ndvi"] = reading["ndvi"]
                    zone["soil_moisture_pct"] = reading["soil_moisture_pct"]
                    zone["source"] = image["source"]
                latest_image_id = image["id"]
                latest_image_at = image["captured_at"]
                updated_image = True

        if tracking is None:
            tracking = models.SuiviSatellite(
                parcel_id=parcel_id,
                zones=zones,
                processed_image_ids=processed_image_ids,
                last_image_id=latest_image_id,
                last_image_at=latest_image_at,
                updated_at=datetime.now(timezone.utc).isoformat(),
            )
            db.add(tracking)
        else:
            tracking.zones = zones
            tracking.processed_image_ids = processed_image_ids
            tracking.last_image_id = latest_image_id
            tracking.last_image_at = latest_image_at
            if updated_image:
                tracking.updated_at = datetime.now(timezone.utc).isoformat()

        for alert_data in evaluate_sprint_14_alerts(fixture, zones):
            alert = db.get(models.Alerte, alert_data["id"])
            if alert is None:
                db.add(
                    models.Alerte(
                        id=alert_data["id"],
                        parcel_id=alert_data["parcel_id"],
                        type=alert_data["type"],
                        message=alert_data["message"],
                        severity=alert_data["severity"],
                        date=alert_data["date"],
                        read=False,
                    )
                )
            else:
                alert.message = alert_data["message"]
                alert.severity = alert_data["severity"]
        db.commit()
    finally:
        session_generator.close()


@app.get("/parcelles/{parcel_id}/suivi")
def parcel_suivi(
    parcel_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    if db.get(models.Parcelle, parcel_id) is None:
        raise HTTPException(404, "Parcel not found")

    fixture = json.loads(
        (FIXTURES_DIR / "sprint-14.json").read_text(encoding="utf-8")
    )
    if parcel_id not in {row["id"] for row in fixture["parcelles"]}:
        raise HTTPException(404, "Satellite monitoring is unavailable for this parcel")

    tracking = db.get(models.SuiviSatellite, parcel_id)
    zones = tracking.zones if tracking is not None else fixture["zones"]
    processed_image_ids = (
        set(tracking.processed_image_ids) if tracking is not None else set()
    )
    usable_images = [
        image
        for image in fixture["images"]
        if image["exploitable"]
        and image["cloud_cover_pct"]
        <= fixture["thresholds"]["maximum_cloud_cover_pct"]
    ]
    pending_image_count = sum(
        image["id"] not in processed_image_ids for image in usable_images
    )
    background_tasks.add_task(process_sprint_14_images, parcel_id)

    water_plan = fixture["water_plan"]
    actual_water_m3 = water_plan["actual_water_m3"]
    planned_water_m3 = water_plan["planned_water_m3"]
    return {
        "parcel_id": parcel_id,
        "zones": zones,
        "ndvi_monthly": fixture["ndvi_monthly"],
        "ndvi_source": fixture["ndvi_source"],
        "images": [
            {
                "id": image["id"],
                "captured_at": image["captured_at"],
                "source": image["source"],
                "cloud_cover_pct": image["cloud_cover_pct"],
                "exploitable": image["exploitable"],
            }
            for image in fixture["images"]
        ],
        "water_usage": {
            "planned_water_m3": planned_water_m3,
            "actual_water_m3": actual_water_m3,
            "excess_water_m3": round(
                max(0, actual_water_m3 - planned_water_m3), 2
            ),
            "usage_percent": round(actual_water_m3 / planned_water_m3 * 100, 1),
            "period_start": water_plan["period_start"],
            "period_end": water_plan["period_end"],
        },
        "rain_forecast": water_plan["forecast"],
        "alerts": evaluate_sprint_14_alerts(fixture, zones),
        "image_update": {
            "status": "queued" if pending_image_count else "up_to_date",
            "pending_images": pending_image_count,
            "expected_interval_days": fixture["thresholds"][
                "expected_image_interval_days"
            ],
            "last_image_id": tracking.last_image_id if tracking else None,
            "last_image_at": tracking.last_image_at if tracking else None,
        },
    }


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


@app.put("/cultures/{culture_id}/price")
def update_culture_price(
    culture_id: str,
    payload: CulturePriceUpdate,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    culture = db.get(models.Culture, culture_id)
    if culture is None:
        raise HTTPException(404, "Culture not found")
    detail = db.get(models.CultureDetail, culture_id)
    if detail is None:
        raise HTTPException(404, "Culture details not found")

    culture.price_tnd_t = payload.typical_tnd_t
    detail.price_range_tnd_t = {
        "min": payload.min_tnd_t,
        "typical": payload.typical_tnd_t,
        "max": payload.max_tnd_t,
    }
    detail.price_source = payload.source.strip()
    detail.price_updated_at = payload.effective_date.isoformat()
    db.commit()
    db.refresh(culture)
    db.refresh(detail)
    return culture_payload(culture, detail)


@app.get("/parcelles/{parcel_id}/recommandations")
def recommend_crops(
    parcel_id: str,
    tri: Literal["revenu_m3", "eau", "rapidite"] = Query(default="revenu_m3"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    calculation_started = perf_counter()
    parcel = db.get(models.Parcelle, parcel_id)
    if parcel is None:
        raise HTTPException(404, "Parcel not found")
    if parcel.well_depth_m is None:
        raise HTTPException(422, "Parcel needs well depth for energy recommendations")

    context, crops, intercrops, current_crop_id = recommendation_inputs(parcel, db)
    numeric_inputs = (
        "season_days",
        "et0_daily_mm",
        "effective_rain_mm",
        "available_water_m3",
        "soil_salinity_dS_m",
        "maximum_temperature_c",
        "rain_uncertainty_fraction",
        "energy_price_tnd_kwh",
        "irrigation_efficiency",
        "energy_efficiency",
        "safe_well_utilization",
    )
    if any(
        isinstance(context[key], bool)
        or not isinstance(context[key], (int, float))
        or not math.isfinite(context[key])
        for key in numeric_inputs
    ):
        raise HTTPException(422, "Recommendation inputs must be finite numbers")
    if (
        context["season_days"] <= 0
        or context["et0_daily_mm"] <= 0
        or context["effective_rain_mm"] < 0
        or context["available_water_m3"] < 0
        or context["soil_salinity_dS_m"] < 0
        or not 0 <= context["rain_uncertainty_fraction"] <= 1
        or context["energy_price_tnd_kwh"] < 0
        or not 0 < context["irrigation_efficiency"] <= 1
        or not 0 < context["energy_efficiency"] <= 1
        or not 0 <= context["safe_well_utilization"] < 1
    ):
        raise HTTPException(422, "Recommendation inputs are outside valid ranges")

    stage_weights = context.get("stage_weights", DEFAULT_STAGE_WEIGHTS)
    risk_weights = context["risk_weights"]
    if (
        not isinstance(stage_weights, dict)
        or any(stage not in stage_weights for stage in RECOMMENDATION_STAGES)
        or any(
            isinstance(stage_weights[stage], bool)
            or not isinstance(stage_weights[stage], (int, float))
            or not math.isfinite(stage_weights[stage])
            for stage in RECOMMENDATION_STAGES
        )
        or any(float(stage_weights[stage]) < 0 for stage in RECOMMENDATION_STAGES)
        or not math.isclose(
            sum(float(stage_weights[stage]) for stage in RECOMMENDATION_STAGES),
            1.0,
            abs_tol=0.001,
        )
        or not isinstance(risk_weights, dict)
        or any(key not in risk_weights for key in ("well", "rain"))
        or any(
            isinstance(risk_weights[key], bool)
            or not isinstance(risk_weights[key], (int, float))
            or not math.isfinite(risk_weights[key])
            for key in ("well", "rain")
        )
        or any(float(risk_weights[key]) < 0 for key in ("well", "rain"))
        or not math.isclose(
            sum(float(risk_weights[key]) for key in ("well", "rain")),
            1.0,
            abs_tol=0.001,
        )
    ):
        raise HTTPException(422, "Recommendation weights must be non-negative and sum to 1")

    cultures_by_id = {crop["id"]: crop for crop in crops}
    candidates = [*crops, *intercrops]
    recommendations = []
    excluded_crops = []
    evaluated_by_id = {}
    for candidate in candidates:
        result, reasons = calculate_recommendation(
            candidate, cultures_by_id, context, parcel
        )
        evaluated_by_id[candidate["id"]] = result
        if reasons:
            excluded_crops.append(
                {
                    "id": result["id"],
                    "name": result["name"],
                    "reasons": reasons,
                }
            )
        else:
            recommendations.append(result)

    if tri == "eau":
        recommendations.sort(
            key=lambda item: (
                item["water_m3_ha"],
                -item["risk_adjusted_revenue_dt_m3"],
                item["id"],
            )
        )
    elif tri == "rapidite":
        recommendations.sort(
            key=lambda item: (
                item["days_to_production"],
                -item["risk_adjusted_revenue_dt_m3"],
                item["id"],
            )
        )
    else:
        recommendations.sort(
            key=lambda item: (
                -item["risk_adjusted_revenue_dt_m3"],
                item["id"],
            )
        )

    current_crop_id = current_crop_id or parcel.current_crop_id
    current_crop = evaluated_by_id.get(current_crop_id)
    if current_crop is not None:
        current_crop = {
            **current_crop,
            "compatible": not current_crop["exclusion_reasons"],
        }
    best_revenue_crop = min(
        recommendations,
        key=lambda item: (-item["risk_adjusted_revenue_dt_m3"], item["id"]),
        default=None,
    )
    best_revenue = (
        best_revenue_crop["risk_adjusted_revenue_dt_m3"]
        if best_revenue_crop is not None
        else None
    )
    current_revenue = (
        current_crop["risk_adjusted_revenue_dt_m3"]
        if current_crop is not None
        else None
    )
    gap_to_best = (
        round(best_revenue - current_revenue, 2)
        if best_revenue is not None and current_revenue is not None
        else None
    )

    return {
        "parcel_id": parcel_id,
        "sort": tri,
        "available_water_m3": round(context["available_water_m3"], 2),
        "energy_kwh_m3": round(
            0.00272 * float(parcel.well_depth_m) / float(context["energy_efficiency"]),
            4,
        ),
        "calculation_time_ms": round(
            (perf_counter() - calculation_started) * 1000, 3
        ),
        "current_crop": current_crop,
        "best_crop_id": best_revenue_crop["id"] if best_revenue_crop else None,
        "top_crop_id": recommendations[0]["id"] if recommendations else None,
        "gap_to_best_dt_m3": gap_to_best,
        "excluded_count": len(excluded_crops),
        "excluded_crops": excluded_crops,
        "recommendations": recommendations,
        "assumptions": {
            "soil_texture": context["soil_texture"],
            "soil_salinity_dS_m": context["soil_salinity_dS_m"],
            "maximum_temperature_c": context["maximum_temperature_c"],
            "et0_daily_mm": context["et0_daily_mm"],
            "effective_rain_mm": context["effective_rain_mm"],
            "rain_uncertainty_fraction": context["rain_uncertainty_fraction"],
            "irrigation_method": context["irrigation_method"],
            "irrigation_efficiency": context["irrigation_efficiency"],
            "energy_efficiency": context["energy_efficiency"],
            "energy_price_tnd_kwh": context["energy_price_tnd_kwh"],
            "pump_flow_m3_h": parcel.pump_flow_m3_h,
            "pump_hours_per_day": context["pump_hours_per_day"],
            "season_days": context["season_days"],
            "safe_well_utilization": context["safe_well_utilization"],
            "risk_weights": risk_weights,
            "energy_formula": "0.00272 * well_depth_m / energy_efficiency",
            "water_formula": (
                "ETc = ET0 * sum(Kc_stage * stage_weight); "
                "irrigation = max(ETc - effective_rain, 0) / irrigation_efficiency; "
                "1 mm/ha = 10 m3"
            ),
            "revenue_formula": (
                "(yield * typical_price - typical_costs - energy_cost) / irrigation_m3"
            ),
            "risk_formula": (
                "net revenue * weighted well-utilization and uncertain-rain penalties"
            ),
            "stage_weights": stage_weights,
        },
    }


@app.get("/analyses")
def list_analyses(db: Session = Depends(get_db)):
    return db.query(models.Analyse).all()


@app.post("/parcelles/{parcel_id}/simulation")
def simulate_parcelle(
    parcel_id: str,
    payload: SimulationRequest,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    parcel = db.get(models.Parcelle, parcel_id)
    if parcel is None:
        raise HTTPException(404, "Parcel not found")
    context, crops, current_allocations = simulation_inputs(parcel, db)
    return calculate_plan_simulation(
        parcel,
        payload.allocations,
        crops,
        current_allocations,
        context,
    )


@app.post("/parcelles/{parcel_id}/plan")
def adopt_parcel_plan(
    parcel_id: str,
    payload: SimulationRequest,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    parcel = db.get(models.Parcelle, parcel_id)
    if parcel is None:
        raise HTTPException(404, "Parcel not found")
    context, crops, current_allocations = simulation_inputs(parcel, db)
    simulation = calculate_plan_simulation(
        parcel,
        payload.allocations,
        crops,
        current_allocations,
        context,
    )
    if simulation["surface_exceeded"]:
        raise HTTPException(
            422,
            detail={
                "message": "Allocated area exceeds parcel area",
                "allocated_area_ha": simulation["allocated_area_ha"],
                "parcel_area_ha": simulation["parcel_area_ha"],
                "surface_excess_ha": simulation["surface_excess_ha"],
            },
        )

    plan_id = f"plan-sprint-07-{parcel_id}"
    plan_data = {
        "sprint": "sprint-07",
        "allocations": [allocation.model_dump() for allocation in payload.allocations],
        "price_snapshot": {
            allocation.crop_id: {
                "price_tnd_t": next(
                    crop["price_tnd_t"]
                    for crop in crops
                    if crop["id"] == allocation.crop_id
                ),
                "price_range_tnd_t": next(
                    crop.get("price_range_tnd_t")
                    for crop in crops
                    if crop["id"] == allocation.crop_id
                ),
                "source": next(
                    crop.get("price_source")
                    for crop in crops
                    if crop["id"] == allocation.crop_id
                ),
                "effective_date": next(
                    crop.get("price_updated_at")
                    for crop in crops
                    if crop["id"] == allocation.crop_id
                ),
            }
            for allocation in payload.allocations
        },
        "simulation": simulation,
    }
    plan = db.get(models.Plan, plan_id)
    if plan is None:
        plan = models.Plan(id=plan_id, parcel_id=parcel_id, data=plan_data)
        db.add(plan)
    else:
        plan.data = plan_data
    db.commit()
    db.refresh(plan)
    return {"plan_id": plan.id, "status": "adopted", **simulation}


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
                "price_updated_at": detail.price_updated_at,
                "costs_tnd_ha": detail.costs_tnd_ha,
                "compatible_soils": detail.compatible_soils,
                "salt_tolerance_dS_m": detail.salt_tolerance_dS_m,
                "heat_tolerance_c": detail.heat_tolerance_c,
                "first_production_days": detail.first_production_days,
                "kc_source": detail.kc_source,
            }
        )
    return item


RECOMMENDATION_STAGES = ("initial", "development", "mid_season", "late_season")
DEFAULT_STAGE_WEIGHTS = {
    "initial": 0.15,
    "development": 0.25,
    "mid_season": 0.4,
    "late_season": 0.2,
}


def crop_water_requirement(
    crop: dict[str, Any], context: dict[str, Any]
) -> dict[str, float]:
    details = crop.get("details", crop)
    stage_weights = context.get("stage_weights", DEFAULT_STAGE_WEIGHTS)
    mean_kc = sum(
        float(details["kc_by_stage"][stage]) * float(stage_weights[stage])
        for stage in RECOMMENDATION_STAGES
    )
    crop_days = min(int(crop["duration_days"]), int(context["season_days"]))
    etc_mm = float(context["et0_daily_mm"]) * mean_kc * crop_days
    effective_rain_mm = (
        float(context["effective_rain_mm"]) * crop_days / context["season_days"]
    )
    water_m3_ha = (
        max(0.0, etc_mm - effective_rain_mm)
        / float(context["irrigation_efficiency"])
        * 10
    )
    return {
        "etc_mm": etc_mm,
        "effective_rain_mm": effective_rain_mm,
        "water_m3_ha": water_m3_ha,
    }


def recommendation_inputs(
    parcel: models.Parcelle, db: Session
) -> tuple[dict[str, Any], list[dict[str, Any]], list[dict[str, Any]], str | None]:
    sprint17 = json.loads(
        (FIXTURES_DIR / "sprint-17.json").read_text(encoding="utf-8")
    )
    scenario = next(
        (
            item
            for item in sprint17["parcel_conditions"]
            if item["parcel_id"] == parcel.id
        ),
        None,
    )
    if scenario is not None:
        if parcel.pump_flow_m3_h is None or parcel.well_depth_m is None:
            raise HTTPException(
                422, "Parcel needs well flow and depth for recommendations"
            )
        context = {
            **sprint17["analysis_context"],
            **scenario["analysis_context"],
        }
        water = sprint17["water"]
        context.update(
            {
                "season_days": water["season_days"],
                "pump_hours_per_day": water["pump_hours_per_day"],
                "available_water_m3": round(
                    parcel.pump_flow_m3_h
                    * water["pump_hours_per_day"]
                    * water["season_days"],
                    2,
                ),
                "energy_efficiency": water["eta"],
                "water_capacity_source": (
                    "pump_flow_m3_h * pump_hours_per_day * season_days"
                ),
            }
        )
        crops = []
        for culture_id in sprint17["ranking_culture_ids"]:
            culture = db.get(models.Culture, culture_id)
            detail = db.get(models.CultureDetail, culture_id)
            if culture is None or detail is None:
                raise HTTPException(
                    500, f"Sprint 17 ranking references unknown culture {culture_id}"
                )
            crops.append(culture_payload(culture, detail))
        return (
            context,
            crops,
            sprint17.get("intercrops", []),
            scenario.get("current_crop_id"),
        )

    sprint12 = json.loads(
        (FIXTURES_DIR / "sprint-12.json").read_text(encoding="utf-8")
    )
    scenario = next(
        (
            item
            for item in sprint12["parcel_conditions"]
            if item["parcel_id"] == parcel.id
        ),
        None,
    )
    if scenario is not None:
        if parcel.pump_flow_m3_h is None or parcel.well_depth_m is None:
            raise HTTPException(
                422, "Parcel needs well flow and depth for recommendations"
            )
        context = {
            **sprint12["analysis_context"],
            **scenario["analysis_context"],
        }
        water = sprint12["water"]
        context.update(
            {
                "season_days": water["season_days"],
                "pump_hours_per_day": water["pump_hours_per_day"],
                "available_water_m3": round(
                    parcel.pump_flow_m3_h
                    * water["pump_hours_per_day"]
                    * water["season_days"],
                    2,
                ),
                "energy_efficiency": water["eta"],
            }
        )
        return (
            context,
            sprint12["cultures"],
            sprint12.get("intercrops", []),
            scenario.get("current_crop_id", sprint12.get("current_crop_id")),
        )

    fixture = json.loads((FIXTURES_DIR / "sprint-06.json").read_text(encoding="utf-8"))
    fixture_parcel_ids = {row["id"] for row in fixture["parcelles"]}
    if parcel.id in fixture_parcel_ids:
        context = dict(fixture["analysis_context"])
        water = fixture["water"]
        if parcel.pump_flow_m3_h is None or parcel.well_depth_m is None:
            raise HTTPException(422, "Parcel needs well flow and depth for recommendations")
        context.update(
            {
                "season_days": water["season_days"],
                "pump_hours_per_day": water["pump_hours_per_day"],
                "available_water_m3": round(
                    parcel.pump_flow_m3_h
                    * water["pump_hours_per_day"]
                    * water["season_days"],
                    2,
                ),
                "energy_efficiency": water["eta"],
            }
        )
        return (
            context,
            fixture["cultures"],
            fixture.get("intercrops", []),
            fixture.get("current_crop_id"),
        )

    analysis = (
        db.query(models.Analyse)
        .filter(models.Analyse.parcel_id == parcel.id)
        .first()
    )
    if analysis is None:
        raise HTTPException(409, "Analyze the parcel before requesting recommendations")
    detail = db.get(models.AnalyseDetail, analysis.id)
    assumptions = detail.assumptions if detail is not None else {}
    context = {
        "soil_texture": analysis.soil_texture,
        "soil_salinity_dS_m": assumptions.get("soil_salinity_dS_m"),
        "maximum_temperature_c": assumptions.get("maximum_temperature_c"),
        "et0_daily_mm": analysis.et0_mm,
        "effective_rain_mm": assumptions.get("effective_rain_mm"),
        "rain_uncertainty_fraction": assumptions.get("rain_uncertainty_fraction"),
        "irrigation_method": assumptions.get("irrigation_method"),
        "irrigation_efficiency": assumptions.get("irrigation_efficiency"),
        "energy_efficiency": assumptions.get("efficiency"),
        "energy_price_tnd_kwh": assumptions.get("energy_price_tnd_kwh"),
        "season_days": assumptions.get("season_days"),
        "pump_hours_per_day": assumptions.get("pump_hours_per_day"),
        "available_water_m3": analysis.available_water_m3,
        "stage_weights": assumptions.get("stage_weights", DEFAULT_STAGE_WEIGHTS),
        "safe_well_utilization": assumptions.get("safe_well_utilization", 0.8),
        "risk_weights": assumptions.get(
            "risk_weights", {"well": 0.65, "rain": 0.35}
        ),
    }
    required = (
        "soil_salinity_dS_m",
        "maximum_temperature_c",
        "effective_rain_mm",
        "rain_uncertainty_fraction",
        "irrigation_method",
        "irrigation_efficiency",
        "energy_efficiency",
        "energy_price_tnd_kwh",
        "season_days",
        "pump_hours_per_day",
    )
    missing = [key for key in required if context[key] is None]
    if missing:
        raise HTTPException(
            422,
            "Analysis is missing recommendation inputs: " + ", ".join(missing),
        )
    crops = [
        culture_payload(culture, db.get(models.CultureDetail, culture.id))
        for culture in db.query(models.Culture).order_by(models.Culture.id).all()
    ]
    return context, crops, [], parcel.current_crop_id


def calculate_recommendation(
    candidate: dict[str, Any],
    cultures_by_id: dict[str, dict[str, Any]],
    context: dict[str, Any],
    parcel: models.Parcelle,
) -> tuple[dict[str, Any], list[str]]:
    components = candidate.get("components") or [
        {"crop_id": candidate["id"], "area_share": 1.0}
    ]
    etc_mm = 0.0
    effective_rain_mm = 0.0
    water_m3_ha = 0.0
    gross_revenue_tnd_ha = 0.0
    costs_tnd_ha = 0.0
    first_production_days = []
    exclusion_reasons: set[str] = set()
    soil_texture = context["soil_texture"].strip().lower().replace("-", "_")

    for component in components:
        crop = cultures_by_id.get(component["crop_id"])
        if crop is None:
            raise HTTPException(
                500,
                f"Recommendation fixture references unknown crop {component['crop_id']}",
            )
        details = crop.get("details", crop)
        share = float(component["area_share"])
        water_requirements = crop_water_requirement(crop, context)
        crop_etc_mm = water_requirements["etc_mm"]
        crop_rain_mm = water_requirements["effective_rain_mm"]
        crop_water_m3_ha = water_requirements["water_m3_ha"]
        costs = details["costs_tnd_ha"]
        typical_cost = costs["typical"] if isinstance(costs, dict) else costs

        etc_mm += share * crop_etc_mm
        effective_rain_mm += share * crop_rain_mm
        water_m3_ha += share * crop_water_m3_ha
        gross_revenue_tnd_ha += (
            share * float(crop["yield_t_ha"]) * float(crop["price_tnd_t"])
        )
        costs_tnd_ha += share * float(typical_cost)
        first_production_days.append(int(details["first_production_days"]))

        compatible_soils = {
            soil.strip().lower().replace("-", "_")
            for soil in details["compatible_soils"]
        }
        if soil_texture not in compatible_soils:
            exclusion_reasons.add("soil")
        if context["soil_salinity_dS_m"] > float(details["salt_tolerance_dS_m"]):
            exclusion_reasons.add("salinity")
        if context["maximum_temperature_c"] > float(details["heat_tolerance_c"]):
            exclusion_reasons.add("heat")

    total_water_m3 = water_m3_ha * parcel.area_ha
    if total_water_m3 > context["available_water_m3"]:
        exclusion_reasons.add("water")

    if context["available_water_m3"] > 0:
        well_utilization = total_water_m3 / context["available_water_m3"]
    else:
        well_utilization = 1.0
        exclusion_reasons.add("water")
    safe_utilization = float(context["safe_well_utilization"])
    well_risk = min(
        1.0,
        max(0.0, (well_utilization - safe_utilization) / (1 - safe_utilization)),
    )
    rain_dependency = min(1.0, effective_rain_mm / etc_mm) if etc_mm > 0 else 0.0
    rain_risk = rain_dependency * float(context["rain_uncertainty_fraction"])
    risk_weights = context["risk_weights"]
    risk_ratio = min(
        1.0,
        float(risk_weights["well"]) * well_risk
        + float(risk_weights["rain"]) * rain_risk,
    )

    energy_kwh_m3 = (
        0.00272 * float(parcel.well_depth_m) / float(context["energy_efficiency"])
    )
    energy_kwh_ha = water_m3_ha * energy_kwh_m3
    energy_cost_tnd_ha = energy_kwh_ha * float(context["energy_price_tnd_kwh"])
    revenue_dt_m3 = (
        gross_revenue_tnd_ha - costs_tnd_ha - energy_cost_tnd_ha
    ) / water_m3_ha if water_m3_ha > 0 else 0.0
    risk_penalty_dt_m3 = max(0.0, revenue_dt_m3) * risk_ratio
    risk_adjusted_revenue_dt_m3 = revenue_dt_m3 - risk_penalty_dt_m3

    if (
        risk_adjusted_revenue_dt_m3 >= 2.2
        and context["irrigation_method"] == "drip"
        and "water" not in exclusion_reasons
    ):
        label = "A"
    elif risk_adjusted_revenue_dt_m3 >= 1.5:
        label = "B"
    elif risk_adjusted_revenue_dt_m3 >= 1.1:
        label = "C"
    elif risk_adjusted_revenue_dt_m3 >= 0.8:
        label = "D"
    else:
        label = "E"

    name = candidate.get("name", {})
    if isinstance(name, dict):
        name = name.get("fr", candidate["id"])
    result = {
        "id": candidate["id"],
        "name": name,
        "water_m3_ha": round(water_m3_ha, 2),
        "total_water_m3": round(total_water_m3, 2),
        "energy_kwh_ha": round(energy_kwh_ha, 2),
        "days_to_production": min(first_production_days),
        "revenue_dt_m3": round(revenue_dt_m3, 2),
        "risk_penalty_dt_m3": round(risk_penalty_dt_m3, 2),
        "risk_adjusted_revenue_dt_m3": round(risk_adjusted_revenue_dt_m3, 2),
        "label": label,
        "risk": {
            "well_utilization": round(well_utilization, 4),
            "well_penalty": round(well_risk, 4),
            "rain_penalty": round(rain_risk, 4),
        },
        "exclusion_reasons": sorted(exclusion_reasons),
    }
    return result, sorted(exclusion_reasons)


def simulation_inputs(
    parcel: models.Parcelle, db: Session
) -> tuple[dict[str, Any], list[dict[str, Any]], list[dict[str, Any]]]:
    sprint17 = json.loads(
        (FIXTURES_DIR / "sprint-17.json").read_text(encoding="utf-8")
    )
    if any(
        row["parcel_id"] == parcel.id
        for row in sprint17["parcel_conditions"]
    ):
        context, crops, _, current_crop_id = recommendation_inputs(parcel, db)
        current_allocations = (
            [{"crop_id": current_crop_id, "area_ha": parcel.area_ha}]
            if current_crop_id
            else []
        )
        return context, crops, current_allocations

    fixture = json.loads((FIXTURES_DIR / "sprint-07.json").read_text(encoding="utf-8"))
    fixture_parcel_ids = {row["id"] for row in fixture["parcelles"]}
    if parcel.id in fixture_parcel_ids:
        if parcel.pump_flow_m3_h is None or parcel.well_depth_m is None:
            raise HTTPException(422, "Parcel needs well flow and depth for simulation")
        water = fixture["water"]
        context = {
            **fixture["analysis_context"],
            "season_days": water["season_days"],
            "available_water_m3": round(
                parcel.pump_flow_m3_h
                * water["pump_hours_per_day"]
                * water["season_days"],
                2,
            ),
            "pump_hours_per_day": water["pump_hours_per_day"],
            "water_capacity_source": "pump_flow_m3_h * pump_hours_per_day * season_days",
            "irrigation_method": water["irrigation_method"],
            "irrigation_efficiency": water["irrigation_efficiency"],
            "energy_efficiency": water["energy_efficiency"],
            "energy_price_tnd_kwh": water["energy_price_tnd_kwh"],
        }
        return (
            context,
            fixture["cultures"],
            fixture["current_situation"]["allocations"],
        )

    analysis = (
        db.query(models.Analyse)
        .filter(models.Analyse.parcel_id == parcel.id)
        .first()
    )
    if analysis is None:
        raise HTTPException(409, "Analyze the parcel before simulating a plan")
    if parcel.well_depth_m is None:
        raise HTTPException(422, "Parcel needs well depth for energy simulation")
    detail = db.get(models.AnalyseDetail, analysis.id)
    assumptions = detail.assumptions if detail is not None else {}
    season_days = assumptions.get("season_days", 180)
    climate_period_days = assumptions.get("climate_period_days") or 365
    context = {
        "et0_daily_mm": analysis.et0_mm,
        "effective_rain_mm": (
            analysis.rain_mm * min(season_days / climate_period_days, 1) * 0.75
        ),
        "season_days": season_days,
        "stage_weights": assumptions.get("stage_weights", DEFAULT_STAGE_WEIGHTS),
        "available_water_m3": analysis.available_water_m3,
        "pump_hours_per_day": assumptions.get("pump_hours_per_day"),
        "water_capacity_source": "available water from the latest parcel analysis",
        "irrigation_method": assumptions.get("irrigation_method", "drip"),
        "irrigation_efficiency": assumptions.get("irrigation_efficiency", 0.9),
        "energy_efficiency": assumptions.get("efficiency", 0.5),
        "energy_price_tnd_kwh": assumptions.get("energy_price_tnd_kwh", 0.3),
    }
    crops = [
        culture_payload(culture, db.get(models.CultureDetail, culture.id))
        for culture in db.query(models.Culture).order_by(models.Culture.id).all()
    ]
    current_allocations = (
        [{"crop_id": parcel.current_crop_id, "area_ha": parcel.area_ha}]
        if parcel.current_crop_id
        else []
    )
    return context, crops, current_allocations


def calculate_plan_simulation(
    parcel: models.Parcelle,
    allocations: list[SimulationAllocation],
    crops: list[dict[str, Any]],
    current_allocations: list[dict[str, Any]],
    context: dict[str, Any],
) -> dict[str, Any]:
    if parcel.well_depth_m is None:
        raise HTTPException(422, "Parcel needs well depth for energy simulation")
    numeric_inputs = (
        "season_days",
        "et0_daily_mm",
        "effective_rain_mm",
        "available_water_m3",
        "irrigation_efficiency",
        "energy_efficiency",
        "energy_price_tnd_kwh",
    )
    if any(
        isinstance(context[key], bool)
        or not isinstance(context[key], (int, float))
        or not math.isfinite(context[key])
        for key in numeric_inputs
    ):
        raise HTTPException(422, "Simulation inputs must be finite numbers")
    if (
        context["season_days"] <= 0
        or context["et0_daily_mm"] <= 0
        or context["effective_rain_mm"] < 0
        or context["available_water_m3"] < 0
        or not 0 < context["irrigation_efficiency"] <= 1
        or not 0 < context["energy_efficiency"] <= 1
        or context["energy_price_tnd_kwh"] < 0
    ):
        raise HTTPException(422, "Simulation inputs are outside valid ranges")
    stage_weights = context.get("stage_weights", DEFAULT_STAGE_WEIGHTS)
    if not isinstance(stage_weights, dict) or any(
        stage not in stage_weights for stage in RECOMMENDATION_STAGES
    ):
        raise HTTPException(422, "Kc stage weights are incomplete")
    if any(
        isinstance(stage_weights[stage], bool)
        or not isinstance(stage_weights[stage], (int, float))
        or not math.isfinite(stage_weights[stage])
        for stage in RECOMMENDATION_STAGES
    ):
        raise HTTPException(422, "Kc stage weights must be finite numbers")
    if (
        any(float(stage_weights[stage]) < 0 for stage in RECOMMENDATION_STAGES)
        or not math.isclose(
            sum(float(stage_weights[stage]) for stage in RECOMMENDATION_STAGES),
            1.0,
            abs_tol=0.001,
        )
    ):
        raise HTTPException(422, "Kc stage weights must sum to 1")

    cultures_by_id = {crop["id"]: crop for crop in crops}
    energy_kwh_m3 = (
        0.00272 * float(parcel.well_depth_m) / float(context["energy_efficiency"])
    )

    def summarize_plan(rows: list[dict[str, Any]]) -> dict[str, Any]:
        crop_results = []
        seen_crop_ids = set()
        allocated_area_ha = 0.0
        water_demand_m3 = 0.0
        energy_kwh = 0.0
        gross_revenue_tnd = 0.0
        production_cost_tnd = 0.0
        for row in rows:
            crop_id = row["crop_id"]
            if crop_id in seen_crop_ids:
                raise HTTPException(422, f"Crop {crop_id} is allocated more than once")
            seen_crop_ids.add(crop_id)
            crop = cultures_by_id.get(crop_id)
            if crop is None:
                raise HTTPException(422, f"Unknown proposed crop: {crop_id}")
            area_ha = float(row["area_ha"])
            details = crop.get("details", crop)
            water_requirements = crop_water_requirement(crop, context)
            water_per_ha_m3 = water_requirements["water_m3_ha"]
            water_m3 = water_per_ha_m3 * area_ha
            energy = water_m3 * energy_kwh_m3
            gross_revenue = float(crop["yield_t_ha"]) * float(crop["price_tnd_t"]) * area_ha
            costs = details["costs_tnd_ha"]
            typical_cost = costs["typical"] if isinstance(costs, dict) else costs
            production_cost = float(typical_cost) * area_ha
            energy_cost = energy * float(context["energy_price_tnd_kwh"])
            net_revenue = gross_revenue - production_cost - energy_cost
            name = crop.get("name", {})
            if isinstance(name, dict):
                name = name.get("fr", crop_id)

            allocated_area_ha += area_ha
            water_demand_m3 += water_m3
            energy_kwh += energy
            gross_revenue_tnd += gross_revenue
            production_cost_tnd += production_cost
            crop_results.append(
                {
                    "crop_id": crop_id,
                    "name": name,
                    "area_ha": round(area_ha, 4),
                    "water_m3": round(water_m3, 2),
                    "energy_kwh": round(energy, 2),
                    "gross_revenue_tnd": round(gross_revenue, 2),
                    "production_cost_tnd": round(production_cost, 2),
                    "energy_cost_tnd": round(energy_cost, 2),
                    "net_revenue_tnd": round(net_revenue, 2),
                }
            )

        energy_cost_tnd = energy_kwh * float(context["energy_price_tnd_kwh"])
        net_revenue_tnd = gross_revenue_tnd - production_cost_tnd - energy_cost_tnd
        revenue_dt_m3 = (
            net_revenue_tnd / water_demand_m3 if water_demand_m3 > 0 else 0.0
        )
        surface_excess_ha = max(0.0, allocated_area_ha - parcel.area_ha)
        water_excess_m3 = max(
            0.0, water_demand_m3 - float(context["available_water_m3"])
        )
        surface_exceeded = surface_excess_ha > 0.000001
        water_exceeded = water_excess_m3 > 0.01
        warnings = []
        if surface_exceeded:
            warnings.append(
                {
                    "code": "surface_exceeded",
                    "message": "Allocated area exceeds parcel area",
                }
            )
        if water_exceeded:
            warnings.append(
                {
                    "code": "water_capacity_exceeded",
                    "message": "Water demand exceeds well capacity",
                }
            )

        if surface_exceeded or water_exceeded:
            label = "E"
        elif (
            revenue_dt_m3 >= 2.2
            and context["irrigation_method"] == "drip"
        ):
            label = "A"
        elif revenue_dt_m3 >= 1.5:
            label = "B"
        elif revenue_dt_m3 >= 1.1:
            label = "C"
        elif revenue_dt_m3 >= 0.8:
            label = "D"
        else:
            label = "E"
        return {
            "allocated_area_ha": round(allocated_area_ha, 4),
            "surface_excess_ha": round(surface_excess_ha, 4),
            "surface_exceeded": surface_exceeded,
            "unallocated_area_ha": round(max(0.0, parcel.area_ha - allocated_area_ha), 4),
            "water_demand_m3": round(water_demand_m3, 2),
            "water_excess_m3": round(water_excess_m3, 2),
            "water_exceeded": water_exceeded,
            "energy_kwh": round(energy_kwh, 2),
            "gross_revenue_tnd": round(gross_revenue_tnd, 2),
            "production_cost_tnd": round(production_cost_tnd, 2),
            "energy_cost_tnd": round(energy_cost_tnd, 2),
            "net_revenue_tnd": round(net_revenue_tnd, 2),
            "revenue_dt_m3": round(revenue_dt_m3, 2),
            "label": label,
            "crop_results": crop_results,
            "warnings": warnings,
        }

    requested_rows = [allocation.model_dump() for allocation in allocations]
    proposed = summarize_plan(requested_rows)
    current = summarize_plan(current_allocations) if current_allocations else None
    comparison = None
    if current is not None:
        comparison = {
            "water_saved_m3": round(
                current["water_demand_m3"] - proposed["water_demand_m3"], 2
            ),
            "energy_saved_kwh": round(current["energy_kwh"] - proposed["energy_kwh"], 2),
            "net_revenue_delta_tnd": round(
                proposed["net_revenue_tnd"] - current["net_revenue_tnd"], 2
            ),
            "revenue_dt_m3_delta": round(
                proposed["revenue_dt_m3"] - current["revenue_dt_m3"], 2
            ),
            "current_label": current["label"],
            "proposed_label": proposed["label"],
        }

    return {
        "parcel_id": parcel.id,
        "parcel_area_ha": parcel.area_ha,
        "available_water_m3": round(float(context["available_water_m3"]), 2),
        **proposed,
        "allocations": requested_rows,
        "current_situation": current,
        "comparison": comparison,
        "assumptions": {
            "et0_daily_mm": context["et0_daily_mm"],
            "effective_rain_mm": context["effective_rain_mm"],
            "season_days": context["season_days"],
            "irrigation_method": context["irrigation_method"],
            "irrigation_efficiency": context["irrigation_efficiency"],
            "well_depth_m": parcel.well_depth_m,
            "energy_efficiency": context["energy_efficiency"],
            "energy_kwh_m3": round(energy_kwh_m3, 4),
            "energy_price_tnd_kwh": context["energy_price_tnd_kwh"],
            "pump_flow_m3_h": parcel.pump_flow_m3_h,
            "pump_hours_per_day": context.get("pump_hours_per_day"),
            "water_capacity_formula": context["water_capacity_source"],
            "water_formula": (
                "ETc = ET0 * sum(Kc_stage * stage_weight); "
                "irrigation = max(ETc - effective_rain, 0) / irrigation_efficiency; "
                "1 mm/ha = 10 m3"
            ),
            "stage_weights": stage_weights,
        },
    }


@app.get("/labels")
def list_labels(db: Session = Depends(get_db)):
    return db.query(models.Label).all()


def calculate_label_grade(plan: dict[str, Any]) -> str:
    revenue_dt_m3 = float(plan["revenue_dt_m3"])
    if revenue_dt_m3 < 0.8 or int(plan.get("repeated_well_overruns", 0)) > 0:
        return "E"

    water_conforms = (
        float(plan["water_demand_m3"]) <= float(plan["available_water_m3"])
        and plan.get("plan_compliant", False)
    )
    localized_irrigation = plan.get("irrigation_method") in {
        "drip",
        "localized",
        "micro_drip",
    }
    if (
        revenue_dt_m3 >= 2.2
        and plan.get("compatible", False)
        and localized_irrigation
        and water_conforms
    ):
        return "A"
    if revenue_dt_m3 >= 1.5:
        return "B"
    if revenue_dt_m3 >= 1.1:
        return "C"
    if revenue_dt_m3 >= 0.8:
        return "D"
    return "E"


@app.get("/labels/{qr_code}")
def public_label(qr_code: str, db: Session = Depends(get_db)):
    label = db.query(models.Label).filter(models.Label.qr_code == qr_code).first()
    if not label:
        raise HTTPException(404, "Label not found")
    if label.status != "active":
        if label.status == "suspended":
            raise HTTPException(
                409,
                detail={"message": "Label is suspended", "status": label.status},
            )
        raise HTTPException(409, "Label is not active")

    fixture8 = json.loads((FIXTURES_DIR / "sprint-08.json").read_text(encoding="utf-8"))
    fixture_label = next(
        (row for row in fixture8["labels"] if row["qr_code"] == qr_code), None
    )
    grade = (
        calculate_label_grade(fixture8["plan"]["current"])
        if fixture_label is not None
        else label.grade
    )
    parcel = db.get(models.Parcelle, label.parcel_id)
    owner = db.get(models.User, parcel.owner_id) if parcel is not None else None
    farm = None
    for fixture_name in (
        "sprint-01.json",
        "sprint-08.json",
        "sprint-10.json",
        "sprint-11.json",
        "sprint-12.json",
    ):
        fixture_data = json.loads(
            (FIXTURES_DIR / fixture_name).read_text(encoding="utf-8")
        )
        farms = [
            *fixture_data.get("farms", []),
            *([fixture_data["farm"]] if fixture_data.get("farm") else []),
        ]
        matching_farm = next(
            (item for item in farms if item.get("id") == label.farm_id), None
        )
        if matching_farm is not None:
            farm = matching_farm
            break
    if farm is None:
        farm = {
            "id": label.farm_id,
            "name": owner.name if owner is not None else label.farm_id,
            "owner_id": parcel.owner_id if parcel is not None else None,
        }

    product = (
        db.query(models.Produit)
        .filter(models.Produit.label_id == label.id)
        .first()
    )
    product_data = (
        {
            "id": product.id,
            "name": product.name,
            "category": product.category,
            "quantity_kg": product.quantity_kg,
            "price_tnd_kg": product.price_tnd_kg,
            "photo_url": product.photo_url,
        }
        if product is not None
        else None
    )
    if product_data is not None:
        for fixture_name in ("sprint-10.json", "sprint-11.json"):
            sprint_data = json.loads(
                (FIXTURES_DIR / fixture_name).read_text(encoding="utf-8")
            )
            public_details = next(
                (
                    details
                    for details in sprint_data.get("product_details", [])
                    if details["product_id"] == product.id
                ),
                None,
            )
            if public_details is not None:
                product_data.update(
                    {
                        key: value
                        for key, value in public_details.items()
                        if key != "product_id"
                    }
                )
                break
    verifications = (
        db.query(models.Verification)
        .filter(models.Verification.parcel_id == label.parcel_id)
        .all()
    )
    return {
        "id": label.id,
        "qr_code": label.qr_code,
        "grade": grade,
        "status": label.status,
        "farm": farm,
        "product": product_data,
        "verifications": [
            {
                "kind": verification.kind,
                "status": verification.status,
                "evidence": verification.evidence,
            }
            for verification in verifications
        ],
    }


def sprint_10_products() -> tuple[dict[str, Any], list[dict[str, Any]]]:
    fixture = json.loads((FIXTURES_DIR / "sprint-10.json").read_text(encoding="utf-8"))
    farms = {
        farm["id"]: farm
        for farm in [
            *fixture.get("farms", []),
            *([fixture["farm"]] if fixture.get("farm") else []),
        ]
    }
    labels = {label["id"]: label for label in fixture.get("labels", [])}
    details = {
        item["product_id"]: item
        for item in fixture.get("product_details", [])
    }
    products = []
    for product in fixture.get("products", []):
        label = labels.get(product["label_id"])
        farm = farms.get(product["farm_id"])
        item = {
            **product,
            "farm": farm,
            "label": (
                {
                    "id": label["id"],
                    "grade": label["grade"],
                    "status": label["status"],
                    "qr_code": label["qr_code"],
                }
                if label is not None
                else None
            ),
        }
        product_details = details.get(product["id"])
        if product_details is not None:
            item.update(
                {
                    key: value
                    for key, value in product_details.items()
                    if key != "product_id"
                }
            )
        products.append(item)
    return fixture, products


def order_payment_status(payment_method: str) -> str:
    return (
        "due_on_delivery"
        if payment_method == "cash_on_delivery"
        else "simulated"
    )


def serialize_order(order: models.Commande) -> dict[str, Any]:
    return {
        "id": order.id,
        "buyer_id": order.buyer_id,
        "product_id": order.product_id,
        "quantity_kg": order.quantity_kg,
        "status": order.status,
        "payment_method": order.payment_method,
        "payment_status": order.payment_status,
        "total_tnd": order.total_tnd,
        "counteroffer_price_tnd_kg": order.counteroffer_price_tnd_kg,
    }


def serialize_product(
    product: models.Produit,
    farm: dict[str, Any],
    label: models.Label | None,
) -> dict[str, Any]:
    return {
        "id": product.id,
        "farm_id": product.farm_id,
        "label_id": product.label_id,
        "name": product.name,
        "category": product.category,
        "quantity_kg": product.quantity_kg,
        "price_tnd_kg": product.price_tnd_kg,
        "photo_url": product.photo_url,
        "farm": farm,
        "label": (
            {
                "id": label.id,
                "grade": label.grade,
                "status": label.status,
                "qr_code": label.qr_code,
            }
            if label is not None
            else None
        ),
    }


@app.get("/produits")
def list_products(
    label: str | None = Query(default=None, max_length=80),
    category: str | None = Query(default=None, max_length=80),
    region: str | None = Query(default=None, max_length=80),
    db: Session = Depends(get_db),
):
    _, products = sprint_10_products()
    sprint11 = json.loads(
        (FIXTURES_DIR / "sprint-11.json").read_text(encoding="utf-8")
    )
    farm = sprint11["farm"]
    for product in (
        db.query(models.Produit)
        .filter(models.Produit.farm_id == farm["id"])
        .all()
    ):
        products.append(
            serialize_product(
                product,
                farm,
                db.get(models.Label, product.label_id),
            )
        )
    if label is not None:
        requested_label = label.strip().casefold()
        products = [
            product
            for product in products
            if product["label"] is not None
            and requested_label
            in {
                product["label"]["grade"].casefold(),
                product["label"]["status"].casefold(),
                product["label"]["id"].casefold(),
            }
        ]
    if category is not None:
        requested_category = category.strip().casefold()
        products = [
            product
            for product in products
            if product["category"].strip().casefold() == requested_category
        ]
    if region is not None:
        requested_region = region.strip().casefold()
        products = [
            product
            for product in products
            if product["farm"] is not None
            and product["farm"]["region"].strip().casefold() == requested_region
        ]
    return products


@app.post("/produits", status_code=201)
def publish_product(payload: ProductCreate, db: Session = Depends(get_db)):
    fixture = json.loads(
        (FIXTURES_DIR / "sprint-11.json").read_text(encoding="utf-8")
    )
    farm = fixture["farm"]
    active_label = next(
        (item for item in fixture["labels"] if item["status"] == "active"),
        None,
    )
    if active_label is None:
        raise HTTPException(409, "The Sprint 11 farm has no active label")

    farmer = db.get(models.User, farm["owner_id"])
    if farmer is None:
        raise HTTPException(404, "Sprint 11 farm owner not found")
    if farmer.role != "farmer":
        raise HTTPException(409, "Sprint 11 farm owner is not a farmer")

    label = db.get(models.Label, active_label["id"])
    if label is None or label.status != "active":
        raise HTTPException(409, "Sprint 11 label is not active")

    product = models.Produit(
        id=f"product-sprint-11-{uuid4().hex}",
        farm_id=farm["id"],
        label_id=label.id,
        name=payload.name,
        category=payload.category,
        quantity_kg=payload.quantity_kg,
        price_tnd_kg=payload.price_tnd_kg,
        photo_url=payload.photo_url,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return serialize_product(product, farm, label)


@app.get("/fermes/{farm_id}/prix-moyens")
def compare_farm_prices(farm_id: str, db: Session = Depends(get_db)):
    fixture = json.loads(
        (FIXTURES_DIR / "sprint-11.json").read_text(encoding="utf-8")
    )
    farm = fixture["farm"]
    if farm_id != farm["id"]:
        raise HTTPException(404, "Farm not found in Sprint 11")

    prices = [
        product.price_tnd_kg
        for product in db.query(models.Produit)
        .filter(models.Produit.farm_id == farm_id)
        .all()
        if (label := db.get(models.Label, product.label_id)) is not None
        and label.status == "active"
    ]
    if not prices:
        raise HTTPException(404, "No active labeled products found for this farm")

    farm_average = round(mean(prices), 2)
    market_average = fixture["market_benchmark"]["typical_price_tnd_kg"]
    return {
        "farm_id": farm_id,
        "product_count": len(prices),
        "farm_average_price_tnd_kg": farm_average,
        "market_typical_price_tnd_kg": market_average,
        "difference_tnd_kg": round(farm_average - market_average, 2),
    }


def build_buyer_impact_report(buyer_id: str, db: Session) -> dict[str, Any]:
    buyer = db.get(models.User, buyer_id)
    if buyer is None:
        raise HTTPException(404, "Buyer not found")
    if buyer.role not in {"buyer", "professional"}:
        raise HTTPException(403, "Only buyer accounts can view purchase impact")

    fixture = load_sprint_15_fixture()
    farms = {farm["id"]: farm for farm in fixture["farms"]}
    factors = {
        row["product_id"]: row for row in fixture["impact_factors"]
    }
    product_ids = set(factors)
    orders = (
        db.query(models.Commande)
        .filter(
            models.Commande.buyer_id == buyer_id,
            models.Commande.product_id.in_(product_ids),
            models.Commande.status != "cancelled",
        )
        .order_by(models.Commande.id)
        .all()
    )

    lines = []
    for order in orders:
        product = db.get(models.Produit, order.product_id)
        if product is None:
            raise HTTPException(409, "An impact order references a missing product")
        label = db.get(models.Label, product.label_id)
        farm = farms.get(product.farm_id)
        factor = factors.get(product.id)
        if label is None or farm is None or factor is None:
            raise HTTPException(409, "Sprint 15 purchase data is incomplete")

        quantity_kg = order.quantity_kg
        lines.append(
            {
                "order_id": order.id,
                "buyer_id": buyer_id,
                "product_id": product.id,
                "product_name": product.name,
                "quantity_kg": quantity_kg,
                "order_status": order.status,
                "order_type": (
                    "wholesale" if order.status.startswith("wholesale_") else "retail"
                ),
                "farm_id": farm["id"],
                "farm_name": farm["name"],
                "label_id": label.id,
                "label_grade": label.grade,
                "label_status": label.status,
                "water_supported_m3": round(
                    quantity_kg * factor["water_supported_m3_per_kg"], 2
                ),
                "energy_supported_kwh": round(
                    quantity_kg * factor["energy_supported_kwh_per_kg"], 2
                ),
            }
        )

    total_quantity = sum(line["quantity_kg"] for line in lines)
    label_a_quantity = sum(
        line["quantity_kg"]
        for line in lines
        if line["label_grade"] == "A" and line["label_status"] == "active"
    )
    return {
        "buyer_id": buyer.id,
        "buyer_name": buyer.name,
        "buyer_role": buyer.role,
        "order_count": len(lines),
        "wholesale_order_count": sum(
            line["order_type"] == "wholesale" for line in lines
        ),
        "total_quantity_kg": round(total_quantity, 2),
        "water_supported_m3": round(
            sum(line["water_supported_m3"] for line in lines), 2
        ),
        "energy_supported_kwh": round(
            sum(line["energy_supported_kwh"] for line in lines), 2
        ),
        "farms_count": len({line["farm_id"] for line in lines}),
        "label_a_share_percent": round(
            label_a_quantity / total_quantity * 100 if total_quantity else 0, 2
        ),
        "lines": lines,
    }


@app.get("/acheteurs/{buyer_id}/impact")
def buyer_impact(buyer_id: str, db: Session = Depends(get_db)):
    return build_buyer_impact_report(buyer_id, db)


@app.get("/acheteurs/{buyer_id}/impact/export")
def export_buyer_impact(buyer_id: str, db: Session = Depends(get_db)):
    report = build_buyer_impact_report(buyer_id, db)
    fieldnames = (
        "order_id",
        "buyer_id",
        "product_id",
        "product_name",
        "quantity_kg",
        "order_status",
        "order_type",
        "farm_id",
        "farm_name",
        "label_id",
        "label_grade",
        "label_status",
        "water_supported_m3",
        "energy_supported_kwh",
    )
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(report["lines"])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="impact-achats.csv"'},
    )


def serialize_wholesale_order(order: models.Commande) -> dict[str, Any]:
    return {**serialize_order(order), "order_type": "wholesale"}


@app.get("/commandes/gros")
def list_wholesale_orders(db: Session = Depends(get_db)):
    orders = (
        db.query(models.Commande)
        .filter(models.Commande.status.like("wholesale_%"))
        .order_by(models.Commande.id)
        .all()
    )
    return [serialize_wholesale_order(order) for order in orders]


@app.post("/commandes/gros", status_code=201)
def create_wholesale_order(
    payload: WholesaleOrderCreate, db: Session = Depends(get_db)
):
    fixture = load_sprint_15_fixture()
    product_data = next(
        (
            product
            for product in fixture["products"]
            if product["id"] == payload.product_id
        ),
        None,
    )
    if product_data is None:
        raise HTTPException(404, "Product not found in Sprint 15")

    buyer = db.get(models.User, payload.buyer_id)
    if buyer is None:
        raise HTTPException(404, "Buyer not found")
    if buyer.role != "professional":
        raise HTTPException(403, "Only professional accounts can place wholesale orders")

    product = db.get(models.Produit, payload.product_id)
    label = db.get(models.Label, product.label_id) if product is not None else None
    if product is None or label is None or label.status != "active":
        raise HTTPException(409, "Wholesale product must have an active label")
    if payload.quantity_kg > product.quantity_kg:
        raise HTTPException(422, "Quantity exceeds available product stock")

    order = models.Commande(
        id=f"order-sprint-15-wholesale-{uuid4().hex}",
        buyer_id=buyer.id,
        product_id=product.id,
        quantity_kg=payload.quantity_kg,
        status="wholesale_pending",
        payment_method=None,
        payment_status=None,
        total_tnd=None,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return serialize_wholesale_order(order)


@app.post("/commandes", status_code=201)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    fixture, _ = sprint_10_products()
    product = next(
        (item for item in fixture["products"] if item["id"] == payload.product_id),
        None,
    )
    if product is None:
        raise HTTPException(404, "Product not found in Sprint 10")
    label = next(
        (item for item in fixture["labels"] if item["id"] == product["label_id"]),
        None,
    )
    if label is None or label["status"] != "active":
        raise HTTPException(409, "Product label is not active")
    if payload.quantity_kg > product["quantity_kg"]:
        raise HTTPException(422, "Quantity exceeds available product stock")

    buyer = db.get(models.User, payload.buyer_id)
    if buyer is None:
        raise HTTPException(404, "Buyer not found")
    if buyer.role != "buyer":
        raise HTTPException(403, "Only buyer accounts can place this order")

    order = models.Commande(
        id=f"order-sprint-10-{uuid4().hex}",
        buyer_id=payload.buyer_id,
        product_id=payload.product_id,
        quantity_kg=payload.quantity_kg,
        status="pending",
        payment_method=payload.payment_method,
        payment_status=order_payment_status(payload.payment_method),
        total_tnd=round(payload.quantity_kg * product["price_tnd_kg"], 2),
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return serialize_order(order)


@app.patch("/commandes/{order_id}")
def update_order(
    order_id: str,
    payload: OrderPatch,
    db: Session = Depends(get_db),
):
    order = db.get(models.Commande, order_id)
    if order is None:
        raise HTTPException(404, "Order not found")

    product = db.get(models.Produit, order.product_id)
    sprint10 = json.loads(
        (FIXTURES_DIR / "sprint-10.json").read_text(encoding="utf-8")
    )
    sprint10_product_ids = {
        item["id"] for item in sprint10.get("products", [])
    }
    sprint11 = json.loads(
        (FIXTURES_DIR / "sprint-11.json").read_text(encoding="utf-8")
    )
    if product is None or (
        product.id not in sprint10_product_ids
        and product.farm_id != sprint11["farm"]["id"]
    ):
        raise HTTPException(404, "Order is outside the demo catalogs")
    if payload.quantity_kg is not None:
        if payload.quantity_kg > product.quantity_kg:
            raise HTTPException(422, "Quantity exceeds available product stock")
        order.quantity_kg = payload.quantity_kg
        order.total_tnd = round(
            payload.quantity_kg * product.price_tnd_kg, 2
        )
    if payload.payment_method is not None:
        order.payment_method = payload.payment_method
        order.payment_status = order_payment_status(payload.payment_method)
    if payload.status is not None:
        if (
            payload.status == "counteroffered"
            and order.counteroffer_price_tnd_kg is None
            and payload.counteroffer_price_tnd_kg is None
        ):
            raise HTTPException(422, "A counteroffer price is required")
        order.status = payload.status
        if (
            payload.status == "accepted"
            and order.counteroffer_price_tnd_kg is not None
        ):
            order.total_tnd = round(
                order.quantity_kg * order.counteroffer_price_tnd_kg, 2
            )
    if payload.counteroffer_price_tnd_kg is not None:
        order.counteroffer_price_tnd_kg = payload.counteroffer_price_tnd_kg
        order.status = "counteroffered"

    db.commit()
    db.refresh(order)
    return serialize_order(order)


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
    return [
        {
            "id": alert.id,
            "parcel_id": alert.parcel_id,
            "type": alert.type,
            "message": alert.message,
            "severity": alert.severity,
            "date": alert.date,
            "read": bool(alert.read),
        }
        for alert in db.query(models.Alerte).all()
    ]


@app.patch("/alertes/{alert_id}")
def mark_alert_read(
    alert_id: str,
    payload: AlertReadRequest,
    db: Session = Depends(get_db),
):
    alert = db.get(models.Alerte, alert_id)
    if alert is None:
        raise HTTPException(404, "Alert not found")
    alert.read = True
    db.commit()
    db.refresh(alert)
    return {
        "id": alert.id,
        "parcel_id": alert.parcel_id,
        "type": alert.type,
        "message": alert.message,
        "severity": alert.severity,
        "date": alert.date,
        "read": bool(alert.read),
    }
