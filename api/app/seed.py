from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import engine, load_fixture
from app.models import Culture, Label, Parcelle, Produit, Utilisateur


def seed_demo(session: Session) -> None:
    fixture = load_fixture()
    agriculteur = fixture["ferme"]["agriculteur"]
    if session.get(Utilisateur, agriculteur["id"]) is not None:
        return

    session.add(
        Utilisateur(
            id=agriculteur["id"],
            telephone=agriculteur["telephone"],
            nom=agriculteur["nom"],
            role=agriculteur["role"],
            langue=agriculteur["langue"],
        )
    )
    parcelle = fixture["parcelle"]
    session.add(
        Parcelle(
            id=parcelle["id"],
            proprietaire_id=agriculteur["id"],
            nom=parcelle["nom"],
            geometrie=parcelle["geometrie"],
            surface_ha=parcelle["surface_ha"],
            source_eau=parcelle["source_eau"],
            profondeur_puits_m=parcelle["profondeur_puits_m"],
            debit_m3_h=parcelle["debit_m3_h"],
            energie=parcelle["energie"],
            culture_actuelle=parcelle["culture_actuelle"],
        )
    )
    produit = fixture["produit"]
    label = produit["label"]
    session.add(
        Label(
            id=label["id"],
            ferme_id=fixture["ferme"]["id"],
            note=label["note"],
            statut=label["statut"],
            qr=label["qr"],
        )
    )
    session.add(
        Produit(
            id=produit["id"],
            ferme_id=fixture["ferme"]["id"],
            nom=produit["nom"],
            prix=produit["prix_dt"],
            unite=produit["unite"],
            stock=produit["stock"],
            label_id=label["id"],
        )
    )
    session.commit()

    if engine.dialect.name == "postgresql":
        session.execute(
            text(
                "UPDATE parcelles "
                "SET geometrie_postgis = ST_SetSRID(ST_GeomFromGeoJSON(geometrie::text), 4326) "
                "WHERE id = :id"
            ),
            {"id": parcelle["id"]},
        )
        session.commit()


def seed_cultures(session: Session) -> None:
    if session.get(Culture, "olivier") is not None:
        return
    for culture in load_fixture("03")["cultures"]:
        session.add(
            Culture(
                id=culture["id"],
                nom=culture["nom"],
                kc_par_stade=culture["kc"],
                rendement=culture["rendement_t_ha"],
                prix=culture["prix"]["typique"],
                sols_compatibles=culture["sols"],
                tolerances={
                    "sel": culture["tolerance_sel"],
                    "chaleur": culture["tolerance_chaleur"],
                },
                delai_production=culture["delai"]["fr"],
                fiche=culture,
            )
        )
    session.commit()
