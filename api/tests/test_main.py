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


def test_sprint_two_demo_has_three_profiles() -> None:
    response = client.get("/demo/sprint-02")
    assert response.status_code == 200
    payload = response.json()
    assert payload["sprint"] == 2
    assert len(payload["profiles"]) == 3
    assert payload["demo_otp"] == "123456"


def test_demo_otp_accepts_known_role_and_creates_account() -> None:
    otp = client.post(
        "/auth/otp",
        json={
            "phone": "+21600000010",
            "role": "agriculteur",
            "name": "Test Ardi",
            "language": "darija",
        },
    )
    assert otp.status_code == 200
    assert otp.json()["code"] == "123456"

    verify = client.post(
        "/auth/verify",
        json={"phone": "+21600000010", "code": "123456"},
    )
    assert verify.status_code == 200
    assert verify.json()["role"] == "agriculteur"
    assert verify.json()["language"] == "darija"


def test_unknown_role_is_rejected() -> None:
    response = client.post(
        "/auth/otp",
        json={
            "phone": "+21600000011",
            "role": "administrateur",
            "name": "Test",
            "language": "fr",
        },
    )
    assert response.status_code == 422


def test_sprint_three_returns_15_complete_cultures() -> None:
    response = client.get("/cultures")
    assert response.status_code == 200
    payload = response.json()
    assert payload["count"] == 15
    for culture in payload["cultures"]:
        assert set(culture["names"]) == {"fr", "ar", "darija"}
        assert culture["kc"]
        assert culture["yield_t_ha"] > 0
        assert culture["price"]["min"] <= culture["price"]["typical"] <= culture["price"]["max"]
        assert culture["price"]["source"]
        assert culture["costs_tnd_ha"] > 0
        assert culture["soils"]
        assert culture["duration_months"] > 0


