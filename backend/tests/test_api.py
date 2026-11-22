import os
from uuid import uuid4

os.environ["DATABASE_URL"] = "sqlite:///./test-ardi.db"

from fastapi.testclient import TestClient

from app.database import Base, engine
from app import main as main_module
from app.main import app


Base.metadata.create_all(bind=engine)


def test_health():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


def test_fixture_demo_loaded():
    with TestClient(app) as client:
        response = client.get("/parcelles")
        assert response.status_code == 200
        assert any(p["id"] == "parcel-demo" for p in response.json())


def test_public_active_label():
    with TestClient(app) as client:
        response = client.get("/labels/ARDI-DEMO-001")
        assert response.status_code == 200
        assert response.json()["grade"] == "B"


def test_sprint_02_fixture_has_all_demo_roles():
    with TestClient(app) as client:
        response = client.get("/fixture/sprint-02")
        assert response.status_code == 200
        profiles = response.json()["profiles"]
        assert {profile["role"] for profile in profiles} == {
            "farmer",
            "buyer",
            "professional",
        }
        seeded_user_ids = {user["id"] for user in client.get("/users").json()}
        assert {profile["id"] for profile in profiles} <= seeded_user_ids


def test_otp_verification_creates_user():
    phone = f"+216{uuid4().int % 100_000_000:08d}"
    with TestClient(app) as client:
        otp = client.post("/auth/otp", json={"phone": phone})
        assert otp.status_code == 200
        assert otp.json()["demo_code"] == "123456"

        response = client.post(
            "/auth/verify",
            json={
                "phone": phone,
                "code": otp.json()["demo_code"],
                "name": "Demo user",
                "role": "buyer",
                "language": "ar",
            },
        )
        assert response.status_code == 201
        assert response.json()["phone"] == phone
        assert response.json()["role"] == "buyer"
        assert response.json()["language"] == "ar"


def test_otp_verification_rejects_wrong_code():
    phone = f"+216{uuid4().int % 100_000_000:08d}"
    with TestClient(app) as client:
        client.post("/auth/otp", json={"phone": phone})
        response = client.post(
            "/auth/verify",
            json={
                "phone": phone,
                "code": "000000",
                "name": "Demo user",
                "role": "farmer",
                "language": "fr",
            },
        )
        assert response.status_code == 400


def test_otp_verification_requires_requested_code():
    phone = f"+216{uuid4().int % 100_000_000:08d}"
    with TestClient(app) as client:
        response = client.post(
            "/auth/verify",
            json={
                "phone": phone,
                "code": "123456",
                "name": "Demo user",
                "role": "farmer",
                "language": "fr",
            },
        )
        assert response.status_code == 400


def test_otp_verification_rejects_unknown_role():
    phone = f"+216{uuid4().int % 100_000_000:08d}"
    with TestClient(app) as client:
        client.post("/auth/otp", json={"phone": phone})
        response = client.post(
            "/auth/verify",
            json={
                "phone": phone,
                "code": "123456",
                "name": "Demo user",
                "role": "administrator",
                "language": "fr",
            },
        )
        assert response.status_code == 422


def test_sprint_03_has_complete_culture_records():
    required_crops = {
        "olive",
        "pistachio",
        "pomegranate",
        "prickly-pear",
        "date-palm",
        "onion",
        "tomato",
        "watermelon",
        "barley",
        "capers",
        "crop-wheat",
        "chickpea",
        "pepper",
        "grape",
        "fig",
    }
    with TestClient(app) as client:
        fixture = client.get("/fixture/sprint-03")
        response = client.get("/cultures")
        assert fixture.status_code == 200
        assert response.status_code == 200
        cultures = response.json()
        assert {culture["id"] for culture in cultures} == required_crops
        for culture in cultures:
            assert {"fr", "ar", "darija"} <= culture["name"].keys()
            assert culture["water_need_mm"] > 0
            assert culture["first_production_days"] > 0
            assert culture["salt_tolerance_dS_m"] > 0
            assert culture["heat_tolerance_c"] > 0
            assert {"initial", "development", "mid_season", "late_season"} <= culture[
                "kc_by_stage"
            ].keys()
            for ranges in (
                culture["yield_range_t_ha"],
                culture["price_range_tnd_t"],
                culture["costs_tnd_ha"],
            ):
                assert ranges["min"] <= ranges["typical"] <= ranges["max"]
            assert culture["yield_range_t_ha"]["typical"] == culture["yield_t_ha"]
            assert culture["price_range_tnd_t"]["typical"] == culture["price_tnd_t"]
            assert culture["compatible_soils"]
            assert culture["price_source"]
            assert culture["kc_source"]


def test_cultures_can_be_filtered_by_compatible_soil():
    with TestClient(app) as client:
        response = client.get("/cultures?soil=sandy")
        assert response.status_code == 200
        cultures = response.json()
        assert cultures
        assert all("sandy" in culture["compatible_soils"] for culture in cultures)
        assert len(cultures) < len(client.get("/cultures").json())


def test_culture_detail_endpoint():
    with TestClient(app) as client:
        response = client.get("/cultures/olive")
        assert response.status_code == 200
        assert response.json()["name"]["fr"] == "Olivier"


