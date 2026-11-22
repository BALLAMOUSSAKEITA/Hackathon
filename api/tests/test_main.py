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