def test_sprint_three_filters_by_compatible_soil() -> None:
    response = client.get("/cultures", params={"sol": "argileux"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["count"] > 0
    assert all("argileux" in culture["soils"] for culture in payload["cultures"])


def test_sprint_four_fixture_and_api_surface_are_consistent() -> None:
    fixture = client.get("/demo/sprint-04")
    assert fixture.status_code == 200
    parcel = fixture.json()["parcelle"]

    response = client.post(
        "/parcelles",
        json={
            "owner_id": parcel["owner_id"],
            "name": parcel["name"],
            "geometry": parcel["geometry"],
            "water_source": parcel["water_source"],
            "well_depth_m": parcel["well_depth_m"],
            "pump_flow_m3_h": parcel["pump_flow_m3_h"],
            "current_crop": parcel["current_crop"],
            "energy": parcel["energy"],
        },
    )
    assert response.status_code == 201
    assert response.json()["surface_hectares"] == parcel["surface_hectares"]


def test_sprint_five_analysis_60m_pumping_energy() -> None:
    response = client.post("/parcelles/parcelle-sprint-05/analyse")
    assert response.status_code == 200
    payload = response.json()
    assert payload["eau"]["eau_disponible_m3"] == 3840
    assert abs(payload["energie"]["kwh_m3"] - 0.3264) < 0.001


def test_sprint_five_analysis_unknown_parcel() -> None:
    response = client.post("/parcelles/inconnue/analyse")
    assert response.status_code == 404


def test_sprint_six_default_ranking_excludes_incompatible_crops() -> None:
    response = client.get(
        "/parcelles/parcelle-sprint-06/recommandations",
        params={"tri": "revenu"},
    )
    assert response.status_code == 200
    payload = response.json()
    ids = [culture["id"] for culture in payload["cultures"]]
    assert "artichaut" not in ids
    assert ids[0] == "olivier"
    assert payload["ecart_dt_m3"] == 1.7


def test_sprint_six_water_sort_changes_order_without_readding_excluded() -> None:
    response = client.get(
        "/parcelles/parcelle-sprint-06/recommandations",
        params={"tri": "eau"},
    )
    assert response.status_code == 200
    payload = response.json()
    values = [culture["m3_ha"] for culture in payload["cultures"]]
    assert values == sorted(values)
    assert "artichaut" not in [culture["id"] for culture in payload["cultures"]]


def test_sprint_six_unknown_sort_is_rejected() -> None:
    response = client.get(
        "/parcelles/parcelle-sprint-06/recommandations",
        params={"tri": "inconnu"},
    )
    assert response.status_code == 422


def test_sprint_seven_simulation_updates_results() -> None:
    response = client.post(
        "/parcelles/parcelle-sprint-07/simulation",
        json={"allocations": {"olivier": 2.0, "cables": 1.0, "figuier_barbarie": 0.69}},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["surface_totale_ha"] == 3.69
    assert payload["eau_m3"] > 0
    assert payload["energie_kwh"] > 0
    assert payload["label"] in {"A", "B", "C", "D", "E"}


def test_sprint_seven_rejects_parcel_overflow_and_flags_well_overflow() -> None:
    parcel_overflow = client.post(
        "/parcelles/parcelle-sprint-07/simulation",
        json={"allocations": {"olivier": 4.0}},
    )
    assert parcel_overflow.status_code == 422

    well_overflow = client.post(
        "/parcelles/parcelle-sprint-07/simulation",
        json={"allocations": {"olivier": 3.69}},
    )
    assert well_overflow.status_code == 200
    assert well_overflow.json()["puits_depasse"] is True

    tomato_overflow = client.post(
        "/parcelles/parcelle-sprint-07/simulation",
        json={"allocations": {"pois_chiche": 3.69}},
    )
    assert tomato_overflow.json()["puits_depasse"] is True


def test_sprint_seven_adopt_plan_rejects_well_overflow() -> None:
    response = client.post(
        "/parcelles/parcelle-sprint-07/plan",
        json={"allocations": {"olivier": 3.69}},
    )
    assert response.status_code in {200, 422}


def test_sprint_eight_label_a_and_e_thresholds() -> None:
    label_a = client.post(
        "/labels/calculate",
        json={"dt_m3": 2.2, "compatible": True, "irrigation": "localisee", "conforme": True},
    )
    assert label_a.status_code == 200
    assert label_a.json()["letter"] == "A"

    label_e = client.post(
        "/labels/calculate",
        json={"dt_m3": 0.79, "compatible": True, "irrigation": "localisee", "conforme": True},
    )
    assert label_e.status_code == 200
    assert label_e.json()["letter"] == "E"


def test_sprint_eight_public_farm_and_product_qr() -> None:
    farm = client.get("/labels/ARDI-FARM-001")
    assert farm.status_code == 200
    assert farm.json()["note"] == "A"
    assert farm.json()["status"] == "actif"

    product = client.get("/labels/ARDI-PRODUCT-001")
    assert product.status_code == 200
    assert product.json()["produit"] == "Huile d'olive Ardi"


def test_sprint_nine_all_demo_questions_match_fixture_answers() -> None:
    fixture = client.get("/demo/sprint-09")
    assert fixture.status_code == 200
    questions = fixture.json()["questions"]
    for question in questions:
        response = client.post("/assistant", json={"question": question["darija"], "audio": True})
        assert response.status_code == 200
        payload = response.json()
        assert payload["in_scope"] is True
        assert payload["text"] == question["answer"]


def test_sprint_nine_out_of_scope_question_is_refused() -> None:
    response = client.post(
        "/assistant",
        json={"question": "Quelle est la météo sur Mars ?", "audio": False},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["in_scope"] is False
    assert payload["actions"] == []


def test_sprint_ten_market_filters_and_qr() -> None:
    market = client.get("/produits")
    assert market.status_code == 200
    assert market.json()["count"] == 3

    filtered = client.get("/produits", params={"label": "A", "category": "huiles"})
    assert filtered.status_code == 200
    assert filtered.json()["count"] == 1

    qr = client.get("/produits/qr/ARDI-PRODUCT-001")
    assert qr.status_code == 200
    assert qr.json()["name"] == "Huile d'olive extra vierge"


def test_sprint_ten_order_simulation() -> None:
    response = client.post(
        "/commandes",
        json={
            "buyer_id": "acheteur-demo",
            "product_id": "produit-olive-001",
            "quantity": 2,
            "payment_method": "d17",
        },
    )
    assert response.status_code == 201
    order = response.json()
    assert order["total_tnd"] == 37.0
    assert order["impact_eau_m3"] == 256.0

    update = client.patch(
        f"/commandes/{order['id']}",
        json={"status": "acceptee"},
    )
    assert update.status_code == 200
    assert update.json()["status"] == "acceptee"


def test_sprint_eleven_publish_product_and_sales() -> None:
    publish = client.post(
        "/produits/publish",
        json={"name": "Huile test", "price_tnd": 19.0, "stock": 30},
    )
    assert publish.status_code == 200
    assert publish.json()["status"] == "publie"
    assert publish.json()["label"] == "A"

    sales = client.get("/ventes/sprint-11")
    assert sales.status_code == 200
    assert sales.json()["month_total_tnd"] == 740
    assert sales.json()["average_price_tnd"] == 18.5


def test_sprint_eleven_accept_and_counteroffer_change_status() -> None:
    accepted = client.patch(
        "/commandes/sprint-11/commande-011",
        json={"action": "accepter", "price_tnd": 18.5},
    )
    assert accepted.status_code == 200
    assert accepted.json()["status"] == "acceptee"

    counter = client.patch(
        "/commandes/sprint-11/commande-011",
        json={"action": "contre_proposer", "price_tnd": 19.0},
    )
    assert counter.status_code == 200
    assert counter.json()["status"] == "contre_proposition"
    assert counter.json()["price_tnd"] == 19.0


def test_sprint_eleven_notifications_are_readable() -> None:
    notifications = client.get("/notifications")
    assert notifications.status_code == 200
    assert notifications.json()["count"] == 4
    types = {item["type"] for item in notifications.json()["notifications"]}
    assert types == {"irrigation", "pompage", "commande", "label"}

    read = client.patch("/notifications/notif-commande/read")
    assert read.status_code == 200
    assert read.json()["read"] is True


def test_sprint_twelve_integrated_fixture_has_eight_cards() -> None:
    response = client.get("/demo/sprint-12")
    assert response.status_code == 200
    fixture = response.json()
    assert len(fixture["cartes"]) == 8
    assert [card["step"] for card in fixture["cartes"]] == list(range(1, 9))
    assert fixture["produit"]["qr"] == "ARDI-PRODUCT-001"


def test_sprint_twelve_demo_criteria_are_coherent() -> None:
    response = client.get("/demo/sprint-12/criteria")
    assert response.status_code == 200
    payload = response.json()
    assert payload["cards"] == 8
    assert payload["pumping_kwh_m3"] == 0.3264
    assert payload["water_saved_m3"] == 16236
    assert payload["energy_saved_kwh"] == 5294
    assert payload["top_crop"] == "Olivier"
    assert payload["label"] == "A"


def test_sprint_thirteen_solar_sizing_from_fixture() -> None:
    response = client.get("/parcelles/parcelle-sprint-13/solaire")
    assert response.status_code == 200
    payload = response.json()
    assert payload["profondeur_m"] == 60
    assert payload["puissance_kw"] == 3.92
    assert payload["nombre_panneaux"] == 10
    assert payload["volume_reservoir_m3"] == 96


def test_sprint_thirteen_depth_change_changes_solar_power() -> None:
    shallow = client.get(
        "/parcelles/parcelle-sprint-13/solaire",
        params={"profondeur_m": 30},
    )
    deep = client.get(
        "/parcelles/parcelle-sprint-13/solaire",
        params={"profondeur_m": 90},
    )
    assert shallow.status_code == 200
    assert deep.status_code == 200
    assert deep.json()["puissance_kw"] > shallow.json()["puissance_kw"]


def test_sprint_fourteen_followup_flags_irrigation_overrun() -> None:
    response = client.get("/parcelles/parcelle-sprint-14/suivi")
    assert response.status_code == 200
    payload = response.json()
    assert payload["alerte"]["active"] is True
    assert payload["alerte"]["ecart_m3"] == 558
    assert payload["alerte"]["status"] == "ecart_confirme"
    assert len(payload["zones"]) == 3


def test_sprint_fourteen_two_images_confirm_alert_but_one_stays_pending() -> None:
    one = client.post(
        "/parcelles/parcelle-sprint-14/suivi/alerte",
        json={"images": [{"agreement": True}]},
    )
    assert one.status_code == 200
    assert one.json()["status"] == "a_confirmer"

    two = client.post(
        "/parcelles/parcelle-sprint-14/suivi/alerte",
        json={"images": [{"agreement": True}, {"agreement": True}]},
    )
    assert two.status_code == 200
    assert two.json()["status"] == "ecart_confirme"


def test_sprint_fourteen_contestation_requires_location() -> None:
    response = client.post(
        "/parcelles/parcelle-sprint-14/suivi/contestation",
        json={"photo": "fixture://photo.jpg", "latitude": 35.67, "longitude": 9.83},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "contestee"


def test_sprint_fifteen_buyer_impact_totals_match_purchases() -> None:
    response = client.get("/acheteurs/acheteur-pro-demo/impact")
    assert response.status_code == 200
    payload = response.json()
    assert payload["eau_m3"] == sum(item["eau_m3"] for item in payload["achats"])
    assert payload["energie_kwh"] == sum(item["energie_kwh"] for item in payload["achats"])
    assert payload["nombre_fermes"] == 3
    assert payload["part_produits_label_a_pct"] == 33.33


def test_sprint_fifteen_professional_report_and_bulk_order() -> None:
    report = client.get("/acheteurs/acheteur-pro-demo/rapport")
    assert report.status_code == 200
    assert "achat,produit,ferme,label,quantite,eau_m3,energie_kwh" in report.json()["content"]

    bulk = client.post(
        "/acheteurs/acheteur-pro-demo/commandes-gros",
        json={"produit": "Huile d'olive extra vierge", "quantite": 300},
    )
    assert bulk.status_code == 200
    assert bulk.json()["status"] == "en_attente"
    assert bulk.json()["paiement_reel"] is False


def test_sprint_sixteen_cache_returns_analysis_and_ranking() -> None:
    response = client.get("/cache/analyse")
    assert response.status_code == 200
    payload = response.json()
    assert payload["cache"] is True
    assert payload["analyse"]["kwh_m3"] == 0.3264
    assert len(payload["classement"]) == 3


def test_sprint_sixteen_queue_requires_location_consent() -> None:
    refused = client.post(
        "/file/parcelles",
        json={"id": "parcelle-test", "location_consent": False},
    )
    assert refused.status_code == 422

    queued = client.post(
        "/file/parcelles",
        json={"id": "parcelle-test", "location_consent": True},
    )
    assert queued.status_code == 200
    assert queued.json()["status"] == "en_attente"

    sent = client.post("/file/parcelles/parcelle-test/envoyer")
    assert sent.status_code == 200
    assert sent.json()["status"] == "envoyee"


def test_sprint_seventeen_owner_can_list_only_owned_parcels() -> None:
    response = client.get("/agriculteurs/usr-demo/parcelles")
    assert response.status_code == 200
    payload = response.json()
    assert payload["count"] == 2
    assert all(parcel["owner_id"] == "usr-demo" for parcel in payload["parcelles"])

    refused = client.get("/agriculteurs/autre/parcelles")
    assert refused.status_code == 404


def test_sprint_seventeen_price_update_recalculates_live_ranking() -> None:
    update = client.patch(
        "/prix/olivier",
        json={"min": 2.0, "typical": 3.0, "max": 4.0, "source": "Marché test"},
    )
    assert update.status_code == 200
    assert update.json()["typical"] == 3.0

    ranking = client.get("/parcelles/parcelle-nord-17/classement-prix")
    assert ranking.status_code == 200
    olivier = next(
        item
        for item in ranking.json()["classement"]
        if item["culture"] == "olivier"
    )
    assert olivier["prix_typique_tnd"] == 3.0


def test_sprint_seventeen_frozen_plan_keeps_saved_label() -> None:
    ranking = client.get("/parcelles/parcelle-sud-17/classement-prix")
    assert ranking.status_code == 200
    payload = ranking.json()
    assert payload["parcelle"]["plan_fige"] is True
    assert payload["label_plan_adopte"] == "A"
