"""Vérifie la connexion simulée du sprint 2."""

from fastapi.testclient import TestClient

from app.main import app


def main() -> None:
    with TestClient(app) as client:
        otp = client.post("/auth/otp", json={"telephone": "+21620000002"})
        assert otp.status_code == 200, otp.text
        assert otp.json()["code"] == "0000"

        mauvais_role = client.post(
            "/auth/verify",
            json={
                "telephone": "+21620000002",
                "code": "0000",
                "role": "ministre",
                "langue": "fr",
            },
        )
        assert mauvais_role.status_code == 422, mauvais_role.text

        client.post("/auth/otp", json={"telephone": "+21620000002"})
        mauvais_code = client.post(
            "/auth/verify",
            json={
                "telephone": "+21620000002",
                "code": "9999",
                "role": "acheteur",
                "langue": "ar",
            },
        )
        assert mauvais_code.status_code == 401, mauvais_code.text

        client.post("/auth/otp", json={"telephone": "+21620000002"})
        ok = client.post(
            "/auth/verify",
            json={
                "telephone": "+21620000002",
                "code": "0000",
                "role": "acheteur",
                "langue": "ar",
            },
        )
        assert ok.status_code == 200, ok.text
        corps = ok.json()
        assert corps["utilisateur"]["nom"] == "Amira Trabelsi"
        assert corps["utilisateur"]["role"] == "acheteur"
        assert corps["utilisateur"]["langue"] == "ar"
        assert corps["token"].startswith("demo-")

    print("Sprint 2 API ok")


if __name__ == "__main__":
    main()
