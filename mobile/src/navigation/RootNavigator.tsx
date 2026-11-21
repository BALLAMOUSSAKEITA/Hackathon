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
