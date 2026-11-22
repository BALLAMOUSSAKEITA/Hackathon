"""Connexion simulée du sprint 2. Le code SMS est fixe."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from app.database import SessionLocal, load_fixture
from app.models import Utilisateur

router = APIRouter()

ROLES = {"agriculteur", "acheteur", "professionnel"}
LANGUES = {"fr", "ar", "darija"}
CODES_EN_ATTENTE: dict[str, str] = {}


class DemandeOtp(BaseModel):
    telephone: str


class VerificationOtp(BaseModel):
    telephone: str
    code: str
    role: str
    langue: str


def _profils() -> list[dict]:
    return load_fixture("02")["profils"]


def _profil_pour(telephone: str) -> dict | None:
    return next((profil for profil in _profils() if profil["telephone"] == telephone), None)


@router.post("/auth/otp")
def demander_otp(corps: DemandeOtp) -> dict:
    profil = _profil_pour(corps.telephone)
    if profil is None:
        raise HTTPException(status_code=404, detail="Numero inconnu du fichier de demo")
    code = load_fixture("02")["code_sms"]
    CODES_EN_ATTENTE[corps.telephone] = code
    return {"message": "code envoye", "simulation": True, "code": code}


@router.post("/auth/verify")
def verifier_otp(corps: VerificationOtp) -> dict:
    if corps.role not in ROLES:
        raise HTTPException(status_code=422, detail="Role inconnu")
    if corps.langue not in LANGUES:
        raise HTTPException(status_code=422, detail="Langue inconnue")
    profil = _profil_pour(corps.telephone)
    if profil is None:
        raise HTTPException(status_code=404, detail="Numero inconnu du fichier de demo")
    if corps.role != profil["role"]:
        raise HTTPException(status_code=422, detail="Role inconnu pour ce numero")
    attendu = CODES_EN_ATTENTE.get(corps.telephone)
    if attendu is None:
        raise HTTPException(status_code=400, detail="Code non demande")
    if corps.code != attendu:
        raise HTTPException(status_code=401, detail="Code incorrect")

    with SessionLocal() as session:
        utilisateur = session.scalar(select(Utilisateur).where(Utilisateur.telephone == corps.telephone))
        if utilisateur is None:
            utilisateur = Utilisateur(
                id=profil["id"],
                telephone=profil["telephone"],
                nom=profil["nom"],
                role=corps.role,
                langue=corps.langue,
            )
            session.add(utilisateur)
        else:
            utilisateur.role = corps.role
            utilisateur.langue = corps.langue
            utilisateur.nom = profil["nom"]
        session.commit()
        session.refresh(utilisateur)
        reponse = {
            "token": f"demo-{utilisateur.id}",
            "utilisateur": {
                "id": utilisateur.id,
                "telephone": utilisateur.telephone,
                "nom": utilisateur.nom,
                "role": utilisateur.role,
                "langue": utilisateur.langue,
            },
        }
    del CODES_EN_ATTENTE[corps.telephone]
    return reponse
