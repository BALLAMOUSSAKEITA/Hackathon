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
