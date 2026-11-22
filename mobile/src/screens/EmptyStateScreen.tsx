import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing, touchTarget } from "../theme";

export function EmptyStateScreen({ title }: { title: string }) {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>Écran prévu dans un sprint ultérieur.</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.button}
          onPress={() => navigation.navigate("Welcome")}
        >
          <Text style={styles.buttonText}>Retour à l’accueil</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.lg, justifyContent: "center" },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  message: { color: colors.muted, marginTop: spacing.sm, marginBottom: spacing.xl },
  button: {
    minHeight: touchTarget,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#ffffff", fontWeight: "800" },
});
