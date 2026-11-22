import json
import os
import re
from time import perf_counter
from uuid import uuid4

import pytest
os.environ["DATABASE_URL"] = "sqlite:///./test-ardi.db"

from fastapi import FastAPI, HTTPException
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


def test_sprint_16_fixture_is_cached_and_served_under_ten_seconds():
    main_module.load_sprint_16_fixture.cache_clear()
    started_at = perf_counter()
    try:
        with TestClient(app) as client:
            first = client.get("/fixture/sprint-16")
            second = client.get("/fixture/sprint-16")
        elapsed = perf_counter() - started_at

        assert first.status_code == 200
        assert second.status_code == 200
        assert first.json()["analysis"]["parcel_id"] == "parcel-sprint-16-offline"
        assert first.json()["ranking"]["recommendations"]
        assert first.json()["parcel_to_upload"]["location_consent_required"] is True
        assert first.json()["location_consent_notice"]["required"] is True
        assert "2004-63" in first.json()["location_consent_notice"]["law"]
        assert first.json()["photo"]["status"] == "pending_upload"
        assert main_module.load_sprint_16_fixture.cache_info().hits == 1
        assert elapsed < 10
    finally:
        main_module.load_sprint_16_fixture.cache_clear()


def test_sprint_16_production_redirects_http_to_https(monkeypatch):
    secure_app = FastAPI()
    monkeypatch.setenv("ARDI_ENV", "production")
    main_module.configure_https_redirect(secure_app)

    @secure_app.get("/probe")
    def secure_probe():
        return {"status": "ok"}

    with TestClient(secure_app) as client:
        response = client.get("/probe", follow_redirects=False)

    assert response.status_code == 307
    assert response.headers["location"] == "https://testserver/probe"


def test_fixture_demo_loaded():
    with TestClient(app) as client:
        response = client.get("/parcelles?owner_id=user-demo")
        assert response.status_code == 200
        assert any(p["id"] == "parcel-demo" for p in response.json())


def test_sprint_17_parcels_are_scoped_to_the_requested_farmer():
    with TestClient(app) as client:
        fixture = client.get("/fixture/sprint-17")
        owned = client.get("/parcelles?owner_id=user-sprint-17")
        other_owner = client.get("/parcelles?owner_id=user-sprint-16")
        missing_owner = client.get("/parcelles")
        foreign_parcel = client.get(
            "/parcelles/parcel-sprint-17-live?owner_id=user-sprint-16"
        )

    assert fixture.status_code == 200
    assert owned.status_code == 200
    assert {parcel["id"] for parcel in owned.json()} == {
        "parcel-sprint-17-frozen",
        "parcel-sprint-17-live",
    }
    assert other_owner.status_code == 200
    assert "parcel-sprint-17-live" not in {
        parcel["id"] for parcel in other_owner.json()
    }
    assert missing_owner.status_code == 422
    assert foreign_parcel.status_code == 404


