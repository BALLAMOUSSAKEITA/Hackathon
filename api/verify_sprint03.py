"""Vérifie les 15 cultures du sprint 3."""

from fastapi.testclient import TestClient

from app.main import app

ATTENDUES = {
    "olivier",
    "pistachier",
    "grenadier",
    "figuier_barbarie",
    "palmier_dattier",
    "oignon",
    "tomate",
    "pasteque",
    "orge",
    "capres",
    "amandier",
    "ble_dur",
    "piment",
    "ail",
    "figuier",
}
STADES = ("initial", "developpement", "mi_saison", "fin")
LANGUES = ("fr", "ar", "darija")


def main() -> None:
    with TestClient(app) as client:
        reponse = client.get("/cultures")
        assert reponse.status_code == 200, reponse.text
        cultures = reponse.json()["cultures"]
        assert len(cultures) == 15
        assert {culture["id"] for culture in cultures} == ATTENDUES
        for culture in cultures:
            for langue in LANGUES:
                assert culture["nom"][langue]
                assert culture["delai"][langue]
                assert culture["source_prix"][langue]
            for stade in STADES:
                assert isinstance(culture["kc"][stade], (int, float))
            assert culture["rendement_t_ha"] > 0
            prix = culture["prix"]
            assert prix["min"] <= prix["typique"] <= prix["max"]
            assert culture["sols"]
            assert culture["besoin_eau_m3_ha"] > 0

        calcaire = client.get("/cultures", params={"sol": "calcaire"})
        ids = {culture["id"] for culture in calcaire.json()["cultures"]}
        assert "olivier" in ids
        assert "tomate" not in ids

        fiche = client.get("/cultures/olivier")
        assert fiche.status_code == 200
        assert fiche.json()["nom"]["ar"] == "زيتون"
        assert client.get("/cultures/inconnue").status_code == 404

    print("Sprint 3 API ok")


if __name__ == "__main__":
    main()
