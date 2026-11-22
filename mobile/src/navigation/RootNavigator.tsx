import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator, type NativeStackNavigationOptions } from "@react-navigation/native-stack";

import { AdminScreen } from "../screens/AdminScreen";
import { AnalyseScreen } from "../screens/AnalyseScreen";
import { AssistantScreen } from "../screens/AssistantScreen";
import { CulturesScreen } from "../screens/CulturesScreen";
import { DemoScreen } from "../screens/DemoScreen";
import { FicheCultureScreen } from "../screens/FicheCultureScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { HorsLigneScreen } from "../screens/HorsLigneScreen";
import { LabelScreen } from "../screens/LabelScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { ParcelleScreen } from "../screens/ParcelleScreen";
import { PlanterScreen } from "../screens/PlanterScreen";
import { ReglagesScreen } from "../screens/ReglagesScreen";
import { SimulateurScreen } from "../screens/SimulateurScreen";
import { SolaireScreen } from "../screens/SolaireScreen";
import { SuiviScreen } from "../screens/SuiviScreen";
import { VentesScreen } from "../screens/VentesScreen";
import { WelcomeScreen } from "../screens/WelcomeScreen";
import { ImpactScreen } from "../screens/acheteur/ImpactScreen";
import { MarcheScreen } from "../screens/acheteur/MarcheScreen";
import { PanierScreen } from "../screens/acheteur/PanierScreen";
import { ProduitScreen } from "../screens/acheteur/ProduitScreen";
import { ScannerScreen } from "../screens/acheteur/ScannerScreen";
import { colors } from "../theme";
import type { RootStackParamList } from "./types";

const RootStack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.card,
    text: colors.ink,
    border: colors.line,
    primary: colors.olive,
  },
};

const screenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.bg },
  animation: "slide_from_right",
};

/** Les onglets s'affichent en fondu, comme une barre d'onglets. */
const onglet: NativeStackNavigationOptions = { animation: "fade" };

export function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator initialRouteName="Welcome" screenOptions={screenOptions}>
        <RootStack.Screen name="Welcome" component={WelcomeScreen} options={{ animation: "fade" }} />

        <RootStack.Screen name="Home" component={HomeScreen} options={onglet} />
        <RootStack.Screen name="Parcelle" component={ParcelleScreen} options={onglet} />
        <RootStack.Screen name="Planter" component={PlanterScreen} options={onglet} />
        <RootStack.Screen name="Assistant" component={AssistantScreen} options={onglet} />
        <RootStack.Screen name="Label" component={LabelScreen} options={onglet} />
        <RootStack.Screen name="Analyse" component={AnalyseScreen} />
        <RootStack.Screen name="Simulateur" component={SimulateurScreen} />
        <RootStack.Screen name="Solaire" component={SolaireScreen} />
        <RootStack.Screen name="Suivi" component={SuiviScreen} />
        <RootStack.Screen name="Ventes" component={VentesScreen} />
        <RootStack.Screen name="Notifications" component={NotificationsScreen} />
        <RootStack.Screen name="Cultures" component={CulturesScreen} />
        <RootStack.Screen name="Fiche" component={FicheCultureScreen} />

        <RootStack.Screen name="Marche" component={MarcheScreen} options={onglet} />
        <RootStack.Screen name="Scanner" component={ScannerScreen} options={onglet} />
        <RootStack.Screen name="Panier" component={PanierScreen} options={onglet} />
        <RootStack.Screen name="Impact" component={ImpactScreen} options={onglet} />
        <RootStack.Screen name="Produit" component={ProduitScreen} />

        <RootStack.Screen name="Reglages" component={ReglagesScreen} />
        <RootStack.Screen name="Demo" component={DemoScreen} />
        <RootStack.Screen name="HorsLigne" component={HorsLigneScreen} />
        <RootStack.Screen name="Admin" component={AdminScreen} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