def test_sprint_17_price_updates_change_live_ranking_but_not_frozen_plan():
    originals = None
    try:
        with TestClient(app) as client:
            db_generator = main_module.get_db()
            db = next(db_generator)
            pomegranate = db.get(main_module.models.Culture, "pomegranate")
            detail = db.get(main_module.models.CultureDetail, "pomegranate")
            frozen_plan = db.get(main_module.models.Plan, "plan-sprint-17-frozen")
            adopted_plan_id = "plan-sprint-07-parcel-sprint-17-live"
            existing_adopted_plan = db.get(
                main_module.models.Plan, adopted_plan_id
            )
            original_plan_data = json.loads(json.dumps(frozen_plan.data))
            originals = (
                pomegranate.price_tnd_t,
                detail.price_range_tnd_t,
                detail.price_source,
                detail.price_updated_at,
                (
                    json.loads(json.dumps(existing_adopted_plan.data))
                    if existing_adopted_plan is not None
                    else None
                ),
            )
            fixture_price = next(
                price
                for price in client.get("/fixture/sprint-17").json()["prices"]
                if price["culture_id"] == "pomegranate"
            )
            pomegranate.price_tnd_t = fixture_price["typical_tnd_t"]
            detail.price_range_tnd_t = {
                "min": fixture_price["min_tnd_t"],
                "typical": fixture_price["typical_tnd_t"],
                "max": fixture_price["max_tnd_t"],
            }
            detail.price_source = fixture_price["source"]
            detail.price_updated_at = fixture_price["effective_date"]
            db.commit()
            db.close()
            db_generator.close()

            adopted = client.post(
                "/parcelles/parcel-sprint-17-live/plan",
                json={
                    "allocations": [
                        {"crop_id": "pomegranate", "area_ha": 1.5}
                    ]
                },
            )
            assert adopted.status_code == 200
            adopted_plan = next(
                row
                for row in client.get("/plans").json()
                if row["id"] == adopted_plan_id
            )
            assert adopted_plan["data"]["price_snapshot"]["pomegranate"] == {
                "price_tnd_t": 2200,
                "price_range_tnd_t": {
                    "min": 1400,
                    "typical": 2200,
                    "max": 3200,
                },
                "source": "ONAGRI - snapshot de demonstration",
                "effective_date": "2026-11-01",
            }

            before = client.get(
                "/parcelles/parcel-sprint-17-live/recommandations"
            ).json()
            updated = client.put(
                "/cultures/pomegranate/price",
                json={
                    "min_tnd_t": 500,
                    "typical_tnd_t": 900,
                    "max_tnd_t": 1300,
                    "source": "Marche de gros - mise a jour de demonstration",
                    "effective_date": "2026-11-22",
                },
            )
            after = client.get(
                "/parcelles/parcel-sprint-17-live/recommandations"
            ).json()
            invalid_range = client.put(
                "/cultures/pomegranate/price",
                json={
                    "min_tnd_t": 1000,
                    "typical_tnd_t": 900,
                    "max_tnd_t": 1300,
                    "source": "source test",
                    "effective_date": "2026-11-22",
                },
            )

            assert before["recommendations"][0]["id"] == "pomegranate"
            assert updated.status_code == 200
            assert updated.json()["price_tnd_t"] == 900
            assert updated.json()["price_updated_at"] == "2026-11-22"
            assert updated.json()["price_source"] == (
                "Marche de gros - mise a jour de demonstration"
            )
            assert after["recommendations"][0]["id"] == "olive"
            assert invalid_range.status_code == 422

        with TestClient(app) as client:
            persisted_price = client.get("/cultures/pomegranate").json()
            plan = next(
                row
                for row in client.get("/plans").json()
                if row["id"] == "plan-sprint-17-frozen"
            )
            adopted_plan = next(
                row
                for row in client.get("/plans").json()
                if row["id"] == "plan-sprint-07-parcel-sprint-17-live"
            )
            assert persisted_price["price_tnd_t"] == 900
            assert persisted_price["price_updated_at"] == "2026-11-22"
            assert plan["data"] == original_plan_data
            assert (
                adopted_plan["data"]["price_snapshot"]["pomegranate"][
                    "price_tnd_t"
                ]
                == 2200
            )
    finally:
        if originals is not None:
            (
                price,
                price_range,
                source,
                effective_date,
                original_adopted_plan_data,
            ) = originals
            db_generator = main_module.get_db()
            db = next(db_generator)
            pomegranate = db.get(main_module.models.Culture, "pomegranate")
            detail = db.get(main_module.models.CultureDetail, "pomegranate")
            adopted_plan = db.get(
                main_module.models.Plan, "plan-sprint-07-parcel-sprint-17-live"
            )
            pomegranate.price_tnd_t = price
            detail.price_range_tnd_t = price_range
            detail.price_source = source
            detail.price_updated_at = effective_date
            if original_adopted_plan_data is None:
                if adopted_plan is not None:
                    db.delete(adopted_plan)
            elif adopted_plan is not None:
                adopted_plan.data = original_adopted_plan_data
            db.commit()
            db.close()
            db_generator.close()

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


