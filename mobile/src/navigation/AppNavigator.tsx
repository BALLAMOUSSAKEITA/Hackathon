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

export type RootStackParamList = {
  Welcome: undefined;
  FarmerHome: undefined;
  BuyerMarket: undefined;
  Cultures: undefined;
  Parcel: undefined;
  Analysis: undefined;
  Recommendations: undefined;
  Simulator: undefined;
  FarmerHomeV2: undefined;
  FarmLabel: undefined;
  [key: string]: undefined;
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
      initialRouteName="FarmerHomeV2"
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
      {Object.entries(emptyTitles).map(([number, title]) => (
        <Stack.Screen
          key={number}
          name={`Empty${number}`}
          children={() => <EmptyStateScreen title={title} />}
        />
      ))}
      <Stack.Screen
        name="BuyerMarket"
        children={() => <EmptyStateScreen title="Marché responsable" />}
      />
    </Stack.Navigator>
  );
}
