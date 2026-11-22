from fastapi import APIRouter, HTTPException

from app.database import SessionLocal, load_fixture
from app.models import Culture

router = APIRouter()


def _publique(culture: Culture) -> dict:
    if culture.fiche:
        return culture.fiche
    return {
        "id": culture.id,
        "nom": culture.nom,
        "kc": culture.kc_par_stade,
        "rendement_t_ha": culture.rendement,
        "prix": {"typique": culture.prix},
        "sols": culture.sols_compatibles,
        "delai": {"fr": culture.delai_production},
    }


@router.get("/cultures")
def lister_cultures(sol: str | None = None) -> dict:
    with SessionLocal() as session:
        lignes = session.query(Culture).order_by(Culture.id).all()
        cultures = [_publique(culture) for culture in lignes]
    if sol:
        cultures = [culture for culture in cultures if sol in (culture.get("sols") or [])]
    return {"hypothese": load_fixture("03")["hypothese"], "cultures": cultures}


@router.get("/cultures/{culture_id}")
def lire_culture(culture_id: str) -> dict:
    with SessionLocal() as session:
        culture = session.get(Culture, culture_id)
        if culture is None:
            raise HTTPException(status_code=404, detail="Culture inconnue")
        return _publique(culture)
