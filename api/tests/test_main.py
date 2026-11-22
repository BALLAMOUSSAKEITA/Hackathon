from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "ardi-api", "sprint": 1}


def test_demo_uses_sprint_fixture() -> None:
    response = client.get("/demo")
    assert response.status_code == 200
    payload = response.json()
    assert payload["sprint"] == 1
    assert payload["parcelle"]["surface_hectares"] == 3.7
    assert payload["well"]["depth_m"] == 60


def test_rejects_open_polygon() -> None:
    response = client.post(
        "/parcelles",
        json={
            "owner_id": "usr-demo",
            "name": "Test",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[10.1, 36.8], [10.2, 36.8], [10.2, 36.9]]],
            },
            "water_source": "puits",
            "well_depth_m": 60,
            "pump_flow_m3_h": 12,
            "current_crop": "tomate",
            "energy": "solaire",
        },
    )
    assert response.status_code == 422


def test_sprint_two_demo_has_three_profiles() -> None:
    response = client.get("/demo/sprint-02")
    assert response.status_code == 200
    payload = response.json()
    assert payload["sprint"] == 2
    assert len(payload["profiles"]) == 3
    assert payload["demo_otp"] == "123456"


def test_demo_otp_accepts_known_role_and_creates_account() -> None:
    otp = client.post(
        "/auth/otp",
        json={
            "phone": "+21600000010",
            "role": "agriculteur",
            "name": "Test Ardi",
            "language": "darija",
        },
    )
    assert otp.status_code == 200
    assert otp.json()["code"] == "123456"

    verify = client.post(
        "/auth/verify",
        json={"phone": "+21600000010", "code": "123456"},
    )
    assert verify.status_code == 200
    assert verify.json()["role"] == "agriculteur"
    assert verify.json()["language"] == "darija"


def test_unknown_role_is_rejected() -> None:
    response = client.post(
        "/auth/otp",
        json={
            "phone": "+21600000011",
            "role": "administrateur",
            "name": "Test",
            "language": "fr",
        },
    )
    assert response.status_code == 422


def test_sprint_three_returns_15_complete_cultures() -> None:
    response = client.get("/cultures")
    assert response.status_code == 200
    payload = response.json()
    assert payload["count"] == 15
    for culture in payload["cultures"]:
        assert set(culture["names"]) == {"fr", "ar", "darija"}
        assert culture["kc"]
        assert culture["yield_t_ha"] > 0
        assert culture["price"]["min"] <= culture["price"]["typical"] <= culture["price"]["max"]
        assert culture["price"]["source"]
        assert culture["costs_tnd_ha"] > 0
        assert culture["soils"]
        assert culture["duration_months"] > 0


def test_sprint_three_filters_by_compatible_soil() -> None:
    response = client.get("/cultures", params={"sol": "argileux"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["count"] > 0
    assert all("argileux" in culture["soils"] for culture in payload["cultures"])


def test_sprint_four_fixture_and_api_surface_are_consistent() -> None:
    fixture = client.get("/demo/sprint-04")
    assert fixture.status_code == 200
    parcel = fixture.json()["parcelle"]

    response = client.post(
        "/parcelles",
        json={
            "owner_id": parcel["owner_id"],
            "name": parcel["name"],
            "geometry": parcel["geometry"],
            "water_source": parcel["water_source"],
            "well_depth_m": parcel["well_depth_m"],
            "pump_flow_m3_h": parcel["pump_flow_m3_h"],
            "current_crop": parcel["current_crop"],
            "energy": parcel["energy"],
        },
    )
    assert response.status_code == 201
    assert response.json()["surface_hectares"] == parcel["surface_hectares"]
