import os
import re
from uuid import uuid4

os.environ["DATABASE_URL"] = "sqlite:///./test-ardi.db"

from fastapi.testclient import TestClient

from app.database import Base, engine
from app import main as main_module
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


def test_sprint_08_fixture_computes_labels_and_public_qr_details():
    with TestClient(app) as client:
        fixture = client.get("/fixture/sprint-08")
        public_label = client.get("/labels/ARDI-S08-FARM-001")

    assert fixture.status_code == 200
    data = fixture.json()
    assert data["calculated_labels"] == {"current": "B", "potential": "A"}
    assert data["home"]["potential_label_grade"] == "A"
    assert len(data["verifications"]) == 2
    assert public_label.status_code == 200
    public = public_label.json()
    assert public["grade"] == "B"
    assert public["status"] == "active"
    assert public["farm"]["id"] == "farm-sprint-08"
    assert public["product"]["id"] == "product-sprint-08-olive-oil"
    assert {row["status"] for row in public["verifications"]} == {"conforme"}


def test_label_grade_thresholds_and_a_requirements():
    base = {
        "compatible": True,
        "irrigation_method": "drip",
        "water_demand_m3": 900,
        "available_water_m3": 1000,
        "plan_compliant": True,
        "repeated_well_overruns": 0,
    }

    assert main_module.calculate_label_grade({**base, "revenue_dt_m3": 2.2}) == "A"
    assert main_module.calculate_label_grade({**base, "revenue_dt_m3": 1.5}) == "B"
    assert main_module.calculate_label_grade({**base, "revenue_dt_m3": 1.1}) == "C"
    assert main_module.calculate_label_grade({**base, "revenue_dt_m3": 0.8}) == "D"
    assert main_module.calculate_label_grade({**base, "revenue_dt_m3": 0.79}) == "E"
    assert main_module.calculate_label_grade(
        {**base, "revenue_dt_m3": 2.2, "compatible": False}
    ) == "B"
    assert main_module.calculate_label_grade(
        {**base, "revenue_dt_m3": 2.2, "irrigation_method": "gravity"}
    ) == "B"
    assert main_module.calculate_label_grade(
        {**base, "revenue_dt_m3": 2.2, "water_demand_m3": 1100}
    ) == "B"
    assert main_module.calculate_label_grade(
        {**base, "revenue_dt_m3": 2.2, "plan_compliant": False}
    ) == "B"
    assert main_module.calculate_label_grade(
        {**base, "revenue_dt_m3": 2.2, "repeated_well_overruns": 1}
    ) == "E"


def test_suspended_label_remains_openable_and_shows_status():
    with TestClient(app) as client:
        session_generator = main_module.get_db()
        db = next(session_generator)
        label = db.get(main_module.models.Label, "label-sprint-08")
        original_status = label.status
        label.status = "suspended"
        db.commit()
        session_generator.close()
        try:
            response = client.get("/labels/ARDI-S08-FARM-001")
        finally:
            session_generator = main_module.get_db()
            db = next(session_generator)
            label = db.get(main_module.models.Label, "label-sprint-08")
            label.status = original_status
            db.commit()
            session_generator.close()

    assert response.status_code == 409
    assert response.json()["detail"]["status"] == "suspended"
    assert "grade" not in response.json()["detail"]


def test_unknown_public_qr_is_not_found():
    with TestClient(app) as client:
        response = client.get("/labels/UNKNOWN-QR")
    assert response.status_code == 404


