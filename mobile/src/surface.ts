/** Même projection que api/app/surface.py. À garder identique. */

const RAYON_M = 6_378_137;

export type Anneau = [number, number][];

export function surfaceHectares(anneau: Anneau): number | null {
  if (anneau.length < 4) {
    return null;
  }
  const debut = anneau[0];
  const fin = anneau[anneau.length - 1];
  if (debut[0] !== fin[0] || debut[1] !== fin[1]) {
    return null;
  }
  if (seCroise(anneau)) {
    return null;
  }
  const lat0 = (anneau.slice(0, -1).reduce((somme, point) => somme + point[1], 0) / (anneau.length - 1)) * (Math.PI / 180);
  const facteurX = RAYON_M * Math.cos(lat0);
  const points = anneau.map(([lon, lat]) => [
    (lon * Math.PI / 180) * facteurX,
    (lat * Math.PI / 180) * RAYON_M,
  ]);
  let aire = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    aire += points[index][0] * points[index + 1][1];
    aire -= points[index + 1][0] * points[index][1];
  }
  const hectares = Math.abs(aire) / 2 / 10_000;
  if (hectares < 0.01) {
    return null;
  }
  return Math.floor(hectares * 100 + 0.5) / 100;
}

function seCroise(anneau: Anneau): boolean {
  const bords = anneau.length - 1;
  for (let i = 0; i < bords; i += 1) {
    for (let j = i + 1; j < bords; j += 1) {
      if (Math.abs(i - j) <= 1 || (i === 0 && j === bords - 1)) {
        continue;
      }
      if (segmentsCroises(anneau[i], anneau[i + 1], anneau[j], anneau[j + 1])) {
        return true;
      }
    }
  }
  return false;
}

function segmentsCroises(a: Anneau[number], b: Anneau[number], c: Anneau[number], d: Anneau[number]): boolean {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

function orientation(p: Anneau[number], q: Anneau[number], r: Anneau[number]): number {
  return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
}
