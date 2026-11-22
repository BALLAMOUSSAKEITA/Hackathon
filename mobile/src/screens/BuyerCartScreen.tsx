import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";

import fixture from "../../../fixtures/sprint-10.json";
import { colors, spacing, touchTarget } from "../theme";

export function BuyerCartScreen() {
  const [quantity, setQuantity] = useState(1);
  const [productId, setProductId] = useState("produit-olive-001");
  const [payment, setPayment] = useState("d17");
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("ardi.cart.sprint10").then((saved) => {
      if (saved) {
        const cart = JSON.parse(saved);
        setProductId(cart.productId);
        setQuantity(cart.quantity);
      }
    });
  }, []);

  const product = fixture.produits.find((item) => item.id === productId) ?? fixture.produits[0];
  const total = quantity * product.price_tnd;

  async function pay() {
    await AsyncStorage.setItem("ardi.order.sprint10", JSON.stringify({
      productId,
      quantity,
      payment,
      status: "simule",
    }));
    setPaid(true);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Mon panier</Text>
        <View style={styles.card}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.meta}>{quantity} × {product.unit}</Text>
          <Text style={styles.total}>{total.toFixed(2)} TND</Text>
          <Text style={styles.impact}>
            Impact : {(quantity * product.impact_eau_m3)} m³ d'eau · {(quantity * product.impact_energie_kwh)} kWh
          </Text>
        </View>

        <Text style={styles.section}>Moyen de paiement simulé</Text>
        <View style={styles.payments}>
          {fixture.paiements.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              style={[styles.payment, payment === item.id && styles.paymentSelected]}
              onPress={() => setPayment(item.id)}
            >
              <Text style={[styles.paymentText, payment === item.id && styles.paymentTextSelected]}>
                {item.name}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable accessibilityRole="button" style={styles.payButton} onPress={pay}>
          <Text style={styles.payText}>{paid ? "Paiement simulé confirmé" : "Confirmer le paiement simulé"}</Text>
        </Pressable>
        {paid && <Text style={styles.success}>Aucune donnée de carte n'a été enregistrée.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.lg },
  productName: { color: colors.text, fontSize: 20, fontWeight: "800" },
  meta: { color: colors.muted, marginTop: 4 },
  total: { color: colors.primary, fontSize: 24, fontWeight: "900", marginTop: spacing.md },
  impact: { color: colors.muted, marginTop: spacing.sm },
  section: { color: colors.text, fontWeight: "800", marginTop: spacing.sm },
  payments: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  payment: { minHeight: touchTarget, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
  paymentSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  paymentText: { color: colors.text, fontWeight: "700" },
  paymentTextSelected: { color: "#fff" },
  payButton: { minHeight: touchTarget, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  payText: { color: "#fff", fontWeight: "900" },
  success: { color: colors.primary, textAlign: "center" },
});