def test_sprint_04_parcel_post_recalculates_area():
    with TestClient(app) as client:
        fixture = client.get("/fixture/sprint-04").json()
        parcel = fixture["parcelles"][0]
        parcel["id"] = f"parcel-test-{uuid4()}"
        parcel["area_ha"] = 99

        response = client.post("/parcelles", json=parcel)

        assert response.status_code == 201
        assert response.json()["area_ha"] == 2.4
        assert response.json()["area_ha"] != 99


def test_parcel_post_rejects_self_intersecting_polygon():
    payload = {
        "id": f"parcel-test-{uuid4()}",
        "owner_id": "user-demo",
        "name": "Invalid polygon",
        "area_ha": 1,
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [9.48, 35.0286],
                    [9.482, 35.03],
                    [9.48, 35.03],
                    [9.482, 35.0286],
                    [9.48, 35.0286],
                ]
            ],
        },
        "water_source": "well",
        "well_depth_m": 60,
        "pump_flow_m3_h": 18,
        "energy_type": "solar",
        "current_crop_id": "crop-wheat",
    }
    with TestClient(app) as client:
        response = client.post("/parcelles", json=payload)
        assert response.status_code == 422


def test_parcel_post_rejects_non_polygon_geometry():
    payload = {
        "id": f"parcel-test-{uuid4()}",
        "owner_id": "user-demo",
        "name": "Not a polygon",
        "area_ha": 1,
        "geometry": {"type": "Point", "coordinates": [9.48, 35.0286]},
        "water_source": "well",
        "energy_type": "solar",
    }
    with TestClient(app) as client:
        response = client.post("/parcelles", json=payload)
        assert response.status_code == 422


def test_parcel_post_requires_existing_owner():
    payload = {
        "id": f"parcel-test-{uuid4()}",
        "owner_id": "unknown-user",
        "name": "Unknown owner",
        "area_ha": 1,
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [9.48, 35.0286],
                    [9.481, 35.0286],
                    [9.481, 35.0296],
                    [9.48, 35.0296],
                    [9.48, 35.0286],
                ]
            ],
        },
        "water_source": "well",
        "energy_type": "solar",
    }
    with TestClient(app) as client:
        response = client.post("/parcelles", json=payload)
        assert response.status_code == 404


def test_sprint_05_analysis_uses_fixture_and_calculates_water_and_energy():
    with TestClient(app) as client:
        fixture = client.get("/fixture/sprint-05")
        response = client.post("/parcelles/parcel-sprint-05/analyse")

        assert fixture.status_code == 200
        assert response.status_code == 200
        analysis = response.json()
        assert analysis["soil_texture"] == "loam"
        assert analysis["ph"] == 7.4
        assert analysis["available_water_m3"] == 19_440
        assert analysis["pumping_energy_kwh_m3"] == 0.3264
        assert analysis["solar_irradiance_kwh_m2_day"] == 5.4
        assert len(analysis["ndvi_monthly"]) == 12
        assert analysis["sources"]["soil"].startswith("SoilGrids")
        assert analysis["sources"]["climate"].startswith("Open-Meteo")


def test_analysis_request_can_override_water_assumptions():
    with TestClient(app) as client:
        response = client.post(
            "/parcelles/parcel-sprint-05/analyse",
            json={
                "pump_hours_per_day": 4,
                "season_days": 90,
                "efficiency": 0.4,
            },
        )
        assert response.status_code == 200
        assert response.json()["available_water_m3"] == 6_480
        assert response.json()["pumping_energy_kwh_m3"] == 0.408


def test_analysis_returns_not_found_for_unknown_parcel():
    with TestClient(app) as client:
        response = client.post("/parcelles/missing-parcel/analyse")
        assert response.status_code == 404


def test_external_analysis_sources_are_cached(monkeypatch):
    calls = []

    def fake_fetch_json(source, url, params):
        calls.append(source)
        if source == "SoilGrids":
            values = {"phh2o": 74, "soc": 10, "sand": 400, "clay": 200}
            return {
                "properties": {
                    "layers": [
                        {
                            "name": name,
                            "depths": [{"label": "0-5cm", "values": {"mean": value}}],
                        }
                        for name, value in values.items()
                    ]
                }
            }
        if source == "Open-Meteo":
            return {
                "daily": {
                    "precipitation_sum": [1, 2],
                    "temperature_2m_mean": [20, 22],
                    "et0_fao_evapotranspiration": [4, 5],
                }
            }
        return {
            "properties": {
                "parameter": {"ALLSKY_SFC_SW_DWN": {"ANN": 5.4}}
            }
        }

    monkeypatch.setattr(main_module, "fetch_json", fake_fetch_json)
    cached_fetchers = (
        main_module.fetch_soilgrids,
        main_module.fetch_open_meteo,
        main_module.fetch_nasa_power,
    )
    for fetcher in cached_fetchers:
        fetcher.cache_clear()
    try:
        assert main_module.fetch_soilgrids(35.0, 9.0) == main_module.fetch_soilgrids(
            35.0, 9.0
        )
        assert main_module.fetch_open_meteo(
            35.0, 9.0, "2025-11-01", "2026-10-31"
        ) == main_module.fetch_open_meteo(35.0, 9.0, "2025-11-01", "2026-10-31")
        assert main_module.fetch_nasa_power(35.0, 9.0) == main_module.fetch_nasa_power(
            35.0, 9.0
        )
        assert calls == ["SoilGrids", "Open-Meteo", "NASA POWER"]
    finally:
        for fetcher in cached_fetchers:
            fetcher.cache_clear()
