import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import fixture from "../../../fixtures/sprint-11.json";
import { colors, spacing, touchTarget } from "../theme";

export function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const [notifications, setNotifications] = useState(fixture.notifications);

  function markRead(id: string) {
    setNotifications((current) =>
      current.map((item) => item.id === id ? { ...item, read: true } : item),
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Notifications</Text>
        {notifications.map((item) => (
          <View key={item.id} style={[styles.card, item.read && styles.read]}>
            <View style={styles.cardHeader}>
              <View style={styles.typeBadge}><Text style={styles.typeText}>{item.type}</Text></View>
              <Text style={styles.date}>{item.date.slice(11, 16)}</Text>
            </View>
            <Text style={styles.message}>{item.message}</Text>
            <View style={styles.actions}>
              {!item.read && (
                <Pressable accessibilityRole="button" style={styles.readButton} onPress={() => markRead(item.id)}>
                  <Text style={styles.readText}>Marquer comme lue</Text>
                </Pressable>
              )}
              {item.type === "commande" && (
                <Pressable
                  accessibilityRole="button"
                  style={styles.orderButton}
                  onPress={() => navigation.navigate("Sales")}
                >
                  <Text style={styles.orderText}>Voir la commande</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  card: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.lg },
  read: { opacity: 0.72 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  typeBadge: { minHeight: 44, borderRadius: 22, backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
  typeText: { color: colors.primary, fontWeight: "900", textTransform: "capitalize" },
  date: { color: colors.muted },
  message: { color: colors.text, fontWeight: "700", marginTop: spacing.sm },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  readButton: { minHeight: touchTarget, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
  readText: { color: colors.muted, fontWeight: "800" },
  orderButton: { minHeight: touchTarget, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
  orderText: { color: "#fff", fontWeight: "900" },
});