def test_sprint_09_assistant_answers_only_fixture_questions_and_numbers():
    number_pattern = r"(?<![A-Za-z\u0600-\u06FF])\d+(?:\.\d+)?(?![A-Za-z\u0600-\u06FF])"
    with TestClient(app) as client:
        fixture_response = client.get("/fixture/sprint-09")
        assert fixture_response.status_code == 200
        fixture = fixture_response.json()
        source_data = {
            key: value
            for key, value in fixture.items()
            if key not in {"questions", "out_of_scope"}
        }
        source_numbers = set(
            re.findall(number_pattern, str(source_data))
        )

        assert len(fixture["questions"]) == 20
        for item in fixture["questions"]:
            response = client.post(
                "/assistant",
                json={"question_text": item["phrases"][0]},
            )
            assert response.status_code == 200
            answer = response.json()
            assert answer["found_in_fixture"] is True
            assert answer["question_id"] == item["id"]
            assert answer["answer_text"] == item["answers"]["darija"]
            assert answer["translation_fr"] == item["answers"]["fr"]
            assert answer["audio"]["text"] == answer["answer_text"]
            answer_numbers = set(
                re.findall(
                    number_pattern,
                    " ".join(item["answers"].values()),
                )
            )
            assert answer_numbers <= source_numbers


def test_sprint_09_assistant_supports_audio_transcripts_and_refuses_unknown_data():
    with TestClient(app) as client:
        audio_response = client.post(
            "/assistant",
            json={
                "audio_transcript": "qadech revenu olivier m3a orge fel interculture",
                "language": "fr",
            },
        )
        unknown_response = client.post(
            "/assistant",
            json={"question_text": "Donne-moi la meteo de demain"},
        )
        invalid_response = client.post("/assistant", json={})

    assert audio_response.status_code == 200
    assert audio_response.json()["input_type"] == "audio_transcript"
    assert audio_response.json()["answer_text"].endswith("2.1 DT/m3.")
    assert audio_response.json()["audio"]["status"] == "client_tts"
    assert unknown_response.status_code == 200
    assert unknown_response.json()["found_in_fixture"] is False
    assert unknown_response.json()["suggested_question"]
    assert not re.search(
        r"(?<![A-Za-z\u0600-\u06FF])\d+(?:\.\d+)?(?![A-Za-z\u0600-\u06FF])",
        unknown_response.json()["answer_text"],
    )
    assert invalid_response.status_code == 422


def test_sprint_10_market_filters_and_public_qr_fiche():
    with TestClient(app) as client:
        fixture = client.get("/fixture/sprint-10")
        all_products = client.get("/produits")
        label_a = client.get("/produits", params={"label": "A"})
        dates = client.get("/produits", params={"category": "dattes"})
        kebili = client.get("/produits", params={"region": "kebili"})
        no_match = client.get("/produits", params={"category": "unknown"})
        scanned_label = client.get("/labels/ARDI-S10-DATES-001")

    assert fixture.status_code == 200
    assert len(all_products.json()) == 3
    assert len(label_a.json()) == 2
    assert all(product["label"]["grade"] == "A" for product in label_a.json())
    assert dates.json()[0]["id"] == "product-sprint-10-dates"
    assert kebili.json()[0]["farm"]["region"] == "Kebili"
    assert no_match.json() == []
    assert scanned_label.status_code == 200
    public = scanned_label.json()
    assert public["product"]["id"] == "product-sprint-10-dates"
    assert public["product"]["impact"]["water_saved_m3"] == 650
    assert public["farm"]["region"] == "Kebili"


def test_sprint_10_orders_simulate_payment_without_card_data():
    with TestClient(app) as client:
        d17_order = client.post(
            "/commandes",
            json={
                "buyer_id": "user-sprint-10-buyer",
                "product_id": "product-sprint-10-olive-oil",
                "quantity_kg": 2,
                "payment_method": "D17",
            },
        )
        updated_order = client.patch(
            f"/commandes/{d17_order.json()['id']}",
            json={
                "quantity_kg": 3,
                "payment_method": "card",
                "status": "confirmed",
            },
        )
        delivery_order = client.post(
            "/commandes",
            json={
                "buyer_id": "user-sprint-10-buyer",
                "product_id": "product-sprint-10-dates",
                "quantity_kg": 1,
                "payment_method": "cash_on_delivery",
            },
        )
        card_data_order = client.post(
            "/commandes",
            json={
                "buyer_id": "user-sprint-10-buyer",
                "product_id": "product-sprint-10-olive-oil",
                "quantity_kg": 1,
                "payment_method": "card",
                "card_number": "4111111111111111",
            },
        )
        empty_patch = client.patch(
            f"/commandes/{d17_order.json()['id']}",
            json={},
        )

    assert d17_order.status_code == 201
    assert d17_order.json()["total_tnd"] == 48
    assert d17_order.json()["payment_status"] == "simulated"
    assert updated_order.status_code == 200
    assert updated_order.json()["total_tnd"] == 72
    assert updated_order.json()["payment_method"] == "card"
    assert updated_order.json()["payment_status"] == "simulated"
    assert updated_order.json()["status"] == "confirmed"
    assert "card_number" not in updated_order.json()
    assert delivery_order.status_code == 201
    assert delivery_order.json()["payment_status"] == "due_on_delivery"
    assert card_data_order.status_code == 422
    assert empty_patch.status_code == 422


