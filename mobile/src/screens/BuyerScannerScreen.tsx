import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import fixture from "../../../fixtures/sprint-10.json";
import { colors, spacing } from "../theme";

export function BuyerScannerScreen() {
  const navigation = useNavigation<any>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return <SafeAreaView style={styles.safe}><Text style={styles.message}>Chargement de la caméra...</Text></SafeAreaView>;
  }
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permission}>
          <Text style={styles.title}>Scanner le QR</Text>
          <Pressable accessibilityRole="button" style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionText}>Autoriser la caméra</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={styles.demoButton}
            onPress={() => navigation.navigate("ProductDetail", { productId: "produit-olive-001" })}
          >
            <Text style={styles.demoText}>Ouvrir le QR démo ARDI-PRODUCT-001</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanned ? undefined : ({ data }) => {
          setScanned(true);
          const product = fixture.produits.find((item) => item.qr === data);
          if (product) {
            navigation.navigate("ProductDetail", { productId: product.id });
          } else {
            setScanned(false);
          }
        }}
      />
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <Text style={styles.scanTitle}>Scanner le QR Ardi</Text>
        {scanned && <Text style={styles.scanMessage}>Recherche du produit...</Text>}
        <Pressable
          accessibilityRole="button"
          style={styles.demoButtonOverlay}
          onPress={() => navigation.navigate("ProductDetail", { productId: "produit-olive-001" })}
        >
          <Text style={styles.demoText}>QR démo</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  message: { color: colors.muted, textAlign: "center", marginTop: 40 },
  permission: { flex: 1, justifyContent: "center", padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 28, fontWeight: "800", textAlign: "center" },
  permissionButton: { minHeight: 44, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  permissionText: { color: "#fff", fontWeight: "900" },
  demoButton: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.primary, alignItems: "center", justifyContent: "center" },
  demoText: { color: colors.primary, fontWeight: "800" },
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, alignItems: "center", padding: spacing.lg },
  scanTitle: { color: "#fff", fontSize: 22, fontWeight: "900", textShadowColor: "#000", textShadowRadius: 4 },
  scanMessage: { color: "#fff", marginTop: 8 },
  demoButtonOverlay: { minHeight: 44, marginTop: spacing.lg, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
});
