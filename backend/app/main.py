import json
import math
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from statistics import mean
from typing import Any, Literal
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
            "sprint-06.json",
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
    description="API FastAPI Ardi, sprints de demonstration 1 a 6.",
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


@app.get("/fixture/sprint-06")
def sprint_06_fixture() -> dict[str, Any]:
    return json.loads((FIXTURES_DIR / "sprint-06.json").read_text(encoding="utf-8"))


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


@app.get("/parcelles/{parcel_id}/recommandations")
def recommend_crops(
    parcel_id: str,
    tri: Literal["revenu_m3", "eau", "rapidite"] = Query(default="revenu_m3"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
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


RECOMMENDATION_STAGES = ("initial", "development", "mid_season", "late_season")
DEFAULT_STAGE_WEIGHTS = {
    "initial": 0.15,
    "development": 0.25,
    "mid_season": 0.4,
    "late_season": 0.2,
}


def recommendation_inputs(
    parcel: models.Parcelle, db: Session
) -> tuple[dict[str, Any], list[dict[str, Any]], list[dict[str, Any]], str | None]:
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
    season_days = context["season_days"]
    stage_weights = context.get("stage_weights", DEFAULT_STAGE_WEIGHTS)

    for component in components:
        crop = cultures_by_id.get(component["crop_id"])
        if crop is None:
            raise HTTPException(
                500,
                f"Recommendation fixture references unknown crop {component['crop_id']}",
            )
        details = crop.get("details", crop)
        share = float(component["area_share"])
        kc_by_stage = details["kc_by_stage"]
        mean_kc = sum(
            float(kc_by_stage[stage]) * float(stage_weights[stage])
            for stage in RECOMMENDATION_STAGES
        )
        crop_days = min(int(crop["duration_days"]), int(season_days))
        crop_etc_mm = float(context["et0_daily_mm"]) * mean_kc * crop_days
        crop_rain_mm = float(context["effective_rain_mm"]) * crop_days / season_days
        crop_water_m3_ha = (
            max(0.0, crop_etc_mm - crop_rain_mm)
            / float(context["irrigation_efficiency"])
            * 10
        )
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