def test_sprint_11_product_publication_and_farm_price_comparison():
    created_product_id = None
    try:
        with TestClient(app) as client:
            fixture = client.get("/fixture/sprint-11")
            before = client.get("/fermes/farm-sprint-11/prix-moyens")
            public_label = client.get("/labels/ARDI-S11-FARM-001")
            published = client.post(
                "/produits",
                json={
                    "name": "Huile nouvelle",
                    "category": "huile_olive",
                    "quantity_kg": 30,
                    "price_tnd_kg": 28,
                    "photo_url": "/assets/huile-nouvelle.jpg",
                },
            )
            products = client.get("/produits")
            after = client.get("/fermes/farm-sprint-11/prix-moyens")

        assert fixture.status_code == 200
        assert fixture.json()["quote_request"]["status"] == "pending"
        assert before.status_code == 200
        assert before.json()["farm_average_price_tnd_kg"] == 22
        assert public_label.status_code == 200
        assert (
            public_label.json()["product"]["id"]
            == "product-sprint-11-olive-oil"
        )
        assert published.status_code == 201
        published_product = published.json()
        created_product_id = published_product["id"]
        assert published_product["farm_id"] == "farm-sprint-11"
        assert published_product["label_id"] == "label-sprint-11"
        assert published_product["photo_url"] == "/assets/huile-nouvelle.jpg"
        assert any(
            product["id"] == created_product_id for product in products.json()
        )
        assert after.status_code == 200
        assert after.json()["product_count"] == before.json()["product_count"] + 1
        assert after.json()["market_typical_price_tnd_kg"] == 20.5
    finally:
        if created_product_id is not None:
            session_generator = main_module.get_db()
            db = next(session_generator)
            product = db.get(main_module.models.Produit, created_product_id)
            if product is not None:
                db.delete(product)
                db.commit()
            session_generator.close()


def test_sprint_11_order_counteroffers_and_read_notifications_persist():
    order_id = "order-sprint-11-received"
    alert_id = "alert-sprint-11-order"
    original_order = None
    original_alert_read = None
    try:
        with TestClient(app) as client:
            orders = client.get("/commandes")
            original_order = next(
                order for order in orders.json() if order["id"] == order_id
            )
            alerts = client.get("/alertes")
            original_alert_read = next(
                alert["read"]
                for alert in alerts.json()
                if alert["id"] == alert_id
            )
            fixture_alerts = client.get("/fixture/sprint-11").json()["alerts"]
            counteroffer = client.patch(
                f"/commandes/{order_id}",
                json={"counteroffer_price_tnd_kg": 21.5},
            )
            accepted = client.patch(
                f"/commandes/{order_id}",
                json={"status": "accepted"},
            )
            marked_read = client.patch(
                f"/alertes/{alert_id}",
                json={"read": True},
            )
            mark_unread = client.patch(
                f"/alertes/{alert_id}",
                json={"read": False},
            )
            persisted_alert = next(
                alert
                for alert in client.get("/alertes").json()
                if alert["id"] == alert_id
            )
            accepted_order = next(
                order
                for order in client.get("/commandes").json()
                if order["id"] == order_id
            )

        assert len(fixture_alerts) == 4
        assert {alert["type"] for alert in fixture_alerts} == {
            "irrigation",
            "pompage",
            "commande",
            "label",
        }
        assert all(alert["date"] and alert["read"] is False for alert in fixture_alerts)
        assert counteroffer.status_code == 200
        assert counteroffer.json()["status"] == "counteroffered"
        assert counteroffer.json()["counteroffer_price_tnd_kg"] == 21.5
        assert accepted.status_code == 200
        assert accepted.json()["status"] == "accepted"
        assert accepted.json()["total_tnd"] == 86
        assert accepted_order["status"] == "accepted"
        assert marked_read.status_code == 200
        assert marked_read.json()["read"] is True
        assert mark_unread.status_code == 422
        assert persisted_alert["read"] is True
    finally:
        if original_order is not None or original_alert_read is not None:
            session_generator = main_module.get_db()
            db = next(session_generator)
            if original_order is not None:
                order = db.get(main_module.models.Commande, order_id)
                if order is not None:
                    order.status = original_order["status"]
                    order.total_tnd = original_order["total_tnd"]
                    order.counteroffer_price_tnd_kg = original_order[
                        "counteroffer_price_tnd_kg"
                    ]
            if original_alert_read is not None:
                alert = db.get(main_module.models.Alerte, alert_id)
                if alert is not None:
                    alert.read = original_alert_read
            db.commit()
            session_generator.close()


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


