import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";

import fixture from "../../../fixtures/sprint-11.json";
import { colors, spacing, touchTarget } from "../theme";

export function SalesScreen() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState(String(fixture.produit.price_tnd));
  const [stock, setStock] = useState(String(fixture.produit.stock_l));
  const [orderStatus, setOrderStatus] = useState(fixture.commande.status);
  const [message, setMessage] = useState("");

  async function publish() {
    await AsyncStorage.setItem("ardi.product.sprint11", JSON.stringify({
      name: name || fixture.produit.name,
      price_tnd: Number(price),
      stock_l: Number(stock),
      label: fixture.ferme.label,
    }));
    setMessage("Produit publié");
  }

  function accept() {
    setOrderStatus("acceptee");
  }

  function counter() {
    setOrderStatus("contre_proposition");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Mes ventes</Text>

        <View style={styles.summary}>
          <View style={styles.metric}><Text style={styles.metricValue}>{fixture.vente.month_total_tnd}</Text><Text style={styles.metricLabel}>TND ce mois</Text></View>
          <View style={styles.metric}><Text style={styles.metricValue}>{fixture.vente.average_price_tnd}</Text><Text style={styles.metricLabel}>Prix moyen</Text></View>
          <View style={styles.metric}><Text style={styles.metricValue}>{fixture.vente.typical_market_price_tnd}</Text><Text style={styles.metricLabel}>Prix marché</Text></View>
        </View>

        <Text style={styles.section}>Publier un produit</Text>
        <TextInput value={name} onChangeText={setName} placeholder={fixture.produit.name} style={styles.input} />
        <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" style={styles.input} />
        <TextInput value={stock} onChangeText={setStock} keyboardType="decimal-pad" style={styles.input} />
        <Pressable accessibilityRole="button" style={styles.button} onPress={publish}>
          <Text style={styles.buttonText}>Publier</Text>
        </Pressable>
        {message !== "" && <Text style={styles.success}>{message}</Text>}

        <View style={styles.orderCard}>
          <Text style={styles.section}>Demande de devis</Text>
          <Text style={styles.buyer}>{fixture.devis.buyer_name}</Text>
          <Text style={styles.meta}>{fixture.devis.quantity_l} litres · {fixture.devis.proposed_price_tnd} TND par litre</Text>
          <Text style={styles.status}>Statut : {orderStatus}</Text>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" style={styles.accept} onPress={accept}>
              <Text style={styles.acceptText}>Accepter</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.counter} onPress={counter}>
              <Text style={styles.counterText}>Contre-proposer</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  summary: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metric: { flexGrow: 1, minWidth: 92, minHeight: 72, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", padding: spacing.sm },
  metricValue: { color: colors.primary, fontSize: 20, fontWeight: "900" },
  metricLabel: { color: colors.muted, fontSize: 12, textAlign: "center" },
  section: { color: colors.text, fontSize: 18, fontWeight: "800" },
  input: { minHeight: touchTarget, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, paddingHorizontal: spacing.md },
  button: { minHeight: touchTarget, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#fff", fontWeight: "900" },
  success: { color: colors.primary, textAlign: "center" },
  orderCard: { backgroundColor: "#dcfce7", borderWidth: 1, borderColor: "#86efac", borderRadius: 16, padding: spacing.lg, gap: 6 },
  buyer: { color: colors.text, fontSize: 20, fontWeight: "800" },
  meta: { color: colors.muted },
  status: { color: colors.primary, fontWeight: "800", marginTop: 4 },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  accept: { flex: 1, minHeight: touchTarget, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  acceptText: { color: "#fff", fontWeight: "900" },
  counter: { flex: 1, minHeight: touchTarget, borderRadius: 12, borderWidth: 1, borderColor: colors.primary, alignItems: "center", justifyContent: "center" },
  counterText: { color: colors.primary, fontWeight: "900" },
});
