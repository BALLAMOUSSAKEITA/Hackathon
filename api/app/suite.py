"""Routes des sprints 7 à 18. Chaque route lit le fichier de son sprint."""

import json
import math
import os
import re
from datetime import date

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import load_fixture

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

SYSTEM_PROMPT = """Tu es Ardi, un assistant agricole expert et amical pour les agriculteurs tunisiens.
Tu aides avec : les cultures adaptées au sol et au climat tunisien, l'irrigation et l'optimisation de l'eau, l'énergie solaire pour le pompage agricole, les techniques agricoles, les prix et marchés agricoles en Tunisie, le Label Eau.

RÈGLES :
1. Les salutations, remerciements et messages de politesse ("bonjour", "merci", "salam", "bahi"…) reçoivent une réponse courte et chaleureuse — refus=false.
2. Les questions clairement hors sujet (sport, politique, cuisine générale, célébrités…) reçoivent refus=true.
3. En cas de doute, réponds normalement — mieux vaut répondre que refuser.
4. La langue de réponse dépend du champ "langue" : "darija" = darija en lettres latines avec 3/7/9 pour les sons, "ar" = arabe standard, "fr" = français.
5. "traduction_fr" est TOUJOURS en français, même si texte est en darija ou arabe.
6. Réponses courtes et pratiques (2-4 phrases max).

Réponds UNIQUEMENT avec ce JSON (sans markdown, sans bloc de code) :
{"texte": "...", "traduction_fr": "...", "refus": false}

Message de refus si vraiment hors sujet :
{"texte": "Manerafedch, ana mkhasses ghir lel filaha w el ma w el ta9a.", "traduction_fr": "Désolé, je réponds uniquement aux questions sur l'agriculture, l'eau et l'énergie.", "refus": true}"""

router = APIRouter()

_PLANS: dict[str, dict] = {}
_COMMANDES: dict[str, dict] = {}
_PRODUITS_EXTRA: list[dict] = []
_NOTIFICATIONS: list[dict] | None = None
_PRIX: dict[str, float] = {}
_FILE_ENVOI: list[dict] = []
_SUSPENDUS: set[str] = set()
_COMPTEUR_CMD = 0


def _cent(valeur: float) -> float:
    return math.floor(valeur * 100 + 0.5) / 100


def lettre_label(dt_m3: float, compatible: bool = True, localisee: bool = True, conforme: bool = True) -> str:
    if dt_m3 < 0.8:
        return "E"
    if compatible and localisee and conforme and dt_m3 >= 2.2:
        return "A"
    if dt_m3 >= 1.5:
        return "B"
    if dt_m3 >= 1.1:
        return "C"
    return "D"


class LignePlan(BaseModel):
    culture_id: str
    hectares: float


class PlanEntree(BaseModel):
    repartition: list[LignePlan]


def _simulation(fiche: dict, repartition: list[LignePlan], refuser_surface: bool) -> dict:
    cultures = {culture["id"]: culture for culture in fiche["cultures"]}
    surface = 0.0
    eau = 0.0
    revenu = 0.0
    for ligne in repartition:
        if ligne.hectares < 0:
            raise HTTPException(status_code=422, detail="hectares négatifs")
        culture = cultures.get(ligne.culture_id)
        if culture is None:
            raise HTTPException(status_code=422, detail="culture inconnue")
        surface += ligne.hectares
        eau += ligne.hectares * culture["eau_m3_ha"]
        revenu += ligne.hectares * culture["revenu_dt_ha"]
    depasse_surface = surface > fiche["surface_ha"] + 1e-6
    if depasse_surface and refuser_surface:
        raise HTTPException(status_code=422, detail="surface dépassée")
    energie = eau * fiche["kwh_m3"]
    dt_m3 = _cent(revenu / eau) if eau else 0
    alerte_puits = eau > fiche["capacite_puits_m3"]
    actuel = fiche["actuel"]
    return {
        "surface_ha": _cent(surface),
        "revenu_dt": round(revenu),
        "eau_m3": round(eau),
        "energie_kwh": round(energie),
        "dt_m3": dt_m3,
        "label": lettre_label(dt_m3, True, True, not alerte_puits),
        "alerte_surface": depasse_surface,
        "alerte_puits": alerte_puits,
        "economie_eau_m3": round(actuel["eau_m3"] - eau),
        "economie_kwh": round(actuel["energie_kwh"] - energie),
        "label_actuel": actuel["label"],
        "dt_m3_actuel": actuel["dt_m3"],
    }


def _fiche_parcelle(sprint: str, parcelle_id: str) -> dict:
    fiche = load_fixture(sprint)
    if parcelle_id != fiche["parcelle_id"]:
        raise HTTPException(status_code=404, detail="parcelle introuvable")
    return fiche