def test_sprint_03_has_complete_culture_records():
    required_crops = {
        "olive",
        "pistachio",
        "pomegranate",
        "prickly-pear",
        "date-palm",
        "onion",
        "tomato",
        "watermelon",
        "barley",
        "capers",
        "crop-wheat",
        "chickpea",
        "pepper",
        "grape",
        "fig",
    }
    with TestClient(app) as client:
        fixture = client.get("/fixture/sprint-03")
        response = client.get("/cultures")
        assert fixture.status_code == 200
        assert response.status_code == 200
        cultures = response.json()
        assert {culture["id"] for culture in cultures} == required_crops
        for culture in cultures:
            assert {"fr", "ar", "darija"} <= culture["name"].keys()
            assert culture["water_need_mm"] > 0
            assert culture["first_production_days"] > 0
            assert culture["salt_tolerance_dS_m"] > 0
            assert culture["heat_tolerance_c"] > 0
            assert {"initial", "development", "mid_season", "late_season"} <= culture[
                "kc_by_stage"
            ].keys()
            for ranges in (
                culture["yield_range_t_ha"],
                culture["price_range_tnd_t"],
                culture["costs_tnd_ha"],
            ):
                assert ranges["min"] <= ranges["typical"] <= ranges["max"]
            assert culture["yield_range_t_ha"]["typical"] == culture["yield_t_ha"]
            assert culture["price_range_tnd_t"]["typical"] == culture["price_tnd_t"]
            assert culture["compatible_soils"]
            assert culture["price_source"]
            assert culture["kc_source"]


def test_cultures_can_be_filtered_by_compatible_soil():
    with TestClient(app) as client:
        response = client.get("/cultures?soil=sandy")
        assert response.status_code == 200
        cultures = response.json()
        assert cultures
        assert all("sandy" in culture["compatible_soils"] for culture in cultures)
        assert len(cultures) < len(client.get("/cultures").json())


def test_culture_detail_endpoint():
    with TestClient(app) as client:
        response = client.get("/cultures/olive")
        assert response.status_code == 200
        assert response.json()["name"]["fr"] == "Olivier"


def test_sprint_06_fixture_is_standalone_with_crops_and_intercrop():
    with TestClient(app) as client:
        response = client.get("/fixture/sprint-06")

    assert response.status_code == 200
    fixture = response.json()
    assert len(fixture["cultures"]) == 15
    assert fixture["intercrops"][0]["id"] == "olive-barley-intercrop"
    assert fixture["analysis_context"]["soil_salinity_dS_m"] > 0


