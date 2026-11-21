import MapView, { Polygon, Polyline } from "react-native-maps";
import { StyleSheet } from "react-native";

import type { Anneau } from "../surface";
import { colors } from "../theme";

type Props = {
  anneau: Anneau;
  ferme: boolean;
  onAjouter: (point: [number, number]) => void;
};

export function ParcelleCarte({ anneau, ferme, onAjouter }: Props) {
  const points = anneau.length ? anneau : [[9.48578, 35.038075] as [number, number]];
  const utiles = ferme && points.length > 1 ? points.slice(0, -1) : points;
  const latitude = utiles.reduce((somme, point) => somme + point[1], 0) / utiles.length;
  const longitude = utiles.reduce((somme, point) => somme + point[0], 0) / utiles.length;
  const coordonnees = utiles.map(([lon, lat]) => ({ latitude: lat, longitude: lon }));

  return (
    <MapView
      style={styles.carte}
      mapType="satellite"
      initialRegion={{
        latitude,
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
        <Polygon
          coordinates={coordonnees}
          fillColor="rgba(35,79,50,0.35)"
          strokeColor={colors.olive}
          strokeWidth={3}
        />
      ) : coordonnees.length >= 2 ? (
        <Polyline coordinates={coordonnees} strokeColor={colors.clay} strokeWidth={3} />
      ) : null}
    </MapView>
  );
}

const styles = StyleSheet.create({
  carte: {
    height: 280,
    borderRadius: 16,
    overflow: "hidden",
  },
});
