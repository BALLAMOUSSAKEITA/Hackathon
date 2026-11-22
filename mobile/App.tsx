import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/manrope";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { I18nProvider } from "./src/i18n";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { PanierProvider } from "./src/panier";
import { colors } from "./src/theme";

export default function App() {
  // Manrope, la police des maquettes. Si le chargement échoue, l'app s'ouvre avec la police système.
  const [chargee, erreur] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  if (!chargee && !erreur) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.olive }}>
        <ActivityIndicator color={colors.white} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <I18nProvider>
        <PanierProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </PanierProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