def test_sprint_12_ten_parcels_use_formula_based_water_and_energy():
    with TestClient(app) as client:
        response = client.get("/fixture/sprint-12")
        public_label = client.get("/labels/ARDI-S12-FARM-001")

    assert response.status_code == 200
    assert public_label.status_code == 200
    assert (
        public_label.json()["product"]["id"]
        == "product-sprint-12-olive-oil"
    )
    data = response.json()
    parcels = data["parcelles"]
    assert len(parcels) == 10
    assert len(data["analyses"]) == 10
    assert [card["id"] for card in data["demo_cards"]] == [
        "language",
        "parcel",
        "analysis",
        "ranking",
        "simulator",
        "label",
        "assistant",
        "purchase",
    ]
    assert data["assistant"]["question_darija"]
    assert data["qr"]["value"] == data["label"]["qr_code"]

    water_settings = data["water"]
    analyses = {item["parcel_id"]: item for item in data["analyses"]}
    results = {item["parcel_id"]: item for item in data["parcel_calculations"]}
    assert set(results) == {parcel["id"] for parcel in parcels}
    for parcel in parcels:
        expected_water = round(
            parcel["pump_flow_m3_h"]
            * water_settings["pump_hours_per_day"]
            * water_settings["season_days"],
            2,
        )
        expected_energy = round(
            0.00272 * parcel["well_depth_m"] / water_settings["eta"],
            4,
        )
        assert analyses[parcel["id"]]["available_water_m3"] == expected_water
        assert analyses[parcel["id"]]["pumping_energy_kwh_m3"] == expected_energy
        result = results[parcel["id"]]
        assert result["available_water_m3"] == expected_water
        assert result["energy_kwh_m3"] == expected_energy
        assert isinstance(result["excluded_crops"], list)
        assert result["calculation_time_ms"] < 10_000

    ranked_ids = {row["id"] for row in data["ranking"]["recommendations"]}
    excluded_ids = {row["id"] for row in data["ranking"]["excluded_crops"]}
    assert not ranked_ids & excluded_ids
    assert data["total_calculation_time_ms"] < 10_000


def test_sprint_13_solar_sizing_compares_costs_and_changes_with_well_depth():
    with TestClient(app) as client:
        fixture = client.get("/fixture/sprint-13")
        base_response = client.get("/parcelles/parcel-sprint-13/solaire")
        base = base_response.json()

        def set_parcel_values(depth, flow):
            session_generator = main_module.get_db()
            db = next(session_generator)
            parcel = db.get(main_module.models.Parcelle, "parcel-sprint-13")
            parcel.well_depth_m = depth
            parcel.pump_flow_m3_h = flow
            db.commit()
            session_generator.close()

        original_depth = base["well_depth_m"]
        original_flow = base["pump_flow_m3_h"]
        try:
            set_parcel_values(90, original_flow)
            deeper_well = client.get("/parcelles/parcel-sprint-13/solaire")
            set_parcel_values(None, original_flow)
            missing_depth = client.get("/parcelles/parcel-sprint-13/solaire")
            set_parcel_values(original_depth, None)
            missing_flow = client.get("/parcelles/parcel-sprint-13/solaire")
            missing_parcel = client.get("/parcelles/unknown-parcel/solaire")
        finally:
            set_parcel_values(original_depth, original_flow)

    assert fixture.status_code == 200
    assert base_response.status_code == 200
    assert base["available"] is True
    assert base["solar_irradiance_kwh_m2_day"] == 5.4
    assert base["sources"]["solar_irradiance"].startswith("NASA POWER")
    assert base["energy_kwh_m3"] == round(
        0.00272 * base["well_depth_m"] / fixture.json()["system"]["eta"],
        4,
    )
    assert base["daily_water_m3"] == 108
    assert base["panel_count"] == 20
    assert base["tank_volume_liters"] == 54_000
    assert set(base["annual_costs_tnd"]) == {"solar_maintenance", "diesel", "steg"}
    assert base["payback_years"]["vs_diesel"] is not None
    assert base["payback_years"]["vs_steg"] is not None
    assert base["assistance_information"]
    assert deeper_well.status_code == 200
    assert (
        deeper_well.json()["required_array_kwp"] > base["required_array_kwp"]
    )
    assert missing_depth.status_code == 200
    assert missing_depth.json()["available"] is False
    assert missing_depth.json()["reason"] == "well_depth_required"
    assert missing_flow.status_code == 200
    assert missing_flow.json()["available"] is False
    assert missing_flow.json()["reason"] == "pump_flow_required"
    assert missing_parcel.status_code == 404