@router.post("/parcelles/{parcelle_id}/simulation")
def simuler(parcelle_id: str, entree: PlanEntree) -> dict:
    fiche = _fiche_parcelle("07", parcelle_id)
    return _simulation(fiche, entree.repartition, False)


@router.post("/parcelles/{parcelle_id}/plan")
def adopter_plan(parcelle_id: str, entree: PlanEntree) -> dict:
    fiche = _fiche_parcelle("07", parcelle_id)
    resultat = _simulation(fiche, entree.repartition, True)
    if resultat["alerte_puits"]:
        raise HTTPException(status_code=422, detail="besoin en eau supérieur au puits")
    plan = {
        "id": f"plan-{parcelle_id}",
        "date_adoption": date.today().isoformat(),
        "repartition": [ligne.model_dump() for ligne in entree.repartition],
        **resultat,
    }
    _PLANS[parcelle_id] = plan
    return plan


def _labels() -> list[dict]:
    trouves = []
    for sprint in ("08", "10", "18"):
        for etiquette in load_fixture(sprint).get("labels", []):
            trouves.append(etiquette)
    return trouves


@router.get("/labels/{qr}")
def lire_label(qr: str) -> dict:
    for etiquette in _labels():
        if etiquette["qr"] != qr:
            continue
        statut = "suspendu" if qr in _SUSPENDUS else etiquette["statut"]
        note = None if statut == "suspendu" else etiquette["note"]
        return {
            "qr": qr,
            "note": note,
            "statut": statut,
            "ferme": etiquette["ferme"],
            "produit": etiquette["produit"],
        }
    raise HTTPException(status_code=404, detail="label introuvable")


@router.post("/assistant")
async def assistant(corps: dict) -> dict:
    fiche = load_fixture("09")
    question = str(corps.get("question", "")).strip()
    langue = str(corps.get("langue", "darija"))

    # Essaie DeepSeek si la clé est configurée.
    if DEEPSEEK_API_KEY:
        try:
            reponse = await _deepseek(question, langue)
            if reponse:
                return reponse
        except Exception:
            pass  # Repli sur les fixtures.

    # Repli : correspondance exacte dans les fixtures.
    q = question.lower()
    for connue in fiche["questions"]:
        if q in {connue["darija"].lower(), connue["fr"].lower()}:
            return {
                "texte": connue["reponse"],
                "traduction_fr": connue["traduction_fr"],
                "audio": connue["reponse"],
                "sources": connue.get("sources", []),
                "carte": fiche["cartes"].get(connue["carte"]) if connue.get("carte") else None,
                "refus": False,
            }
    return {
        "texte": fiche["hors_sujet"]["darija"],
        "traduction_fr": fiche["hors_sujet"]["fr"],
        "audio": None,
        "sources": [],
        "carte": None,
        "refus": True,
    }


async def _deepseek(question: str, langue: str) -> dict | None:
    """Appelle l'API DeepSeek et renvoie la réponse au format de l'assistant."""
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f'langue: {langue}\nquestion: {question}'},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.4,
        "max_tokens": 400,
    }
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            DEEPSEEK_URL,
            headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "Content-Type": "application/json"},
            json=payload,
        )
        r.raise_for_status()
        contenu = r.json()["choices"][0]["message"]["content"]
        data = json.loads(contenu)
    return {
        "texte": str(data.get("texte", "")),
        "traduction_fr": str(data.get("traduction_fr", "")),
        "audio": None,
        "sources": [],
        "carte": None,
        "refus": bool(data.get("refus", False)),
    }


def _produits() -> list[dict]:
    return [*load_fixture("10")["produits"], *_PRODUITS_EXTRA]


@router.get("/produits")
def lister_produits(
    label: str | None = None,
    categorie: str | None = None,
    region: str | None = None,
    qr: str | None = None,
) -> dict:
    produits = []
    for produit in _produits():
        if label and produit["label"] != label:
            continue
        if categorie and produit["categorie"] != categorie:
            continue
        if region and produit["region"] != region:
            continue
        if qr and produit["qr"] != qr:
            continue
        produits.append(produit)
    return {"produits": produits}


@router.post("/produits")
def publier_produit(corps: dict) -> dict:
    fiche = load_fixture("11")
    produit = {
        "id": f"prod-{len(_PRODUITS_EXTRA) + 1}",
        "qr": f"ardi-pub-{len(_PRODUITS_EXTRA) + 1}",
        "nom": corps["nom"] if isinstance(corps.get("nom"), dict) else {"fr": corps.get("nom", ""), "ar": corps.get("nom", ""), "darija": corps.get("nom", "")},
        "prix": corps["prix"],
        "unite": corps.get("unite", "kg"),
        "stock": corps.get("stock", 0),
        "label": fiche["label"],
        "categorie": corps.get("categorie", "autre"),
        "region": "Sidi Bouzid",
        "ferme": fiche["ferme"],
        "eau_m3_kg": 0,
        "kwh_kg": 0,
        "histoire": {"fr": "", "ar": "", "darija": ""},
    }
    _PRODUITS_EXTRA.append(produit)
    return {"id": produit["id"], "ferme": fiche["ferme"], "label": fiche["label"]}


