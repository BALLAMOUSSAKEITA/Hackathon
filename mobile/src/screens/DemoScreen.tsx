import { StyleSheet, Text, View } from "react-native";
import { CommonActions } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Icon, type IconName } from "../components/icons";
import { Carte, EnTete, T } from "../components/maquetteC-ui";
import { Button, Footnote, Screen } from "../components/ui";
import { sprint12 } from "../donnees";
import { useI18n, type CopyKey } from "../i18n";
import type { RootStackParamList } from "../navigation/types";
import { colors, police } from "../theme";
import type { Localized } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Demo">;

const PITCH: Record<string, { icon: IconName; titre: CopyKey; couleur: string }> = {
  eau: { icon: "drop", titre: "water", couleur: colors.water },
  energie: { icon: "bolt", titre: "energy", couleur: colors.amber },
  revenu: { icon: "chart", titre: "revenue", couleur: colors.olive },
  label: { icon: "badge", titre: "label", couleur: colors.olive },
  vente: { icon: "store", titre: "pitchSale", couleur: colors.olive },
};

export function DemoScreen({ navigation }: Props) {
  const { t, tx } = useI18n();
  const cartes = sprint12.cartes;
  const pitch = Object.entries(sprint12.pitch) as [string, Localized][];

  return (
    <Screen
      contentStyle={styles.contenu}
      footer={
        <Button
          label={t("startDemo")}
          arrow
          onPress={() => navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Home" }] }))}
        />
      }
    >
      <EnTete titre={t("scenario")} sousTitre={t("demoSubtitle", { n: cartes.length })} />

      <View>
        {cartes.map((carte, index) => (
          <View key={carte.id} style={styles.etape}>
            <View style={styles.rail}>
              <View style={styles.numero}>
                <Text style={styles.numeroText}>{index + 1}</Text>
              </View>
              {index < cartes.length - 1 ? <View style={styles.trait} /> : null}
            </View>
            <Carte style={styles.carte}>
              <T size={14} weight="700" lh={1.4}>
                {tx(carte)}
              </T>
            </Carte>
          </View>
        ))}
      </View>

      <T size={15} weight="800">
        {t("pitchTitle")}
      </T>
      {pitch.map(([cle, texte]) => {
        const info = PITCH[cle] ?? { icon: "info" as IconName, titre: "notifOther" as CopyKey, couleur: colors.olive };
        return (
          <Carte key={cle} style={styles.pitch}>
            <Icon name={info.icon} color={info.couleur} size={22} />
            <View style={styles.flex}>
              <T size={13} weight="800" color={info.couleur}>
                {t(info.titre)}
              </T>
              <T size={14} weight="700" lh={1.4}>
                {tx(texte)}
              </T>
            </View>
          </Carte>
        );
      })}

      <Footnote>{tx(sprint12.hypothese)}</Footnote>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contenu: { gap: 14, paddingTop: 24, paddingBottom: 32 },
  flex: { flex: 1 },
  etape: { flexDirection: "row", gap: 12 },
  rail: { width: 32, alignItems: "center" },
  numero: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.olive, alignItems: "center", justifyContent: "center" },
  numeroText: { color: colors.white, fontSize: 14, ...police("800") },
  trait: { flex: 1, width: 2, backgroundColor: colors.leaf, marginVertical: 2 },
  carte: { flex: 1, marginBottom: 10, paddingVertical: 14 },
  pitch: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
});
