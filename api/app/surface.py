"""Surface d'un polygone WGS84, en hectares, arrondie au centième.

La même projection est recopiée dans mobile/src/surface.ts.
Les deux côtés doivent rester identiques : l'écran affiche ce que l'API renvoie.
"""

import math

RAYON_M = 6_378_137


class PolygoneInvalide(ValueError):
    pass


def surface_hectares(geometrie: dict) -> float:
    anneau = _anneau(geometrie)
    if _se_croise(anneau):
        raise PolygoneInvalide("le polygone se croise")
    lat0 = math.radians(sum(point[1] for point in anneau[:-1]) / (len(anneau) - 1))
    facteur_x = RAYON_M * math.cos(lat0)
    points = [
        (math.radians(lon) * facteur_x, math.radians(lat) * RAYON_M) for lon, lat in anneau
    ]
    aire = 0.0
    for index in range(len(points) - 1):
        aire += points[index][0] * points[index + 1][1]
        aire -= points[index + 1][0] * points[index][1]
    hectares = abs(aire) / 2 / 10_000
    if hectares < 0.01:
        raise PolygoneInvalide("surface trop petite")
    return math.floor(hectares * 100 + 0.5) / 100


def _anneau(geometrie: dict) -> list[tuple[float, float]]:
    if not isinstance(geometrie, dict) or geometrie.get("type") != "Polygon":
        raise PolygoneInvalide("géométrie GeoJSON Polygon attendue")
    coordinates = geometrie.get("coordinates")
    if not isinstance(coordinates, list) or not coordinates or not isinstance(coordinates[0], list):
        raise PolygoneInvalide("anneau extérieur manquant")
    brut = coordinates[0]
    if len(brut) < 4:
        raise PolygoneInvalide("au moins trois sommets, puis le retour au premier")
    anneau: list[tuple[float, float]] = []
    for point in brut:
        if (
            not isinstance(point, (list, tuple))
            or len(point) < 2
            or not isinstance(point[0], (int, float))
            or not isinstance(point[1], (int, float))
        ):
            raise PolygoneInvalide("chaque sommet est [longitude, latitude]")
        lon, lat = float(point[0]), float(point[1])
        if not -180 <= lon <= 180 or not -90 <= lat <= 90:
            raise PolygoneInvalide("coordonnée hors limites")
        anneau.append((lon, lat))
    if anneau[0] != anneau[-1]:
        raise PolygoneInvalide("le polygone n'est pas fermé")
    return anneau


def _se_croise(anneau: list[tuple[float, float]]) -> bool:
    bords = len(anneau) - 1
    for i in range(bords):
        for j in range(i + 1, bords):
            if abs(i - j) <= 1 or (i == 0 and j == bords - 1):
                continue
            if _segments_croises(anneau[i], anneau[i + 1], anneau[j], anneau[j + 1]):
                return True
    return False


def _segments_croises(
    a: tuple[float, float],
    b: tuple[float, float],
    c: tuple[float, float],
    d: tuple[float, float],
) -> bool:
    o1 = _orientation(a, b, c)
    o2 = _orientation(a, b, d)
    o3 = _orientation(c, d, a)
    o4 = _orientation(c, d, b)
    return o1 * o2 < 0 and o3 * o4 < 0


def _orientation(
    p: tuple[float, float], q: tuple[float, float], r: tuple[float, float]
) -> float:
    return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