def test_recommendations_sort_without_returning_excluded_crops():
    with TestClient(app) as client:
        default = client.get("/parcelles/parcel-sprint-06/recommandations")
        water = client.get(
            "/parcelles/parcel-sprint-06/recommandations?tri=eau"
        )
        speed = client.get(
            "/parcelles/parcel-sprint-06/recommandations?tri=rapidite"
        )

    assert default.status_code == 200
    assert water.status_code == 200
    assert speed.status_code == 200
    default_data = default.json()
    water_data = water.json()
    speed_data = speed.json()
    default_rows = default_data["recommendations"]
    water_rows = water_data["recommendations"]
    speed_rows = speed_data["recommendations"]

    assert default_data["sort"] == "revenu_m3"
    assert default_data["best_crop_id"] == default_rows[0]["id"]
    assert [row["id"] for row in default_rows] != [
        row["id"] for row in water_rows
    ]
    assert [row["water_m3_ha"] for row in water_rows] == sorted(
        row["water_m3_ha"] for row in water_rows
    )
    assert [row["days_to_production"] for row in speed_rows] == sorted(
        row["days_to_production"] for row in speed_rows
    )
    assert "olive-barley-intercrop" in {row["id"] for row in default_rows}
    for data in (default_data, water_data, speed_data):
        assert not {row["id"] for row in data["recommendations"]} & {
            row["id"] for row in data["excluded_crops"]
        }


def test_recommendations_exclude_incompatible_crops_and_apply_risk():
    with TestClient(app) as client:
        response = client.get("/parcelles/parcel-sprint-06/recommandations")

    assert response.status_code == 200
    data = response.json()
    ranked_ids = {row["id"] for row in data["recommendations"]}
    excluded = {row["id"]: row["reasons"] for row in data["excluded_crops"]}

    assert "prickly-pear" not in ranked_ids
    assert "soil" in excluded["prickly-pear"]
    assert "salinity" in excluded["watermelon"]
    assert "heat" in excluded["tomato"]
    assert "water" in excluded["date-palm"]
    olive = next(row for row in data["recommendations"] if row["id"] == "olive")
    assert olive["risk_penalty_dt_m3"] > 0
    assert olive["risk_adjusted_revenue_dt_m3"] < olive["revenue_dt_m3"]
    assert olive["label"] in {"A", "B", "C", "D", "E"}
    assert data["current_crop"]["id"] == "crop-wheat"
    assert data["current_crop"]["compatible"] is False


def test_recommendations_sort_rejects_unknown_mode():
    with TestClient(app) as client:
        response = client.get(
            "/parcelles/parcel-sprint-06/recommandations?tri=prix"
        )
    assert response.status_code == 422


def test_sprint_07_simulation_recalculates_plan_and_compares_current_situation():
    with TestClient(app) as client:
        fixture = client.get("/fixture/sprint-07")
        response = client.post(
            "/parcelles/parcel-sprint-07/simulation",
            json={
                "allocations": [
                    {"crop_id": "barley", "area_ha": 1.2},
                    {"crop_id": "capers", "area_ha": 1.2},
                ]
            },
        )

    assert fixture.status_code == 200
    assert len(fixture.json()["cultures"]) == 4
    assert response.status_code == 200
    simulation = response.json()
    assert simulation["allocated_area_ha"] == 2.4
    assert simulation["surface_exceeded"] is False
    assert simulation["water_exceeded"] is False
    assert simulation["current_situation"]["water_exceeded"] is True
    assert simulation["comparison"]["water_saved_m3"] > 0
    assert simulation["comparison"]["energy_saved_kwh"] > 0
    assert simulation["label"] in {"A", "B", "C", "D", "E"}


