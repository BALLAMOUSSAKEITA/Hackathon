import os
from uuid import uuid4

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
