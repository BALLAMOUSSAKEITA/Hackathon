import os

os.environ["DATABASE_URL"] = "sqlite:///./test-ardi.db"

from fastapi.testclient import TestClient

from app.database import Base, engine
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
