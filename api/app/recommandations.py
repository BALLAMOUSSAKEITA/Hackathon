"""Classement des cultures compatibles avec la parcelle du sprint 6.

Le revenu par m³ est (rendement × prix − coûts − énergie) / besoin en eau,
puis la pénalité de pluie ou de puits juste. Une culture exclue n'entre jamais
dans la liste, quel que soit le tri.
"""

import math

from fastapi import APIRouter, HTTPException

from app.database import load_fixture

router = APIRouter()

TRIS = ("revenu", "eau", "delai")
RANG = {"faible": 1, "moyenne": 2, "elevee": 3}
SEUILS = (("A", 2.2), ("B", 1.5), ("C", 1.1), ("D", 0.8))


def _centieme(valeur: float) -> float:
    return math.floor(valeur * 100 + 0.5) / 100


def _label(dt_m3: float) -> str:
    for lettre, seuil in SEUILS:
        if dt_m3 >= seuil:
            return lettre
    return "E"


def _motifs(culture: dict, fiche: dict) -> list[str]:
    motifs = []
    if fiche["sol"] not in culture["sols"]:
        motifs.append("sol")
    if RANG[culture["tolerance_sel"]] < RANG[fiche["sel"]]:
        motifs.append("sel")
    if RANG[culture["tolerance_chaleur"]] < RANG[fiche["chaleur"]]:
        motifs.append("chaleur")
    if culture["besoin_eau_m3_ha"] > fiche["eau_disponible_m3_ha"]:
        motifs.append("eau")
    return motifs


def _pourquoi(culture: dict, dt_m3: float, risques: list[str], fiche: dict) -> dict:
    eau = culture["besoin_eau_m3_ha"]
    prix = culture["prix_typique"]
    eff = fiche["efficience"]
    eta = fiche["eta"]
    suite = {
        "fr": "",
        "ar": "",
        "darija": "",
    }
    if "pluie_incertaine" in risques:
        suite["fr"] += " Pénalité : pluie incertaine."
        suite["ar"] += " خصم : مطر غير مؤكد."
        suite["darija"] += " Penalite : chtar mich sari7."
    if "puits_juste" in risques:
        suite["fr"] += " Pénalité : puits juste."
        suite["ar"] += " خصم : البئر على الحد."
        suite["darija"] += " Penalite : el bir 3al 7add."
    return {
        "fr": (
            f"{culture['nom']['fr']} : {dt_m3} DT/m³, {eau} m³/ha. "
            f"Prix {prix} DT/kg, efficience {eff}, η {eta}.{suite['fr']}"
        ),
        "ar": (
            f"{culture['nom']['ar']} : {dt_m3} د.ت/م³، {eau} م³/هك. "
            f"السعر {prix} د.ت/كغ، الكفاءة {eff}، η {eta}.{suite['ar']}"
        ),
        "darija": (
            f"{culture['nom']['darija']} : {dt_m3} DT/m³, {eau} m³/ha. "
            f"Sa3er {prix} DT/kg, efficience {eff}, η {eta}.{suite['darija']}"
        ),
    }


def _ligne(culture: dict, fiche: dict) -> dict:
    eau = culture["besoin_eau_m3_ha"]
    energie = eau * fiche["kwh_m3"] * fiche["prix_kwh_dt"]
    brut = culture["rendement_t_ha"] * 1000 * culture["prix_typique"] - culture["couts_dt_ha"] - energie
    risques = []
    facteur = 1.0
    if eau > fiche["seuil_puits"] * fiche["eau_disponible_m3_ha"]:
        facteur *= fiche["penalite_puits"]
        risques.append("puits_juste")
    if fiche["pluie_incertaine"]:
        facteur *= fiche["penalite_pluie"]
        risques.append("pluie_incertaine")
    dt_m3 = _centieme(brut / eau * facteur)
    return {
        "id": culture["id"],
        "nom": culture["nom"],
        "dt_m3": dt_m3,
        "eau_m3_ha": eau,
        "kwh_ha": round(eau * fiche["kwh_m3"]),
        "delai": culture["delai"],
        "delai_mois": culture["delai_mois"],
        "label": _label(dt_m3),
        "intercalaire": culture["intercalaire"],
        "risques": risques,
        "pourquoi": _pourquoi(culture, dt_m3, risques, fiche),
    }


def classer(fiche: dict, tri: str) -> dict:
    if tri not in TRIS:
        raise HTTPException(status_code=422, detail="tri inconnu")
    retenues = []
    exclues = []
    for culture in fiche["cultures"]:
        motifs = _motifs(culture, fiche)
        if motifs:
            exclues.append({"id": culture["id"], "nom": culture["nom"], "motifs": motifs})
        else:
            retenues.append(_ligne(culture, fiche))
    if tri == "eau":
        retenues.sort(key=lambda ligne: (ligne["eau_m3_ha"], ligne["id"]))
    elif tri == "delai":
        retenues.sort(key=lambda ligne: (ligne["delai_mois"], ligne["id"]))
    else:
        retenues.sort(key=lambda ligne: (-ligne["dt_m3"], ligne["id"]))
    actuelle = next(culture for culture in fiche["cultures"] if culture["id"] == fiche["culture_actuelle"])
    dans_liste = next((ligne for ligne in retenues if ligne["id"] == actuelle["id"]), None)
    exclusion = next((ligne for ligne in exclues if ligne["id"] == actuelle["id"]), None)
    ecart = None
    if dans_liste is not None and retenues:
        ecart = _centieme(retenues[0]["dt_m3"] - dans_liste["dt_m3"])
    return {
        "tri": tri,
        "parcelle_id": fiche["parcelle_id"],
        "cultures": retenues,
        "exclues": exclues,
        "culture_actuelle": {
            "id": actuelle["id"],
            "nom": actuelle["nom"],
            "incluse": dans_liste is not None,
            "motifs": [] if exclusion is None else exclusion["motifs"],
            "dt_m3": None if dans_liste is None else dans_liste["dt_m3"],
            "label": None if dans_liste is None else dans_liste["label"],
            "ecart_dt_m3": ecart,
            "meilleure": retenues[0]["nom"] if retenues else None,
        },
    }


@router.get("/parcelles/{parcelle_id}/recommandations")
def recommandations(parcelle_id: str, tri: str = "revenu") -> dict:
    fiche = load_fixture("06")
    if parcelle_id != fiche["parcelle_id"]:
        raise HTTPException(status_code=404, detail="parcelle introuvable")
    return classer(fiche, tri)