def test_sprint_07_simulation_signals_water_and_surface_overruns():
    with TestClient(app) as client:
        simulation = client.post(
            "/parcelles/parcel-sprint-07/simulation",
            json={"allocations": [{"crop_id": "tomato", "area_ha": 2.4}]},
        )
        over_surface = client.post(
            "/parcelles/parcel-sprint-07/simulation",
            json={"allocations": [{"crop_id": "barley", "area_ha": 2.8}]},
        )

    assert simulation.status_code == 200
    assert simulation.json()["water_exceeded"] is True
    expected_tomato_water = (
        (4.8 * 0.91 * 150 - 56 * 150 / 180) / 0.9 * 10 * 2.4
    )
    assert abs(
        simulation.json()["water_demand_m3"] - expected_tomato_water
    ) < 0.02
    assert simulation.json()["label"] == "E"
    assert {
        warning["code"] for warning in simulation.json()["warnings"]
    } == {"water_capacity_exceeded"}
    assert over_surface.status_code == 200
    assert over_surface.json()["surface_exceeded"] is True
    assert over_surface.json()["water_exceeded"] is True
    assert {
        warning["code"] for warning in over_surface.json()["warnings"]
    } == {"surface_exceeded", "water_capacity_exceeded"}


def test_sprint_07_plan_adoption_rejects_area_overrun_and_persists_water_warning():
    with TestClient(app) as client:
        adopted = client.post(
            "/parcelles/parcel-sprint-07/plan",
            json={"allocations": [{"crop_id": "tomato", "area_ha": 2.4}]},
        )
        saved = client.get("/plans")
        rejected = client.post(
            "/parcelles/parcel-sprint-07/plan",
            json={"allocations": [{"crop_id": "barley", "area_ha": 2.8}]},
        )
        saved_after_rejection = client.get("/plans")

    assert adopted.status_code == 200
    assert adopted.json()["status"] == "adopted"
    assert adopted.json()["water_exceeded"] is True
    plan_id = adopted.json()["plan_id"]
    assert any(plan["id"] == plan_id for plan in saved.json())
    assert rejected.status_code == 422
    assert "surface_excess_ha" in rejected.json()["detail"]
    assert next(plan for plan in saved_after_rejection.json() if plan["id"] == plan_id)[
        "data"
    ]["allocations"] == [{"crop_id": "tomato", "area_ha": 2.4}]


def test_sprint_07_simulation_rejects_unknown_and_duplicate_crops():
    with TestClient(app) as client:
        unknown = client.post(
            "/parcelles/parcel-sprint-07/simulation",
            json={"allocations": [{"crop_id": "unknown", "area_ha": 1}]},
        )
        duplicate = client.post(
            "/parcelles/parcel-sprint-07/simulation",
            json={
                "allocations": [
                    {"crop_id": "barley", "area_ha": 0.5},
                    {"crop_id": "barley", "area_ha": 0.5},
                ]
            },
        )

    assert unknown.status_code == 422
    assert duplicate.status_code == 422


def test_sprint_04_parcel_post_recalculates_area():
    with TestClient(app) as client:
        fixture = client.get("/fixture/sprint-04").json()
        parcel = fixture["parcelles"][0]
        parcel["id"] = f"parcel-test-{uuid4()}"
        parcel["area_ha"] = 99

        response = client.post("/parcelles", json=parcel)

        assert response.status_code == 201
        assert response.json()["area_ha"] == 2.4
        assert response.json()["area_ha"] != 99


def test_parcel_post_rejects_self_intersecting_polygon():
    payload = {
        "id": f"parcel-test-{uuid4()}",
        "owner_id": "user-demo",
        "name": "Invalid polygon",
        "area_ha": 1,
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [9.48, 35.0286],
                    [9.482, 35.03],
                    [9.48, 35.03],
                    [9.482, 35.0286],
                    [9.48, 35.0286],
                ]
            ],
        },
        "water_source": "well",
        "well_depth_m": 60,
        "pump_flow_m3_h": 18,
        "energy_type": "solar",
        "current_crop_id": "crop-wheat",
    }
    with TestClient(app) as client:
        response = client.post("/parcelles", json=payload)
        assert response.status_code == 422


def test_parcel_post_rejects_non_polygon_geometry():
    payload = {
        "id": f"parcel-test-{uuid4()}",
        "owner_id": "user-demo",
        "name": "Not a polygon",
        "area_ha": 1,
        "geometry": {"type": "Point", "coordinates": [9.48, 35.0286]},
        "water_source": "well",
        "energy_type": "solar",
    }
    with TestClient(app) as client:
        response = client.post("/parcelles", json=payload)
        assert response.status_code == 422