@router.post("/commandes")
def creer_commande(corps: dict) -> dict:
    global _COMPTEUR_CMD
    produits = {produit["id"]: produit for produit in _produits()}
    montant = 0.0
    eau = 0.0
    energie = 0.0
    for ligne in corps["lignes"]:
        produit = produits[ligne["produit_id"]]
        quantite = ligne["quantite"]
        montant += quantite * produit["prix"]
        eau += quantite * produit["eau_m3_kg"]
        energie += quantite * produit["kwh_kg"]
    _COMPTEUR_CMD += 1
    identifiant = f"cmd-{_COMPTEUR_CMD}"
    commande = {
        "id": identifiant,
        "lignes": corps["lignes"],
        "montant": _cent(montant),
        "eau_m3": _cent(eau),
        "energie_kwh": _cent(energie),
        "moyen_paiement": corps.get("moyen_paiement", "livraison"),
        "statut": "gros_en_attente" if corps.get("gros") else "en_attente",
        "gros": bool(corps.get("gros")),
    }
    _COMMANDES[identifiant] = commande
    return commande


@router.get("/commandes/{commande_id}")
def lire_commande(commande_id: str) -> dict:
    if commande_id == "cmd-demo" and commande_id not in _COMMANDES:
        demo = load_fixture("11")["commande_demo"]
        _COMMANDES[commande_id] = {
            "id": demo["id"],
            "lignes": [{"produit_id": "kebbar-01", "quantite": demo["quantite"]}],
            "montant": demo["prix"] * demo["quantite"],
            "statut": demo["statut"],
            "prix": demo["prix"],
            "acheteur": demo["acheteur"],
            "produit": demo["produit"],
        }
    commande = _COMMANDES.get(commande_id)
    if commande is None:
        raise HTTPException(status_code=404, detail="commande introuvable")
    return commande


@router.patch("/commandes/{commande_id}")
def modifier_commande(commande_id: str, corps: dict) -> dict:
    commande = lire_commande(commande_id)
    if "prix" in corps:
        commande["prix_propose"] = corps["prix"]
        commande["statut"] = "contre_offre"
    elif corps.get("statut") == "acceptee":
        commande["statut"] = "acceptee"
    else:
        raise HTTPException(status_code=422, detail="statut inconnu")
    _COMMANDES[commande_id] = commande
    return commande


def _notifications() -> list[dict]:
    global _NOTIFICATIONS
    if _NOTIFICATIONS is None:
        _NOTIFICATIONS = load_fixture("11")["notifications"]
    return _NOTIFICATIONS


@router.get("/notifications")
def notifications() -> dict:
    return {"notifications": _notifications(), "devis": load_fixture("11")["devis"]}


@router.post("/notifications/{notification_id}/lue")
def notification_lue(notification_id: str) -> dict:
    for notification in _notifications():
        if notification["id"] == notification_id:
            notification["lue"] = True
            return notification
    raise HTTPException(status_code=404, detail="notification introuvable")


@router.get("/parcelles/{parcelle_id}/solaire")
def solaire(parcelle_id: str, profondeur: float | None = None) -> dict:
    fiche = _fiche_parcelle("13", parcelle_id)
    if profondeur is None:
        profondeur = fiche.get("profondeur_puits_m")
    if not profondeur:
        return {"vide": True}
    kwh_m3 = 0.00272 * profondeur / fiche["eta"]
    volume = fiche["debit_m3_h"] * fiche["heures_pompage"]
    kwh_jour = volume * kwh_m3
    puissance = kwh_jour / fiche["heures_soleil"]
    panneaux = math.ceil(puissance / fiche["puissance_panneau_kw"])
    annuel = kwh_jour * 365
    return {
        "vide": False,
        "profondeur_puits_m": profondeur,
        "puissance_kw": _cent(puissance),
        "panneaux": panneaux,
        "reservoir_m3": round(volume),
        "cout_gasoil_dt": round(annuel * fiche["prix_gasoil_dt_kwh"]),
        "cout_steg_dt": round(annuel * fiche["prix_steg_dt_kwh"]),
        "cout_solaire_dt": panneaux * fiche["prix_panneau_dt"],
        "heures": fiche["heures"],
        "aides": fiche["aides"],
        "kwh_m3": _cent(kwh_m3),
    }


