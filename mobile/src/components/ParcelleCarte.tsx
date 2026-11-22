import MapView, { Circle, Polygon, Polyline } from "react-native-maps";
import { StyleSheet } from "react-native";

import type { Anneau } from "../surface";
import { colors } from "../theme";

type Props = {
  anneau: Anneau;
  ferme: boolean;
  onAjouter: (point: [number, number]) => void;
  /** Hauteur de la carte. Elle prend toute la largeur disponible, sans coins arrondis. */
  hauteur?: number;
};

export function ParcelleCarte({ anneau, ferme, onAjouter, hauteur = 255 }: Props) {
  const points = anneau.length ? anneau : [[9.48578, 35.038075] as [number, number]];
  const utiles = ferme && points.length > 1 ? points.slice(0, -1) : points;
  const latitude = utiles.reduce((somme, point) => somme + point[1], 0) / utiles.length;
  const longitude = utiles.reduce((somme, point) => somme + point[0], 0) / utiles.length;
  const coordonnees = utiles.map(([lon, lat]) => ({ latitude: lat, longitude: lon }));

  return (
    <MapView
      style={[styles.carte, { height: hauteur }]}
      mapType="satellite"
      initialRegion={{
        // On décale un peu le centre vers le haut : le bas de la carte porte les pastilles.
        latitude: latitude - 0.0003,
        longitude,
        latitudeDelta: 0.004,
        longitudeDelta: 0.004,
      }}
      onPress={(event) => {
        if (ferme) {
          return;
        }
        const { latitude: lat, longitude: lon } = event.nativeEvent.coordinate;
        onAjouter([lon, lat]);
      }}
    >
      {ferme && coordonnees.length >= 3 ? (
        <Polygon coordinates={coordonnees} fillColor="rgba(46,94,58,0.28)" strokeColor={colors.olive} strokeWidth={3} />
      ) : coordonnees.length >= 2 ? (
        <Polyline coordinates={coordonnees} strokeColor={colors.olive} strokeWidth={3} />
      ) : null}
      {anneau.length
        ? coordonnees.map((point, index) => (
            <Circle
              key={`${point.latitude}-${point.longitude}-${index}`}
              center={point}
              radius={4}
              fillColor={colors.white}
              strokeColor={colors.olive}
              strokeWidth={3}
            />
          ))
        : null}
    </MapView>
  );
}

const styles = StyleSheet.create({
  carte: {
    width: "100%",
  },
});