def test_parcel_post_requires_existing_owner():
    payload = {
        "id": f"parcel-test-{uuid4()}",
        "owner_id": "unknown-user",
        "name": "Unknown owner",
        "area_ha": 1,
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [9.48, 35.0286],
                    [9.481, 35.0286],
                    [9.481, 35.0296],
                    [9.48, 35.0296],
                    [9.48, 35.0286],
                ]
            ],
        },
        "water_source": "well",
        "energy_type": "solar",
    }
    with TestClient(app) as client:
        response = client.post("/parcelles", json=payload)
        assert response.status_code == 404


def test_sprint_05_analysis_uses_fixture_and_calculates_water_and_energy():
    with TestClient(app) as client:
        fixture = client.get("/fixture/sprint-05")
        response = client.post("/parcelles/parcel-sprint-05/analyse")

        assert fixture.status_code == 200
        assert response.status_code == 200
        analysis = response.json()
        assert analysis["soil_texture"] == "loam"
        assert analysis["ph"] == 7.4
        assert analysis["available_water_m3"] == 19_440
        assert analysis["pumping_energy_kwh_m3"] == 0.3264
        assert analysis["solar_irradiance_kwh_m2_day"] == 5.4
        assert len(analysis["ndvi_monthly"]) == 12
        assert analysis["sources"]["soil"].startswith("SoilGrids")
        assert analysis["sources"]["climate"].startswith("Open-Meteo")


def test_analysis_request_can_override_water_assumptions():
    with TestClient(app) as client:
        response = client.post(
            "/parcelles/parcel-sprint-05/analyse",
            json={
                "pump_hours_per_day": 4,
                "season_days": 90,
                "efficiency": 0.4,
            },
        )
        assert response.status_code == 200
        assert response.json()["available_water_m3"] == 6_480
        assert response.json()["pumping_energy_kwh_m3"] == 0.408


def test_analysis_returns_not_found_for_unknown_parcel():
    with TestClient(app) as client:
        response = client.post("/parcelles/missing-parcel/analyse")
        assert response.status_code == 404


def test_external_analysis_sources_are_cached(monkeypatch):
    calls = []

    def fake_fetch_json(source, url, params):
        calls.append(source)
        if source == "SoilGrids":
            values = {"phh2o": 74, "soc": 10, "sand": 400, "clay": 200}
            return {
                "properties": {
                    "layers": [
                        {
                            "name": name,
                            "depths": [{"label": "0-5cm", "values": {"mean": value}}],
                        }
                        for name, value in values.items()
                    ]
                }
            }
        if source == "Open-Meteo":
            return {
                "daily": {
                    "precipitation_sum": [1, 2],
                    "temperature_2m_mean": [20, 22],
                    "et0_fao_evapotranspiration": [4, 5],
                }
            }
        return {
            "properties": {
                "parameter": {"ALLSKY_SFC_SW_DWN": {"ANN": 5.4}}
            }
        }

    monkeypatch.setattr(main_module, "fetch_json", fake_fetch_json)
    cached_fetchers = (
        main_module.fetch_soilgrids,
        main_module.fetch_open_meteo,
        main_module.fetch_nasa_power,
    )
    for fetcher in cached_fetchers:
        fetcher.cache_clear()
    try:
        assert main_module.fetch_soilgrids(35.0, 9.0) == main_module.fetch_soilgrids(
            35.0, 9.0
        )
        assert main_module.fetch_open_meteo(
            35.0, 9.0, "2025-11-01", "2026-10-31"
        ) == main_module.fetch_open_meteo(35.0, 9.0, "2025-11-01", "2026-10-31")
        assert main_module.fetch_nasa_power(35.0, 9.0) == main_module.fetch_nasa_power(
            35.0, 9.0
        )
        assert calls == ["SoilGrids", "Open-Meteo", "NASA POWER"]
    finally:
        for fetcher in cached_fetchers:
            fetcher.cache_clear()
