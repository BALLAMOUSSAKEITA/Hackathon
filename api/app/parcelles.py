import base64
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from app.database import API_DIR, SessionLocal, engine, load_fixture
from app.models import Parcelle, Utilisateur
from app.surface import PolygoneInvalide, surface_hectares

router = APIRouter()

SOURCES_EAU = {"puits", "gda", "reseau"}
ENERGIES = {"gasoil", "reseau", "solaire"}
IDENTIFIANT = re.compile(r"^parc-[a-z0-9-]{2,40}$")


class ParcelleEntree(BaseModel):
    id: str | None = None
    nom: str | None = None
    geometrie: dict
    surface_ha: float | None = None
    source_eau: str
    profondeur_puits_m: float
    debit_m3_h: float
    energie: str
    culture_actuelle: dict | str
    photo_sol: str | None = None


def _proprietaire(session) -> Utilisateur:
    fiche = load_fixture("04")["proprietaire"]
    utilisateur = session.get(Utilisateur, fiche["id"])
    if utilisateur is None:
        utilisateur = Utilisateur(
            id=fiche["id"],
            telephone=fiche["telephone"],
            nom=fiche["nom"],
            role=fiche["role"],
            langue=fiche["langue"],
        )
        session.add(utilisateur)
        session.flush()
    return utilisateur


def _culture(valeur: dict | str) -> dict:
    if isinstance(valeur, str):
        return {"id": valeur, "nom": {"fr": valeur, "ar": valeur, "darija": valeur}}
    identifiant = valeur.get("id")
    nom = valeur.get("nom")
    if not isinstance(identifiant, str) or not identifiant:
        raise HTTPException(status_code=422, detail="culture actuelle manquante")
    if not isinstance(nom, dict) or not all(nom.get(langue) for langue in ("fr", "ar", "darija")):
        nom = {"fr": identifiant, "ar": identifiant, "darija": identifiant}
    return {"id": identifiant, "nom": nom}


def _stocker_photo(parcelle_id: str, photo: str | None) -> str | None:
    if not photo or not photo.startswith("data:image/") or "," not in photo:
        return None
    try:
        code = photo.split(",", 1)[1]
        brut = base64.b64decode(code, validate=True)
        if not brut or len(brut) > 2_000_000:
            return None
        dossier = API_DIR / "stockage"
        dossier.mkdir(exist_ok=True)
        chemin = dossier / f"{parcelle_id}.img"
        chemin.write_bytes(brut)
        return chemin.name
    except Exception:
        return None


def _reponse(parcelle: Parcelle) -> dict:
    return {
        "id": parcelle.id,
        "proprietaire_id": parcelle.proprietaire_id,
        "nom": parcelle.nom,
        "geometrie": parcelle.geometrie,
        "surface_ha": parcelle.surface_ha,
        "source_eau": parcelle.source_eau,
        "profondeur_puits_m": parcelle.profondeur_puits_m,
        "debit_m3_h": parcelle.debit_m3_h,
        "energie": parcelle.energie,
        "culture_actuelle": parcelle.culture_actuelle,
        "photo_sol": parcelle.photo_sol,
    }


def _ecrire_postgis(session, parcelle_id: str) -> None:
    if engine.dialect.name != "postgresql":
        return
    session.execute(
        text(
            "UPDATE parcelles "
            "SET geometrie_postgis = ST_SetSRID(ST_GeomFromGeoJSON(geometrie::text), 4326) "
            "WHERE id = :id"
        ),
        {"id": parcelle_id},
    )


@router.post("/parcelles")
def creer_parcelle(entree: ParcelleEntree) -> dict:
    if entree.source_eau not in SOURCES_EAU:
        raise HTTPException(status_code=422, detail="source d'eau inconnue")
    if entree.energie not in ENERGIES:
        raise HTTPException(status_code=422, detail="énergie inconnue")
    if entree.debit_m3_h <= 0:
        raise HTTPException(status_code=422, detail="le débit doit être positif")
    if entree.source_eau == "puits" and entree.profondeur_puits_m <= 0:
        raise HTTPException(status_code=422, detail="la profondeur du puits doit être positive")
    if entree.profondeur_puits_m < 0:
        raise HTTPException(status_code=422, detail="la profondeur ne peut pas être négative")
    try:
        surface = surface_hectares(entree.geometrie)
    except PolygoneInvalide as erreur:
        raise HTTPException(status_code=422, detail=str(erreur)) from erreur

    with SessionLocal() as session:
        proprietaire = _proprietaire(session)
        culture = _culture(entree.culture_actuelle)
        identifiant = entree.id if entree.id and IDENTIFIANT.match(entree.id) else None
        parcelle = session.get(Parcelle, identifiant) if identifiant else None
        if parcelle is None:
            if identifiant is None:
                identifiant = f"parc-{proprietaire.id[-4:]}-1"
                while session.get(Parcelle, identifiant):
                    suffixe = int(identifiant.rsplit("-", 1)[-1]) + 1
                    identifiant = f"parc-{proprietaire.id[-4:]}-{suffixe}"
            photo = _stocker_photo(identifiant, entree.photo_sol)
            parcelle = Parcelle(
                id=identifiant,
                proprietaire_id=proprietaire.id,
                nom=entree.nom or load_fixture("04")["parcelle"]["nom"],
                geometrie=entree.geometrie,
                surface_ha=surface,
                source_eau=entree.source_eau,
                profondeur_puits_m=entree.profondeur_puits_m,
                debit_m3_h=entree.debit_m3_h,
                energie=entree.energie,
                culture_actuelle=culture,
                photo_sol=photo,
            )
            session.add(parcelle)
        else:
            photo = _stocker_photo(parcelle.id, entree.photo_sol)
            parcelle.nom = entree.nom or parcelle.nom
            parcelle.geometrie = entree.geometrie
            parcelle.surface_ha = surface
            parcelle.source_eau = entree.source_eau
            parcelle.profondeur_puits_m = entree.profondeur_puits_m
            parcelle.debit_m3_h = entree.debit_m3_h
            parcelle.energie = entree.energie
            parcelle.culture_actuelle = culture
            parcelle.photo_sol = photo
            parcelle.proprietaire_id = proprietaire.id
        session.commit()
        _ecrire_postgis(session, parcelle.id)
        session.commit()
        session.refresh(parcelle)
        return _reponse(parcelle)


@router.get("/parcelles/{parcelle_id}")
def lire_parcelle(parcelle_id: str) -> dict:
    with SessionLocal() as session:
        parcelle = session.get(Parcelle, parcelle_id)
        if parcelle is None:
            raise HTTPException(status_code=404, detail="parcelle introuvable")
        return _reponse(parcelle)
