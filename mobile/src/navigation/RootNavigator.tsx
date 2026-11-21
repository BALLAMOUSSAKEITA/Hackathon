import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { BuyerScreen } from "../screens/BuyerScreen";
import { EmptyScreen } from "../screens/EmptyScreen";
import { FarmerMenuScreen } from "../screens/FarmerMenuScreen";
import { HomeScreen } from "../screens/HomeScreen";
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
      <RootStack.Navigator screenOptions={screenOptions}>
        <RootStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="Farmer" component={FarmerNavigator} options={{ headerShown: false }} />
        <RootStack.Screen name="Buyer" component={BuyerScreen} options={{ title: t("buyerPath") }} />
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
