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
