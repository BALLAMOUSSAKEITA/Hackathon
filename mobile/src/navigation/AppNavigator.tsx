import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { WelcomeScreen } from "../screens/WelcomeScreen";
import { EmptyStateScreen } from "../screens/EmptyStateScreen";
import { FarmerHomeScreen } from "../screens/FarmerHomeScreen";
import { CulturesScreen } from "../screens/CulturesScreen";
import { ParcelScreen } from "../screens/ParcelScreen";
import { AnalysisScreen } from "../screens/AnalysisScreen";
import { RecommendationsScreen } from "../screens/RecommendationsScreen";
import { SimulatorScreen } from "../screens/SimulatorScreen";
import { FarmerHomeV2Screen } from "../screens/FarmerHomeV2Screen";
import { FarmLabelScreen } from "../screens/FarmLabelScreen";
import { AssistantScreen } from "../screens/AssistantScreen";
import { BuyerMarketScreen } from "../screens/BuyerMarketScreen";
import { ProductDetailScreen } from "../screens/ProductDetailScreen";
import { BuyerScannerScreen } from "../screens/BuyerScannerScreen";
import { BuyerCartScreen } from "../screens/BuyerCartScreen";
import { SalesScreen } from "../screens/SalesScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { DemoScreen } from "../screens/DemoScreen";
import { SolarEnergyScreen } from "../screens/SolarEnergyScreen";
import { SatelliteFollowupScreen } from "../screens/SatelliteFollowupScreen";
import { BuyerImpactScreen } from "../screens/BuyerImpactScreen";
import { OfflineScreen } from "../screens/OfflineScreen";

export type RootStackParamList = {
  Welcome: undefined;
  FarmerHome: undefined;
  Cultures: undefined;
  Parcel: undefined;
  Analysis: undefined;
  Recommendations: undefined;
  Simulator: undefined;
  FarmerHomeV2: undefined;
  FarmLabel: undefined;
  Assistant: undefined;
  BuyerMarket: undefined;
  ProductDetail: { productId: string };
  BuyerScanner: undefined;
  BuyerCart: undefined;
  Sales: undefined;
  Notifications: undefined;
  Demo: undefined;
  SolarEnergy: undefined;
  SatelliteFollowup: undefined;
  BuyerImpact: undefined;
  Offline: undefined;
  [key: string]: object | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const emptyTitles: Record<number, string> = {
  1: "Accueil agriculteur",
  2: "Ma parcelle",
  3: "Analyse de la terre",
  4: "Que planter ?",
  5: "Simulateur",
  6: "Assistant vocal",
  7: "Label de la ferme",
  8: "Énergie et pompage solaire",
  9: "Suivi satellite",
  10: "Mes ventes",
  11: "Notifications",
  12: "Produit scanné",
  13: "Marché responsable",
  14: "Scanner",
  15: "Panier",
  16: "Mon impact",
};

export function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Offline"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#f4f7ef" },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="FarmerHome" component={FarmerHomeScreen} />
      <Stack.Screen name="Cultures" component={CulturesScreen} />
      <Stack.Screen name="Parcel" component={ParcelScreen} />
      <Stack.Screen name="Analysis" component={AnalysisScreen} />
      <Stack.Screen name="Recommendations" component={RecommendationsScreen} />
      <Stack.Screen name="Simulator" component={SimulatorScreen} />
      <Stack.Screen name="FarmerHomeV2" component={FarmerHomeV2Screen} />
      <Stack.Screen name="FarmLabel" component={FarmLabelScreen} />
      <Stack.Screen name="Assistant" component={AssistantScreen} />
      <Stack.Screen name="BuyerMarket" component={BuyerMarketScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="BuyerScanner" component={BuyerScannerScreen} />
      <Stack.Screen name="BuyerCart" component={BuyerCartScreen} />
      <Stack.Screen name="Sales" component={SalesScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Demo" component={DemoScreen} />
      <Stack.Screen name="SolarEnergy" component={SolarEnergyScreen} />
      <Stack.Screen name="SatelliteFollowup" component={SatelliteFollowupScreen} />
      <Stack.Screen name="BuyerImpact" component={BuyerImpactScreen} />
      <Stack.Screen name="Offline" component={OfflineScreen} />
      <Stack.Screen
        name="SolarEnergy"
        children={() => <EmptyStateScreen title="Pompe solaire · 60 m" />}
      />
      {Object.entries(emptyTitles).map(([number, title]) => (
        <Stack.Screen
          key={number}
          name={`Empty${number}`}
          children={() => <EmptyStateScreen title={title} />}
        />
      ))}
    </Stack.Navigator>
  );
}
