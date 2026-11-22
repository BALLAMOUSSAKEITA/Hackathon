import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import fixture from "../../../fixtures/sprint-10.json";
import { colors, spacing, touchTarget } from "../theme";

export function BuyerMarketScreen() {
  const navigation = useNavigation<any>();
  const [label, setLabel] = useState("all");
  const products = useMemo(
    () => fixture.produits.filter((product) => label === "all" || product.label === label),
    [label],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Marché responsable</Text>
        <View style={styles.filters}>
          {["all", "A", "B", "C"].map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              style={[styles.filter, label === item && styles.filterSelected]}
              onPress={() => setLabel(item)}
            >
              <Text style={[styles.filterText, label === item && styles.filterTextSelected]}>
                {item === "all" ? "Tous" : `Label ${item}`}
              </Text>
            </Pressable>
          ))}
        </View>

        {products.map((product) => (
          <Pressable
            key={product.id}
            accessibilityRole="button"
            style={styles.card}
            onPress={() => navigation.navigate("ProductDetail", { productId: product.id })}
          >
            <View style={styles.cardTop}>
              <View style={styles.badge}><Text style={styles.badgeText}>{product.label}</Text></View>
              <View style={styles.cardInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.region}>{product.region} · {product.unit}</Text>
              </View>
              <Text style={styles.price}>{product.price_tnd} TND</Text>
            </View>
            <Text style={styles.impact}>
              Impact : {product.impact_eau_m3} m³/eau · {product.impact_energie_kwh} kWh
            </Text>
          </Pressable>
        ))}

        <Pressable
          accessibilityRole="button"
          style={styles.scan}
          onPress={() => navigation.navigate("BuyerScanner")}
        >
          <Text style={styles.scanText}>Scanner un produit</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  filter: { minHeight: touchTarget, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
  filterSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.text, fontWeight: "700" },
  filterTextSelected: { color: "#fff" },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.lg },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  badge: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  cardInfo: { flex: 1 },
  productName: { color: colors.text, fontSize: 17, fontWeight: "800" },
  region: { color: colors.muted, marginTop: 4 },
  price: { color: colors.primary, fontWeight: "900" },
  impact: { color: colors.muted, marginTop: spacing.md },
  scan: { minHeight: touchTarget, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  scanText: { color: "#fff", fontWeight: "900" },
});
