"""Vérifie l'analyse du sprint 5 : 60 m et η = 0,5 donnent environ 0,33 kWh/m³."""

import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.analyse import kwh_par_m3
from app.main import app

FIXTURE = json.loads((Path(__file__).resolve().parents[1] / "fixtures" / "sprint-05.json").read_text(encoding="utf-8"))


def main() -> None:
    assert kwh_par_m3(60, 0.5) == 0.33
    assert kwh_par_m3(30, 0.5) == 0.16

    with TestClient(app) as client:
        inconnu = client.post("/parcelles/parc-inconnue/analyse")
        assert inconnu.status_code == 404, inconnu.text

        reponse = client.post("/parcelles/parc-05/analyse")
        assert reponse.status_code == 200, reponse.text
        corps = reponse.json()
        assert corps["kwh_m3"] == 0.33
        assert corps["profondeur_puits_m"] == 60
        assert corps["eta"] == 0.5
        assert corps["eau_disponible_m3"] == 8 * 6 * 120
        assert len(corps["ndvi"]) == 12
        assert all(point["valeur"] is not None and point["mois"]["fr"] for point in corps["ndvi"])
        assert corps["source_ndvi"]
        for bloc in ("sol", "climat", "ensoleillement"):
            assert corps[bloc]["source"]
            assert corps[bloc]["fige"] in (True, False)
        for langue in ("fr", "ar", "darija"):
            assert corps["sol"]["texture"][langue]
        assert corps["sol"]["ph"] > 0
        assert corps["climat"]["pluie_mm"] >= 0
        assert 3 < corps["ensoleillement"]["kwh_m2_jour"] < 9

        encore = client.post("/parcelles/parc-05/analyse")
        assert encore.status_code == 200, encore.text
        if not corps["sol"]["fige"] and not corps["climat"]["fige"] and not corps["ensoleillement"]["fige"]:
            assert encore.json()["cache"] is True

        autre = FIXTURE["parcelle"]["geometrie"]
        cree = client.post(
            "/parcelles",
            json={
                "id": "parc-kwh30",
                "nom": "Puits peu profond",
                "geometrie": autre,
                "source_eau": "puits",
                "profondeur_puits_m": 30,
                "debit_m3_h": 8,
                "energie": "gasoil",
                "culture_actuelle": "tomate",
            },
        )
        assert cree.status_code == 200, cree.text
        bas = client.post("/parcelles/parc-kwh30/analyse")
        assert bas.status_code == 200, bas.text
        assert bas.json()["kwh_m3"] == 0.16

    print(
        "Sprint 5 API ok",
        corps["kwh_m3"],
        "fige",
        corps["sol"]["fige"],
        corps["climat"]["fige"],
        corps["ensoleillement"]["fige"],
    )


if __name__ == "__main__":
    main()
