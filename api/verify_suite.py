"""Vérifie les critères des sprints 7 à 18."""

import time

from fastapi.testclient import TestClient

from app.main import app
from app.suite import lettre_label, nombres_dans


def main() -> None:
    assert lettre_label(2.2, True, True, True) == "A"
    assert lettre_label(0.7, True, True, True) == "E"
    assert lettre_label(2.4, False, True, True) != "A"

    with TestClient(app) as client:
        sobre = {"repartition": [{"culture_id": "capres", "hectares": 2.4}]}
        mixte = {"repartition": [{"culture_id": "olivier", "hectares": 1.2}, {"culture_id": "figuier_barbarie", "hectares": 1.2}]}
        trop = {"repartition": [{"culture_id": "capres", "hectares": 2.5}]}
        soif = {"repartition": [{"culture_id": "palmier_dattier", "hectares": 1}]}

        for corps in (sobre, mixte):
            reponse = client.post("/parcelles/parc-07/simulation", json=corps)
            assert reponse.status_code == 200, reponse.text
            assert "revenu_dt" in reponse.json() and "label" in reponse.json()
        depasse = client.post("/parcelles/parc-07/simulation", json=trop).json()
        assert depasse["alerte_surface"] is True
        assert client.post("/parcelles/parc-07/plan", json=trop).status_code == 422
        puits = client.post("/parcelles/parc-07/simulation", json=soif).json()
        assert puits["alerte_puits"] is True
        assert client.post("/parcelles/parc-07/plan", json=soif).status_code == 422
        adopte = client.post("/parcelles/parc-07/plan", json=sobre)
        assert adopte.status_code == 200, adopte.text
        assert adopte.json()["label"] == "A"

        public = client.get("/labels/ardi-ferme-ben-ali")
        assert public.status_code == 200, public.text
        assert public.json()["note"] == "A" and public.json()["statut"] == "actif"

        fiche = client.get("/assistant", )
        questions = __import__("app.database", fromlist=["load_fixture"]).load_fixture("09")
        assert len(questions["questions"]) == 20
        autorises = set(questions["chiffres_autorises"])
        for question in questions["questions"]:
            reponse = client.post("/assistant", json={"question": question["darija"]})
            assert reponse.status_code == 200, reponse.text
            for nombre in nombres_dans(reponse.json()["texte"]):
                assert nombre in autorises, (question["darija"], nombre)
        refus = client.post("/assistant", json={"question": "chnowa el jaw f paris"})
        assert refus.json()["refus"] is True

        marche = client.get("/produits?label=A&region=Sidi Bouzid")
        assert len(marche.json()["produits"]) == 1
        scan = client.get("/produits?qr=ardi-kebbar-01")
        assert scan.json()["produits"][0]["id"] == "kebbar-01"
        commande = client.post(
            "/commandes",
            json={"lignes": [{"produit_id": "kebbar-01", "quantite": 2}], "moyen_paiement": "carte", "numero_carte": "4242"},
        )
        assert commande.status_code == 200, commande.text
        assert "4242" not in commande.text

        publié = client.post("/produits", json={"nom": "Câpres du jour", "prix": 11, "stock": 30})
        assert publié.status_code == 200, publié.text
        acceptée = client.patch("/commandes/cmd-demo", json={"statut": "acceptee"})
        assert acceptée.json()["statut"] == "acceptee"
        contre = client.patch("/commandes/cmd-demo", json={"prix": 11})
        assert contre.json()["statut"] == "contre_offre"
        assert client.get("/commandes/cmd-demo").json()["statut"] == "contre_offre"
        lue = client.post("/notifications/n-commande/lue")
        assert lue.json()["lue"] is True
        assert client.get("/notifications").json()["notifications"][2]["lue"] is True

        debut = time.perf_counter()
        demo = __import__("app.database", fromlist=["load_fixture"]).load_fixture("12")
        for parcelle in demo["parcelles"]:
            attendu = round(0.00272 * parcelle["profondeur_m"] / parcelle["eta"] * 100) / 100
            # même arrondi que l'API : floor(x*100+0.5)/100
            attendu = math_cent(0.00272 * parcelle["profondeur_m"] / parcelle["eta"])
            assert attendu > 0
        assert time.perf_counter() - debut < 10
        assert len(demo["parcelles"]) == 10
        assert len(demo["cartes"]) == 8
        assert demo["controles"]["kwh_60"] == math_cent(0.00272 * 60 / 0.5)
        assert demo["controles"]["label_22"] == "A"
        assert demo["controles"]["label_07"] == "E"
        assert "tomate" in demo["parcelles"][0]["exclues"]
        assert demo["controles"]["tri_revenu_premier"] != demo["controles"]["tri_eau_premier"]

        bas = client.get("/parcelles/parc-13/solaire?profondeur=30").json()
        haut = client.get("/parcelles/parc-13/solaire?profondeur=60").json()
        assert haut["puissance_kw"] > bas["puissance_kw"]
        assert haut["panneaux"] >= bas["panneaux"]

        une = client.get("/parcelles/parc-14/suivi?scenario=une").json()
        deux = client.get("/parcelles/parc-14/suivi?scenario=deux").json()
        assert une["statut"] == "a_confirmer"
        assert deux["statut"] == "ecart_confirme"
        assert deux["alertes"]
        assert client.post("/parcelles/parc-14/contestation", json={"photo": "sol.jpg"}).json()["acceptee"]

        total = client.get("/impact?compte=amira").json()
        assert total["eau_m3"] == 12 + 8 + 5
        assert total["fermes"] == 2
        rapport = client.get("/impact/rapport?compte=el-baraka")
        assert rapport.json()["lignes"]["eau_m3"] == 40

        assert client.post("/hors-ligne/parcelle", json={"id": "parc-16"}).status_code == 422
        assert client.post("/hors-ligne/parcelle", json={"id": "parc-16", "consentement": True}).json()["envoye"]

        avant = client.get("/proprietaires/usr-demo/parcelles").json()
        assert client.get("/proprietaires/usr-autre/parcelles").json()["parcelles"] == []
        assert avant["plan_fige"]["label"] == "C"
        client.post("/prix", json={"culture": "olivier", "typique": 12, "source": "ONAGRI"})
        apres = client.get("/proprietaires/usr-demo/parcelles").json()
        assert apres["plan_fige"]["label"] == "C"
        assert apres["classement"] != avant["classement"]

        assert client.get("/labels/ardi-suspendu").json()["note"] is None
        assert client.get("/labels/ardi-actif").json()["note"] == "A"
        suspendu = client.post("/admin/labels/ardi-actif/suspendre")
        assert suspendu.json()["note"] is None
        assert client.get("/admin/file").json()["file"]

    print("Sprints 7 a 18 API ok")


def math_cent(valeur: float) -> float:
    return __import__("math").floor(valeur * 100 + 0.5) / 100


if __name__ == "__main__":
    main()
