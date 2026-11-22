import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";

import fixture from "../../../fixtures/sprint-10.json";
import { colors, spacing, touchTarget } from "../theme";

export function ProductDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const productId = route.params?.productId ?? "produit-olive-001";
  const product = fixture.produits.find((item) => item.id === productId) ?? fixture.produits[0];
  const [quantity, setQuantity] = useState(1);

  async function addToCart() {
    await AsyncStorage.setItem("ardi.cart.sprint10", JSON.stringify({
      productId: product.id,
      quantity,
    }));
    navigation.navigate("BuyerCart");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.badge}><Text style={styles.badgeText}>{product.label}</Text></View>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>{product.name}</Text>
            <Text style={styles.region}>{product.ferme} · {product.region}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Impact du produit</Text>
          <Text style={styles.value}>{product.impact_eau_m3} m³ d'eau soutenus</Text>
          <Text style={styles.value}>{product.impact_energie_kwh} kWh</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Histoire de la ferme</Text>
          <Text style={styles.story}>{product.histoire}</Text>
        </View>

        <View style={styles.quantityRow}>
          <Pressable accessibilityRole="button" style={styles.control} onPress={() => setQuantity(Math.max(1, quantity - 1))}>
            <Text style={styles.controlText}>−</Text>
          </Pressable>
          <Text style={styles.quantity}>{quantity} × {product.unit}</Text>
          <Pressable accessibilityRole="button" style={styles.control} onPress={() => setQuantity(quantity + 1)}>
            <Text style={styles.controlText}>+</Text>
          </Pressable>
        </View>

        <Text style={styles.total}>{(quantity * product.price_tnd).toFixed(2)} TND</Text>
        <Pressable accessibilityRole="button" style={styles.button} onPress={addToCart}>
          <Text style={styles.buttonText}>Ajouter au panier</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  badge: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#fff", fontSize: 26, fontWeight: "900" },
  headerInfo: { flex: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: "800" },
  region: { color: colors.muted, marginTop: 4 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.lg },
  cardLabel: { color: colors.muted, fontSize: 13, textTransform: "uppercase", marginBottom: spacing.sm },
  value: { color: colors.primary, fontSize: 18, fontWeight: "800", marginTop: 4 },
  story: { color: colors.text, lineHeight: 22 },
  quantityRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.lg },
  control: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  controlText: { color: "#fff", fontSize: 24, fontWeight: "900" },
  quantity: { color: colors.text, fontWeight: "800" },
  total: { color: colors.primary, fontSize: 24, fontWeight: "900", textAlign: "center" },
  button: { minHeight: touchTarget, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#fff", fontWeight: "900" },
});
