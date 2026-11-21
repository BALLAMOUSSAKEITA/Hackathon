import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { BuyerScreen } from "../screens/BuyerScreen";
import { WelcomeScreen } from "../screens/WelcomeScreen";
import { EmptyScreen } from "../screens/EmptyScreen";
import { FarmerMenuScreen } from "../screens/FarmerMenuScreen";
import { CulturesScreen } from "../screens/CulturesScreen";
import { FicheCultureScreen } from "../screens/FicheCultureScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { AnalyseScreen } from "../screens/AnalyseScreen";
import { PlanterScreen } from "../screens/PlanterScreen";
import {
  AccueilFermierScreen,
  AdminScreen,
  AssistantScreen,
  DemoScreen,
  HorsLigneScreen,
  ImpactScreen,
  LabelScreen,
  MarcheScreen,
  NotificationsScreen,
  ReglagesScreen,
  SimulateurScreen,
  SolaireScreen,
  SuiviScreen,
  VentesScreen,
} from "../screens/SuiteScreens";
import { ParcelleScreen } from "../screens/ParcelleScreen";
import { useI18n } from "../i18n";
import { colors } from "../theme";
import type { FarmerStackParamList, RootStackParamList } from "./types";

const RootStack = createNativeStackNavigator<RootStackParamList>();
const FarmerStack = createNativeStackNavigator<FarmerStackParamList>();

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

function FarmerNavigator() {
  const { t } = useI18n();
  return (
    <FarmerStack.Navigator screenOptions={screenOptions}>
      <FarmerStack.Screen name="Menu" component={FarmerMenuScreen} options={{ title: t("farmerPath") }} />
      <FarmerStack.Screen name="Empty" component={EmptyScreen} options={{ title: "Ardi" }} />
    </FarmerStack.Navigator>
  );
}

export function RootNavigator() {
  const { t } = useI18n();
  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator initialRouteName="Welcome" screenOptions={screenOptions}>
        <RootStack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="Farmer" component={FarmerNavigator} options={{ headerShown: false }} />
        <RootStack.Screen name="Buyer" component={BuyerScreen} options={{ title: t("buyerPath") }} />
        <RootStack.Screen name="Cultures" component={CulturesScreen} options={{ title: t("culturesTitle") }} />
        <RootStack.Screen name="Fiche" component={FicheCultureScreen} options={{ title: "Ardi" }} />
        <RootStack.Screen name="Parcelle" component={ParcelleScreen} options={{ title: t("screen2") }} />
        <RootStack.Screen name="Analyse" component={AnalyseScreen} options={{ title: t("screen3") }} />
        <RootStack.Screen name="Planter" component={PlanterScreen} options={{ title: t("screen4") }} />
        <RootStack.Screen name="AccueilFermier" component={AccueilFermierScreen} options={{ title: t("screen1") }} />
        <RootStack.Screen name="Simulateur" component={SimulateurScreen} options={{ title: t("screen5") }} />
        <RootStack.Screen name="Assistant" component={AssistantScreen} options={{ title: t("screen6") }} />
        <RootStack.Screen name="Label" component={LabelScreen} options={{ title: t("screen7") }} />
        <RootStack.Screen name="Solaire" component={SolaireScreen} options={{ title: t("screen8") }} />
        <RootStack.Screen name="Suivi" component={SuiviScreen} options={{ title: t("screen9") }} />
        <RootStack.Screen name="Ventes" component={VentesScreen} options={{ title: t("screen10") }} />
        <RootStack.Screen name="Notifications" component={NotificationsScreen} options={{ title: t("screen11") }} />
        <RootStack.Screen name="Marche" component={MarcheScreen} options={{ title: t("buyerPath") }} />
        <RootStack.Screen name="Demo" component={DemoScreen} options={{ title: "Démo" }} />
        <RootStack.Screen name="Impact" component={ImpactScreen} options={{ title: "Impact" }} />
        <RootStack.Screen name="HorsLigne" component={HorsLigneScreen} options={{ title: "Hors ligne" }} />
        <RootStack.Screen name="Reglages" component={ReglagesScreen} options={{ title: "Réglages" }} />
        <RootStack.Screen name="Admin" component={AdminScreen} options={{ title: "Admin" }} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const screenOptions = {
  headerStyle: { backgroundColor: colors.card },
  headerTintColor: colors.olive,
  headerTitleStyle: { fontWeight: "700" as const },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.bg },
  headerBackButtonDisplayMode: "minimal" as const,
};
