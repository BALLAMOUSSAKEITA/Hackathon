"""Vérifie que le tri change l'ordre sans faire revenir une culture exclue."""

from fastapi.testclient import TestClient

from app.main import app

EXCLUES = {"tomate", "ble_dur", "palmier_dattier", "oignon", "ail"}


def _ids(corps: dict) -> list[str]:
    return [culture["id"] for culture in corps["cultures"]]


def main() -> None:
    with TestClient(app) as client:
        inconnu = client.get("/parcelles/parc-inconnue/recommandations")
        assert inconnu.status_code == 404, inconnu.text
        mauvais = client.get("/parcelles/parc-06/recommandations?tri=prix")
        assert mauvais.status_code == 422, mauvais.text

        revenu = client.get("/parcelles/parc-06/recommandations").json()
        eau = client.get("/parcelles/parc-06/recommandations?tri=eau").json()
        delai = client.get("/parcelles/parc-06/recommandations?tri=delai").json()

        for corps in (revenu, eau, delai):
            identifiants = set(_ids(corps))
            assert identifiants.isdisjoint(EXCLUES)
            assert identifiants.isdisjoint({ligne["id"] for ligne in corps["exclues"]})
            assert "capres" in identifiants
            assert all(culture["label"] in "ABCDE" for culture in corps["cultures"])
            assert all(culture["pourquoi"]["fr"] and culture["pourquoi"]["ar"] and culture["pourquoi"]["darija"] for culture in corps["cultures"])
        assert set(_ids(revenu)) == set(_ids(eau)) == set(_ids(delai))
        assert _ids(revenu) != _ids(eau)
        assert _ids(eau) != _ids(delai)
        assert _ids(eau) == sorted(_ids(eau), key=lambda identifiant: next(c["eau_m3_ha"] for c in eau["cultures"] if c["id"] == identifiant))
        assert [c["delai_mois"] for c in delai["cultures"]] == sorted(c["delai_mois"] for c in delai["cultures"])
        assert [c["dt_m3"] for c in revenu["cultures"]] == sorted((c["dt_m3"] for c in revenu["cultures"]), reverse=True)
        assert revenu["culture_actuelle"]["incluse"] is False
        assert "sel" in revenu["culture_actuelle"]["motifs"]
        capres = next(culture for culture in revenu["cultures"] if culture["id"] == "capres")
        assert capres["intercalaire"] is True
        assert "0.9" in capres["pourquoi"]["fr"]
        assert revenu["cultures"][0]["id"] == "capres"
        assert eau["cultures"][0]["id"] == "figuier_barbarie"

    print("Sprint 6 API ok", _ids(revenu), _ids(eau))


if __name__ == "__main__":
    main()
