import { Image, Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Polygon, Polyline } from "react-native-svg";

import type { Anneau } from "../surface";
import { colors } from "../theme";

type Props = {
  anneau: Anneau;
  ferme: boolean;
  onAjouter: (point: [number, number]) => void;
};

const LARGEUR = 360;
const HAUTEUR = 280;
const TUILE = 256;
const ZOOM = 17;

function mondeX(lon: number): number {
  return ((lon + 180) / 360) * TUILE * 2 ** ZOOM;
}

function mondeY(lat: number): number {
  const sinus = Math.sin((lat * Math.PI) / 180);
  return (0.5 - Math.log((1 + sinus) / (1 - sinus)) / (4 * Math.PI)) * TUILE * 2 ** ZOOM;
}

function versLonLat(x: number, y: number): [number, number] {
  const monde = TUILE * 2 ** ZOOM;
  const lon = (x / monde) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / monde;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return [lon, lat];
}

export function ParcelleCarte({ anneau, ferme, onAjouter }: Props) {
  const points = anneau.length ? anneau : [[9.48578, 35.038075] as [number, number]];
  const utiles = ferme && points.length > 1 ? points.slice(0, -1) : points;
  const lon = utiles.reduce((somme, point) => somme + point[0], 0) / utiles.length;
  const lat = utiles.reduce((somme, point) => somme + point[1], 0) / utiles.length;
  const gauche = mondeX(lon) - LARGEUR / 2;
  const haut = mondeY(lat) - HAUTEUR / 2;
  const tuilesX = [Math.floor(gauche / TUILE), Math.floor((gauche + LARGEUR) / TUILE)];
  const tuilesY = [Math.floor(haut / TUILE), Math.floor((haut + HAUTEUR) / TUILE)];
  const n = 2 ** ZOOM;
  const tuiles: { x: number; y: number; left: number; top: number }[] = [];
  for (let x = tuilesX[0]; x <= tuilesX[1]; x += 1) {
    for (let y = tuilesY[0]; y <= tuilesY[1]; y += 1) {
      if (y < 0 || y >= n) {
        continue;
      }
      tuiles.push({
        x: ((x % n) + n) % n,
        y,
        left: x * TUILE - gauche,
        top: y * TUILE - haut,
      });
    }
  }
  const trace = anneau
    .map(([pointLon, pointLat]) => `${mondeX(pointLon) - gauche},${mondeY(pointLat) - haut}`)
    .join(" ");

  return (
    <Pressable
      accessibilityRole="button"
      onPress={(event) => {
        if (ferme) {
          return;
        }
        const { locationX, locationY } = event.nativeEvent;
        onAjouter(versLonLat(gauche + locationX, haut + locationY));
      }}
      style={styles.cadre}
    >
      <View style={styles.carte}>
        {tuiles.map((tuile) => (
          <Image
            key={`${tuile.x}-${tuile.y}-${tuile.left}`}
            source={{
              uri: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${ZOOM}/${tuile.y}/${tuile.x}`,
            }}
            style={[styles.tuile, { left: tuile.left, top: tuile.top }]}
          />
        ))}
        <Svg width={LARGEUR} height={HAUTEUR} style={StyleSheet.absoluteFill}>
          {ferme && anneau.length >= 4 ? (
            <Polygon points={trace} fill="rgba(35,79,50,0.35)" stroke={colors.olive} strokeWidth={3} />
          ) : (
            <Polyline points={trace} fill="none" stroke={colors.clay} strokeWidth={3} />
          )}
          {utiles.map((point, index) => (
            <Circle
              key={`${point[0]}-${point[1]}-${index}`}
              cx={mondeX(point[0]) - gauche}
              cy={mondeY(point[1]) - haut}
              r={5}
              fill={colors.card}
              stroke={colors.ink}
              strokeWidth={2}
            />
          ))}
        </Svg>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cadre: {
    width: LARGEUR,
    maxWidth: "100%",
    alignSelf: "center",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.sand,
  },
  carte: {
    width: LARGEUR,
    height: HAUTEUR,
  },
  tuile: {
    position: "absolute",
    width: TUILE,
    height: TUILE,
  },
});
