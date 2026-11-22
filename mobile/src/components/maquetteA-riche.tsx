import { Text, type StyleProp, type TextStyle } from "react-native";

import { useI18n } from "../i18n";
import { police } from "../theme";

/** Affiche un texte où les passages entre ** ** sont en gras (et d'une autre couleur si besoin). */
export function TexteRiche({
  texte,
  style,
  fort,
}: {
  texte: string;
  style: StyleProp<TextStyle>;
  fort?: StyleProp<TextStyle>;
}) {
  const { align } = useI18n();
  const morceaux = texte.split("**");
  return (
    <Text style={[{ textAlign: align }, police("400"), style]}>
      {morceaux.map((morceau, index) =>
        index % 2 === 1 ? (
          <Text key={index} style={[police("800"), fort]}>
            {morceau}
          </Text>
        ) : (
          morceau
        ),
      )}
    </Text>
  );
}