def test_sprint_13_solar_sizing_rejects_non_finite_inputs():
    fixture_path = main_module.FIXTURES_DIR / "sprint-13.json"
    settings = json.loads(fixture_path.read_text(encoding="utf-8"))["system"]
    inputs = [60, 18, 5.4]

    for index in range(len(inputs)):
        invalid_inputs = inputs.copy()
        invalid_inputs[index] = float("nan")
        with pytest.raises(HTTPException) as error:
            main_module.calculate_solar_sizing(*invalid_inputs, settings)
        assert error.value.status_code == 422

    invalid_settings = settings.copy()
    invalid_settings["eta"] = float("nan")
    with pytest.raises(HTTPException) as error:
        main_module.calculate_solar_sizing(*inputs, invalid_settings)
    assert error.value.status_code == 422


def test_sprint_14_satellite_tracking_processes_images_and_calculates_alerts():
    alert_ids = (
        "alert-sprint-14-irrigation-plan",
        "alert-sprint-14-stress-zone-sprint-14-nord",
        "alert-sprint-14-rain",
    )

    def clear_sprint_14_state():
        session_generator = main_module.get_db()
        db = next(session_generator)
        tracking = db.get(main_module.models.SuiviSatellite, "parcel-sprint-14")
        if tracking is not None:
            db.delete(tracking)
        for alert_id in alert_ids:
            alert = db.get(main_module.models.Alerte, alert_id)
            if alert is not None:
                db.delete(alert)
        db.commit()
        session_generator.close()

    clear_sprint_14_state()
    try:
        with TestClient(app) as client:
            fixture_response = client.get("/fixture/sprint-14")
            first = client.get("/parcelles/parcel-sprint-14/suivi")
            second = client.get("/parcelles/parcel-sprint-14/suivi")
            persisted_alerts = client.get("/alertes")
            missing = client.get("/parcelles/unknown-parcel/suivi")

        fixture = fixture_response.json()
        first_data = first.json()
        second_data = second.json()
        irrigation_alert = next(
            alert
            for alert in second_data["alerts"]
            if alert["type"] == "irrigation_non_conforme"
        )
        alert_types = {alert["type"] for alert in second_data["alerts"]}
        persisted_ids = {alert["id"] for alert in persisted_alerts.json()}

        assert fixture_response.status_code == 200
        assert len(fixture["ndvi_monthly"]) == 12
        assert all(
            image["source"].startswith("Sentinel-2")
            for image in fixture["images"]
        )
        assert first.status_code == 200
        assert first_data["image_update"]["pending_images"] == 2
        assert second_data["image_update"]["pending_images"] == 0
        assert (
            second_data["image_update"]["last_image_id"]
            == fixture["images"][-1]["id"]
        )
        assert second_data["water_usage"]["usage_percent"] == 110
        assert second_data["water_usage"]["excess_water_m3"] == 12
        assert irrigation_alert["status"] == "écart confirmé"
        assert len(irrigation_alert["evidence_image_ids"]) == 2
        assert alert_types == {
            "irrigation_non_conforme",
            "stress_hydrique",
            "pluie_prevue",
        }
        assert set(alert_ids) <= persisted_ids
        assert missing.status_code == 404

        one_image_diverges = json.loads(
            (main_module.FIXTURES_DIR / "sprint-14.json").read_text(
                encoding="utf-8"
            )
        )
        one_image_diverges["images"][1]["irrigation_deviation_detected"] = False
        candidate_alerts = main_module.evaluate_sprint_14_alerts(
            one_image_diverges, one_image_diverges["zones"]
        )
        candidate = next(
            alert
            for alert in candidate_alerts
            if alert["type"] == "irrigation_non_conforme"
        )
        assert candidate["status"] == "à confirmer"
        assert len(candidate["evidence_image_ids"]) == 1
    finally:
        clear_sprint_14_state()