def _statut_images(fiche: dict, serie: str) -> str:
    images = fiche["series"][serie]
    divergentes = [image for image in images if image["irrigation_m3"] > fiche["plan_eau_m3"]]
    if len(divergentes) >= 2:
        return "ecart_confirme"
    if len(divergentes) == 1:
        return "a_confirmer"
    return "conforme"


@router.get("/parcelles/{parcelle_id}/suivi")
def suivi(parcelle_id: str, scenario: str = "deux") -> dict:
    fiche = _fiche_parcelle("14", parcelle_id)
    statut = _statut_images(fiche, scenario if scenario in fiche["series"] else "deux")
    alertes = []
    if fiche["irrigation_m3"] > fiche["plan_eau_m3"]:
        alertes.append({"type": "irrigation", "statut": statut, "message": fiche["alerte"], "audio": fiche["audio"]})
    return {
        "zones": fiche["zones"],
        "plan_eau_m3": fiche["plan_eau_m3"],
        "irrigation_m3": fiche["irrigation_m3"],
        "alertes": alertes,
        "statut": statut,
    }


@router.post("/parcelles/{parcelle_id}/contestation")
def contester(parcelle_id: str, corps: dict) -> dict:
    _fiche_parcelle("14", parcelle_id)
    if not corps.get("photo"):
        raise HTTPException(status_code=422, detail="photo manquante")
    return {"acceptee": True, "photo": corps["photo"], "position": corps.get("position")}


@router.get("/impact")
def impact(compte: str) -> dict:
    commandes = [ligne for ligne in load_fixture("15")["commandes"] if ligne["compte"] == compte]
    fermes = {ligne["ferme"] for ligne in commandes}
    labels_a = [ligne for ligne in commandes if ligne["label"] == "A"]
    return {
        "compte": compte,
        "eau_m3": sum(ligne["eau_m3"] for ligne in commandes),
        "energie_kwh": sum(ligne["energie_kwh"] for ligne in commandes),
        "fermes": len(fermes),
        "part_a": _cent(len(labels_a) / len(commandes)) if commandes else 0,
        "montant": sum(ligne["montant"] for ligne in commandes),
        "commandes": commandes,
    }


@router.get("/impact/rapport")
def rapport_impact(compte: str) -> dict:
    return {"format": "json", "lignes": impact(compte)}


@router.post("/hors-ligne/parcelle")
def envoyer_parcelle(corps: dict) -> dict:
    if not corps.get("consentement"):
        raise HTTPException(status_code=422, detail="consentement requis")
    _FILE_ENVOI.append({"id": corps.get("id"), "nom": corps.get("nom")})
    return {"en_file": False, "envoye": True}


def _prix_culture(culture: dict) -> float:
    return _PRIX.get(culture["id"], culture["prix"])


def _dt_culture(culture: dict) -> float:
    prix = _prix_culture(culture)
    revenu = culture["rendement_t_ha"] * 1000 * prix - culture["couts_dt_ha"]
    return _cent(revenu / culture["eau_m3_ha"])


@router.get("/proprietaires/{proprietaire}/parcelles")
def parcelles_proprietaire(proprietaire: str) -> dict:
    fiche = load_fixture("17")
    if proprietaire != fiche["proprietaire"]:
        return {"parcelles": [], "classement": [], "plan_fige": None}
    classement = sorted(
        ({"id": culture["id"], "nom": culture["nom"], "dt_m3": _dt_culture(culture), "prix": _prix_culture(culture)} for culture in fiche["cultures"]),
        key=lambda ligne: -ligne["dt_m3"],
    )
    return {
        "profil": fiche["profil"],
        "parcelles": fiche["parcelles"],
        "classement": classement,
        "plan_fige": fiche["plan_fige"],
    }


@router.post("/prix")
def mettre_a_jour_prix(corps: dict) -> dict:
    _PRIX[corps["culture"]] = float(corps["typique"])
    return {"culture": corps["culture"], "typique": _PRIX[corps["culture"]], "date": date.today().isoformat(), "source": corps.get("source", "marche")}


@router.get("/admin/file")
def file_admin() -> dict:
    fiche = load_fixture("18")
    return {"file": fiche["file"], "impact": fiche["impact"], "terrain": fiche["terrain"], "seuils": fiche["seuils_a_calibrer"]}


@router.post("/admin/labels/{qr}/suspendre")
def suspendre_label(qr: str) -> dict:
    _SUSPENDUS.add(qr)
    return lire_label(qr)


def nombres_dans(texte: str) -> list[str]:
    return re.findall(r"(?<![A-Za-z0-9])\d+(?:[.,]\d+)?(?![A-Za-z])", texte)
