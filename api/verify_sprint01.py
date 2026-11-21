"""Vérifie le socle du sprint 1 sans serveur lancé."""

from fastapi.testclient import TestClient

from app.main import app

ROUTES_ATTENDUES = {
    ("GET", "/health"),
    ("GET", "/demo"),
    ("POST", "/auth/otp"),
    ("POST", "/auth/verify"),
    ("POST", "/parcelles"),
    ("POST", "/parcelles/{id}/analyse"),
    ("GET", "/parcelles/{id}/recommandations"),
    ("POST", "/parcelles/{id}/simulation"),
    ("POST", "/parcelles/{id}/plan"),
    ("GET", "/parcelles/{id}/suivi"),
    ("GET", "/parcelles/{id}/solaire"),
    ("POST", "/assistant"),
    ("GET", "/labels/{qr}"),
    ("GET", "/produits"),
    ("POST", "/produits"),
    ("POST", "/commandes"),
    ("PATCH", "/commandes/{id}"),
}


def main() -> None:
    with TestClient(app) as client:
        sante = client.get("/health")
        assert sante.status_code == 200, sante.text
        corps = sante.json()
        assert corps["statut"] == "ok"
        assert corps["ferme"] == "Ferme Ben Ali"
        assert corps["enregistrements"]["parcelles"] >= 1

        demo = client.get("/demo")
        assert demo.status_code == 200, demo.text
        ferme = demo.json()
        assert ferme["parcelle"]["profondeur_puits_m"] == 60
        assert ferme["parcelle"]["culture_actuelle"]["id"] == "tomate"
        assert len(ferme["scenario"]) == 8

        contrat = client.get("/contrat")
        assert contrat.status_code == 200, contrat.text
        routes = {(route["methode"], route["chemin"]) for route in contrat.json()["routes"]}
        manquantes = ROUTES_ATTENDUES - routes
        assert not manquantes, manquantes

    print("Sprint 1 API ok")


if __name__ == "__main__":
    main()