def test_sprint_15_buyer_impact_aggregates_and_exports_purchase_lines():
    with TestClient(app) as client:
        fixture = client.get("/fixture/sprint-15")
        retail_impact = client.get(
            "/acheteurs/user-sprint-15-buyer/impact"
        )
        professional_impact = client.get(
            "/acheteurs/user-sprint-15-professional/impact"
        )
        export = client.get(
            "/acheteurs/user-sprint-15-buyer/impact/export"
        )
        missing_buyer = client.get("/acheteurs/unknown-buyer/impact")

    retail = retail_impact.json()
    professional = professional_impact.json()
    assert fixture.status_code == 200
    assert fixture.json()["orders"][-1]["status"] == "wholesale_pending"
    assert retail_impact.status_code == 200
    assert retail["buyer_role"] == "buyer"
    assert retail["order_count"] == 2
    assert retail["total_quantity_kg"] == 16
    assert retail["water_supported_m3"] == 28
    assert retail["energy_supported_kwh"] == 8.6
    assert retail["farms_count"] == 2
    assert retail["label_a_share_percent"] == 25
    assert professional_impact.status_code == 200
    assert professional["buyer_role"] == "professional"
    assert professional["wholesale_order_count"] == 1
    assert professional["water_supported_m3"] == 75
    assert professional["energy_supported_kwh"] == 22.5
    assert export.status_code == 200
    assert export.headers["content-type"].startswith("text/csv")
    assert "water_supported_m3" in export.text
    assert "order-sprint-15-buyer-olive" in export.text
    assert any(
        product["id"] == "product-sprint-15-olive-oil"
        for product in fixture.json()["products"]
    )
    assert missing_buyer.status_code == 404


def test_sprint_15_wholesale_orders_are_professional_and_unpaid():
    def clear_created_orders():
        session_generator = main_module.get_db()
        db = next(session_generator)
        try:
            orders = (
                db.query(main_module.models.Commande)
                .filter(
                    main_module.models.Commande.buyer_id
                    == "user-sprint-15-professional",
                    main_module.models.Commande.id.like(
                        "order-sprint-15-wholesale-%"
                    ),
                    main_module.models.Commande.id
                    != "order-sprint-15-wholesale-demo",
                )
                .all()
            )
            for order in orders:
                db.delete(order)
            db.commit()
        finally:
            session_generator.close()

    clear_created_orders()
    try:
        with TestClient(app) as client:
            created = client.post(
                "/commandes/gros",
                json={
                    "buyer_id": "user-sprint-15-professional",
                    "product_id": "product-sprint-15-dates",
                    "quantity_kg": 25,
                },
            )
            retail_rejected = client.post(
                "/commandes/gros",
                json={
                    "buyer_id": "user-sprint-15-buyer",
                    "product_id": "product-sprint-15-dates",
                    "quantity_kg": 25,
                },
            )
            payment_rejected = client.post(
                "/commandes/gros",
                json={
                    "buyer_id": "user-sprint-15-professional",
                    "product_id": "product-sprint-15-dates",
                    "quantity_kg": 25,
                    "payment_method": "card",
                },
            )
            listed = client.get("/commandes/gros")

        assert created.status_code == 201
        order = created.json()
        assert order["order_type"] == "wholesale"
        assert order["status"] == "wholesale_pending"
        assert order["payment_method"] is None
        assert order["payment_status"] is None
        assert order["total_tnd"] is None
        assert retail_rejected.status_code == 403
        assert payment_rejected.status_code == 422
        assert order["id"] in {row["id"] for row in listed.json()}
    finally:
        clear_created_orders()


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
        parcel["location_consent"] = True

        response = client.post("/parcelles", json=parcel)

        assert response.status_code == 201
        assert response.json()["area_ha"] == 2.4
        assert response.json()["area_ha"] != 99
        assert response.json()["location_consent"] is True


def test_parcel_post_requires_explicit_location_consent():
    with TestClient(app) as client:
        parcel = client.get("/fixture/sprint-16").json()["parcel_to_upload"]
        payload = {
            key: value
            for key, value in parcel.items()
            if key != "location_consent_required"
        }
        payload["id"] = f"parcel-test-{uuid4()}"
        payload["location_consent"] = False
        rejected = client.post("/parcelles", json=payload)

        payload.pop("location_consent")
        missing_consent = client.post("/parcelles", json=payload)

    assert rejected.status_code == 403
    assert "Explicit consent" in rejected.json()["detail"]
    assert missing_consent.status_code == 422
    session_generator = main_module.get_db()
    db = next(session_generator)
    assert db.get(main_module.models.Parcelle, payload["id"]) is None
    session_generator.close()


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
        "location_consent": True,
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
        "location_consent": True,
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
        "location_consent": True,
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
