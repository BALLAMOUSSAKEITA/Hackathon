"""Vérifie la parcelle du sprint 4 : surface recalculée, polygone rejeté, propriétaire du fichier."""

import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.surface import surface_hectares

FIXTURE = json.loads((Path(__file__).resolve().parents[1] / "fixtures" / "sprint-04.json").read_text(encoding="utf-8"))
PHOTO = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


def _corps(**remplace):
    parcelle = FIXTURE["parcelle"]
    corps = {
        "id": parcelle["id"],
        "nom": parcelle["nom"],
        "geometrie": parcelle["geometrie"],
        "surface_ha": 99,
        "source_eau": parcelle["source_eau"],
        "profondeur_puits_m": parcelle["profondeur_puits_m"],
        "debit_m3_h": parcelle["debit_m3_h"],
        "energie": parcelle["energie"],
        "culture_actuelle": parcelle["culture_actuelle"],
    }
    corps.update(remplace)
    return corps


def main() -> None:
    attendue = surface_hectares(FIXTURE["parcelle"]["geometrie"])
    assert 2 < attendue < 3

    with TestClient(app) as client:
        reponse = client.post("/parcelles", json=_corps(photo_sol=PHOTO))
        assert reponse.status_code == 200, reponse.text
        corps = reponse.json()
        assert corps["surface_ha"] == attendue
        assert corps["surface_ha"] != 99
        assert corps["proprietaire_id"] == FIXTURE["proprietaire"]["id"]
        assert corps["photo_sol"] == "parc-04.img"

        relue = client.get("/parcelles/parc-04")
        assert relue.status_code == 200, relue.text
        assert relue.json()["surface_ha"] == corps["surface_ha"]

        sans_photo = client.post("/parcelles", json=_corps(photo_sol="pas-une-image"))
        assert sans_photo.status_code == 200, sans_photo.text
        assert sans_photo.json()["photo_sol"] is None
        assert sans_photo.json()["surface_ha"] == attendue

        ouvert = client.post(
            "/parcelles",
            json=_corps(
                geometrie={
                    "type": "Polygon",
                    "coordinates": [[[9.48, 35.03], [9.49, 35.03], [9.49, 35.04], [9.485, 35.035]]],
                }
            ),
        )
        assert ouvert.status_code == 422, ouvert.text

        croise = client.post(
            "/parcelles",
            json=_corps(
                geometrie={
                    "type": "Polygon",
                    "coordinates": [[[0, 0], [1, 1], [0, 1], [1, 0], [0, 0]]],
                }
            ),
        )
        assert croise.status_code == 422, croise.text

        energie = client.post("/parcelles", json=_corps(energie="charbon"))
        assert energie.status_code == 422, energie.text

        inconnu = client.get("/parcelles/parc-inexistante")
        assert inconnu.status_code == 404

    print("Sprint 4 API ok", attendue)


if __name__ == "__main__":
    main()
