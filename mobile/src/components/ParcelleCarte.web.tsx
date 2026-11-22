import { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Polygon, Polyline } from "react-native-svg";

import type { Anneau } from "../surface";
import { colors } from "../theme";

type Props = {
  anneau: Anneau;
  ferme: boolean;
  onAjouter: (point: [number, number]) => void;
  /** Hauteur de la carte. Elle prend toute la largeur disponible, sans coins arrondis. */
  hauteur?: number;
};

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

export function ParcelleCarte({ anneau, ferme, onAjouter, hauteur = 255 }: Props) {
  // La largeur réelle est mesurée : la carte occupe tout l'écran, quel que soit l'appareil.
  const [largeur, setLargeur] = useState(390);
  const points = anneau.length ? anneau : [[9.48578, 35.038075] as [number, number]];
  const utiles = ferme && points.length > 1 ? points.slice(0, -1) : points;
  const lon = utiles.reduce((somme, point) => somme + point[0], 0) / utiles.length;
  const lat = utiles.reduce((somme, point) => somme + point[1], 0) / utiles.length;
  const gauche = mondeX(lon) - largeur / 2;
  const haut = mondeY(lat) - hauteur / 2;
  const tuilesX = [Math.floor(gauche / TUILE), Math.floor((gauche + largeur) / TUILE)];
  const tuilesY = [Math.floor(haut / TUILE), Math.floor((haut + hauteur) / TUILE)];
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
      onLayout={(event) => {
        const mesure = Math.round(event.nativeEvent.layout.width);
        if (mesure > 0 && mesure !== largeur) {
          setLargeur(mesure);
        }
      }}
      onPress={(event) => {
        if (ferme) {
          return;
        }
        const { locationX, locationY } = event.nativeEvent;
        onAjouter(versLonLat(gauche + locationX, haut + locationY));
      }}
      style={[styles.cadre, { height: hauteur }]}
    >
      <View style={[styles.carte, { width: largeur, height: hauteur }]}>
        {tuiles.map((tuile) => (
          <Image
            key={`${tuile.x}-${tuile.y}-${tuile.left}`}
            source={{
              uri: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${ZOOM}/${tuile.y}/${tuile.x}`,
            }}
            style={[styles.tuile, { left: tuile.left, top: tuile.top }]}
          />
        ))}
        <Svg width={largeur} height={hauteur} style={StyleSheet.absoluteFill}>
          {ferme && anneau.length >= 4 ? (
            <Polygon points={trace} fill="rgba(46,94,58,0.28)" stroke={colors.olive} strokeWidth={3} strokeLinejoin="round" />
          ) : (
            <Polyline points={trace} fill="none" stroke={colors.olive} strokeWidth={3} strokeLinejoin="round" />
          )}
          {anneau.length
            ? utiles.map((point, index) => (
                <Circle
                  key={`${point[0]}-${point[1]}-${index}`}
                  cx={mondeX(point[0]) - gauche}
                  cy={mondeY(point[1]) - haut}
                  r={7}
                  fill={colors.white}
                  stroke={colors.olive}
                  strokeWidth={3}
                />
              ))
            : null}
        </Svg>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cadre: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#E4EAD8",
  },
  carte: {
    position: "relative",
  },
  tuile: {
    position: "absolute",
    width: TUILE,
    height: TUILE,
  },
});
