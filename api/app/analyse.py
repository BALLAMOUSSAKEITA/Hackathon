"""Analyse sol, climat, eau et énergie d'une parcelle.

Les appels SoilGrids, Open-Meteo et NASA POWER sont mis en cache.
S'ils échouent, les chiffres figés de fixtures/sprint-05.json prennent le relais.
Le kWh/m³ est toujours calculé : 0,00272 × H / η.
"""

import math
from concurrent.futures import ThreadPoolExecutor
from datetime import date

import truststore

truststore.inject_into_ssl()

import httpx
from fastapi import APIRouter, HTTPException

from app.database import SessionLocal, load_fixture
from app.models import Analyse, Parcelle, Utilisateur

router = APIRouter()

_CACHE: dict[tuple, dict] = {}
_TIMEOUT = httpx.Timeout(4.0, connect=2.0)


def kwh_par_m3(profondeur_m: float, eta: float) -> float:
    valeur = 0.00272 * profondeur_m / eta
    return math.floor(valeur * 100 + 0.5) / 100


def _arrondi(valeur: float, decimales: int) -> float:
    facteur = 10**decimales
    return math.floor(valeur * facteur + 0.5) / facteur


def _centre(parcelle: Parcelle) -> tuple[float, float]:
    anneau = parcelle.geometrie["coordinates"][0]
    points = anneau[:-1] if anneau[0] == anneau[-1] else anneau
    lon = sum(point[0] for point in points) / len(points)
    lat = sum(point[1] for point in points) / len(points)
    return lat, lon


def _assurer_parcelle(session, parcelle_id: str) -> Parcelle:
    parcelle = session.get(Parcelle, parcelle_id)
    if parcelle is not None:
        return parcelle
    fiche = load_fixture("05")
    if parcelle_id != fiche["parcelle"]["id"]:
        raise HTTPException(status_code=404, detail="parcelle introuvable")
    proprietaire = fiche["proprietaire"]
    if session.get(Utilisateur, proprietaire["id"]) is None:
        session.add(
            Utilisateur(
                id=proprietaire["id"],
                telephone=proprietaire["telephone"],
                nom=proprietaire["nom"],
                role=proprietaire["role"],
                langue=proprietaire["langue"],
            )
        )
        session.flush()
    demo = fiche["parcelle"]
    parcelle = Parcelle(
        id=demo["id"],
        proprietaire_id=proprietaire["id"],
        nom=demo["nom"],
        geometrie=demo["geometrie"],
        surface_ha=demo["surface_ha"],
        source_eau=demo["source_eau"],
        profondeur_puits_m=demo["profondeur_puits_m"],
        debit_m3_h=demo["debit_m3_h"],
        energie=demo["energie"],
        culture_actuelle=demo["culture_actuelle"],
        photo_sol=None,
    )
    session.add(parcelle)
    session.commit()
    return parcelle


def _texture(sable: float, limon: float, argile: float) -> dict:
    if sable >= limon and sable >= argile:
        return {"fr": "sableux", "ar": "رملي", "darija": "ramli"}
    if argile >= sable and argile >= limon:
        return {"fr": "argileux", "ar": "طيني", "darija": "tini"}
    return {"fr": "limoneux", "ar": "طميي", "darija": "torba mextalta"}


def _moyenne_couche(payload: dict, nom: str) -> float | None:
    for couche in payload.get("properties", {}).get("layers", []):
        if couche.get("name") != nom:
            continue
        facteur = couche.get("unit_measure", {}).get("d_factor") or 1
        moyenne = couche["depths"][0]["values"].get("mean")
        if moyenne is None:
            return None
        return float(moyenne) / float(facteur or 1)
    return None


def _sol_distant(lat: float, lon: float) -> dict:
    params = [("lon", lon), ("lat", lat), ("depth", "0-5cm"), ("value", "mean")]
    for propriete in ("sand", "silt", "clay", "phh2o", "soc"):
        params.append(("property", propriete))
    reponse = httpx.get(
        "https://rest.isric.org/soilgrids/v2.0/properties/query",
        params=params,
        timeout=_TIMEOUT,
        headers={"User-Agent": "Ardi/0.1"},
    )
    reponse.raise_for_status()
    corps = reponse.json()
    sable = _moyenne_couche(corps, "sand")
    limon = _moyenne_couche(corps, "silt")
    argile = _moyenne_couche(corps, "clay")
    ph = _moyenne_couche(corps, "phh2o")
    carbone = _moyenne_couche(corps, "soc")
    if None in (sable, limon, argile, ph, carbone):
        raise ValueError("couche SoilGrids incomplète")
    if sable > 100 or limon > 100 or argile > 100:
        sable, limon, argile = sable / 10, limon / 10, argile / 10
    if ph > 14:
        ph = ph / 10
    return {
        "texture": _texture(sable, limon, argile),
        "sable_pct": _arrondi(sable, 0),
        "limon_pct": _arrondi(limon, 0),
        "argile_pct": _arrondi(argile, 0),
        "ph": _arrondi(ph, 1),
        "matiere_organique_g_kg": _arrondi(carbone, 1),
        "source": "SoilGrids",
        "fige": False,
    }


