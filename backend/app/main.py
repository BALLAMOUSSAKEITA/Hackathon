import json
import math
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from statistics import mean
from typing import Any
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx
from pyproj import Geod
from shapely.errors import GEOSException
from shapely.geometry import shape
from shapely.geometry.polygon import orient
from shapely.validation import explain_validity
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from . import models
from .schemas import (
    AnalyseRequest,
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
    db = next(get_db())
    try:
        for fixture_name in (
            "sprint-01.json",
            "sprint-02.json",
            "sprint-03.json",
            "sprint-04.json",
            "sprint-05.json",
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
    description="API FastAPI Ardi, sprints de demonstration 1 a 5.",
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


@app.get("/fixture/sprint-05")
def sprint_05_fixture() -> dict[str, Any]:
    return json.loads((FIXTURES_DIR / "sprint-05.json").read_text(encoding="utf-8"))


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