def _climat_distant(lat: float, lon: float) -> dict:
    reponse = httpx.get(
        "https://api.open-meteo.com/v1/forecast",
        params={
            "latitude": lat,
            "longitude": lon,
            "daily": "temperature_2m_mean,precipitation_sum,et0_fao_evapotranspiration",
            "forecast_days": 16,
            "timezone": "auto",
        },
        timeout=_TIMEOUT,
        headers={"User-Agent": "Ardi/0.1"},
    )
    reponse.raise_for_status()
    journalier = reponse.json()["daily"]

    def nombres(cle: str) -> list[float]:
        return [float(valeur) for valeur in journalier[cle] if valeur is not None]

    pluies = nombres("precipitation_sum")
    temperatures = nombres("temperature_2m_mean")
    et0 = nombres("et0_fao_evapotranspiration")
    if not pluies or not temperatures or not et0:
        raise ValueError("série Open-Meteo vide")
    return {
        "pluie_mm": _arrondi(sum(pluies), 0),
        "temperature_c": _arrondi(sum(temperatures) / len(temperatures), 1),
        "et0_mm_jour": _arrondi(sum(et0) / len(et0), 1),
        "fenetre_jours": len(pluies),
        "source": "Open-Meteo",
        "fige": False,
    }


def _soleil_distant(lat: float, lon: float) -> dict:
    reponse = httpx.get(
        "https://power.larc.nasa.gov/api/temporal/climatology/point",
        params={
            "parameters": "ALLSKY_SFC_SW_DWN",
            "community": "AG",
            "longitude": lon,
            "latitude": lat,
            "format": "JSON",
        },
        timeout=_TIMEOUT,
        headers={"User-Agent": "Ardi/0.1"},
    )
    reponse.raise_for_status()
    corps = reponse.json()
    annuel = corps["properties"]["parameter"]["ALLSKY_SFC_SW_DWN"]["ANN"]
    if annuel is None or float(annuel) < 0:
        raise ValueError("NASA POWER sans moyenne annuelle")
    valeur = float(annuel)
    unites = str(corps.get("parameters", {}).get("ALLSKY_SFC_SW_DWN", {}).get("units", ""))
    if unites.startswith("MJ"):
        valeur = valeur / 3.6
    return {
        "kwh_m2_jour": _arrondi(valeur, 1),
        "source": "NASA POWER",
        "fige": False,
    }


def _bloc(nom: str, lat: float, lon: float, lire) -> tuple[dict | None, bool]:
    cle = (nom, round(lat, 3), round(lon, 3))
    if cle in _CACHE:
        return _CACHE[cle], True
    try:
        valeur = lire(lat, lon)
    except Exception:
        return None, False
    _CACHE[cle] = valeur
    return valeur, False


def _collecter(lat: float, lon: float, fige: dict) -> tuple[dict, dict, dict, bool]:
    lectures = (
        ("sol", _sol_distant),
        ("climat", _climat_distant),
        ("soleil", _soleil_distant),
    )
    with ThreadPoolExecutor(max_workers=3) as executant:
        resultats = list(executant.map(lambda couple: _bloc(couple[0], lat, lon, couple[1]), lectures))
    sol, sol_cache = resultats[0]
    climat, climat_cache = resultats[1]
    soleil, soleil_cache = resultats[2]
    cache = bool(sol and climat and soleil and sol_cache and climat_cache and soleil_cache)
    return sol or fige["sol"], climat or fige["climat"], soleil or fige["ensoleillement"], cache


def construire_analyse(parcelle: Parcelle) -> dict:
    fiche = load_fixture("05")
    calcul = fiche["calcul"]
    fige = fiche["analyse"]
    lat, lon = _centre(parcelle)
    sol, climat, soleil, cache = _collecter(lat, lon, fige)
    eta = float(calcul["eta"])
    heures = int(calcul["heures_pompage_par_jour"])
    jours = int(calcul["jours_saison"])
    eau = round(parcelle.debit_m3_h * heures * jours)
    return {
        "sol": sol,
        "climat": climat,
        "ensoleillement": soleil,
        "eau_disponible_m3": eau,
        "kwh_m3": kwh_par_m3(parcelle.profondeur_puits_m, eta),
        "eta": eta,
        "profondeur_puits_m": parcelle.profondeur_puits_m,
        "debit_m3_h": parcelle.debit_m3_h,
        "heures_pompage_par_jour": heures,
        "jours_saison": jours,
        "ndvi": fige["ndvi"],
        "source_ndvi": fige["source_ndvi"],
        "cache": cache,
    }


@router.post("/parcelles/{parcelle_id}/analyse")
def lancer_analyse(parcelle_id: str) -> dict:
    with SessionLocal() as session:
        parcelle = _assurer_parcelle(session, parcelle_id)
        profondeur = parcelle.profondeur_puits_m
        debit = parcelle.debit_m3_h
        geometrie = parcelle.geometrie
        identifiant_parcelle = parcelle.id
    mesure = Parcelle(
        id=identifiant_parcelle,
        proprietaire_id="usr-demo",
        nom="mesure",
        geometrie=geometrie,
        surface_ha=0,
        source_eau="puits",
        profondeur_puits_m=profondeur,
        debit_m3_h=debit,
        energie="gasoil",
        culture_actuelle={},
    )
    corps = construire_analyse(mesure)
    valeurs = {
        "date": date.today().isoformat(),
        "sol": corps["sol"],
        "climat": {**corps["climat"], "ensoleillement": corps["ensoleillement"]},
        "eau_disponible_m3": corps["eau_disponible_m3"],
        "kwh_m3": corps["kwh_m3"],
        "ndvi": {"serie": corps["ndvi"], "source": corps["source_ndvi"]},
    }
    with SessionLocal() as session:
        ligne = session.get(Analyse, f"an-{identifiant_parcelle}")
        if ligne is None:
            session.add(Analyse(id=f"an-{identifiant_parcelle}", parcelle_id=identifiant_parcelle, **valeurs))
        else:
            for cle, valeur in valeurs.items():
                setattr(ligne, cle, valeur)
        session.commit()
    corps["parcelle_id"] = identifiant_parcelle
    return corps
