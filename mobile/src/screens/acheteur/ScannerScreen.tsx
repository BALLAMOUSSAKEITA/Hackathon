import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useIsFocused } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { G, Rect, Text as SvgText } from "react-native-svg";

import { api, ApiError } from "../../api";
import { allerOnglet, BuyerTabs } from "../../components/chrome";
import { Icon } from "../../components/icons";
import { LabelBadge, Notice } from "../../components/ui";
import { sprint08, sprint10, sprint18 } from "../../donnees";
import { useI18n } from "../../i18n";
import type { RootStackParamList } from "../../navigation/types";
import type { ProduitMarche } from "../../panier";
import { colors, FAMILLES, police } from "../../theme";
import type { Localized } from "../../types";

type Props = NativeStackScreenProps<RootStackParamList, "Scanner">;

type Label = { qr: string; note: string | null; statut: string; ferme: string; produit: Localized };

type Resultat = { produit: ProduitMarche | null; nom: Localized; ferme: string; note: string | null; statut: string };

const LOCAL = sprint10.produits as ProduitMarche[];
const LABELS_LOCAUX = [...sprint08.labels, ...sprint18.labels] as Label[];
const VISEUR = 280;
const VERT = "#A9DBB4";

function depuisProduit(produit: ProduitMarche): Resultat {
  return { produit, nom: produit.nom, ferme: produit.ferme, note: produit.label, statut: "actif" };
}

function associer(label: Label, catalogue: ProduitMarche[]): Resultat {
  const produit =
    catalogue.find((item) => item.nom.fr === label.produit.fr && item.ferme === label.ferme) ??
    catalogue.find((item) => item.nom.fr === label.produit.fr) ??
    null;
  const note = label.statut === "suspendu" ? null : label.note;
  return { produit, nom: label.produit, ferme: label.ferme, note, statut: label.statut };
}

/** Retrouve le produit d'un QR : /produits?qr=, puis /labels/{qr}, puis les fixtures si le réseau ne répond pas. */
async function trouver(qr: string): Promise<Resultat | null> {
  const code = encodeURIComponent(qr);
  try {
    const corps = await api<{ produits: ProduitMarche[] }>(`/produits?qr=${code}`);
    const produit = corps.produits?.[0];
    if (produit) {
      return depuisProduit(produit);
    }
  } catch {
    const local = LOCAL.find((item) => item.qr === qr);
    if (local) {
      return depuisProduit(local);
    }
    const label = LABELS_LOCAUX.find((item) => item.qr === qr);
    return label ? associer(label, LOCAL) : null;
  }
  let label: Label;
  try {
    label = await api<Label>(`/labels/${code}`);
  } catch (erreur) {
    if (erreur instanceof ApiError && erreur.status === 404) {
      return null;
    }
    const local = LABELS_LOCAUX.find((item) => item.qr === qr);
    return local ? associer(local, LOCAL) : null;
  }
  let catalogue = LOCAL;
  try {
    const corps = await api<{ produits: ProduitMarche[] }>("/produits");
    catalogue = corps.produits?.length ? corps.produits : LOCAL;
  } catch {
    // Catalogue local.
  }
  return associer(label, catalogue);
}

/** Étiquette de bouteille avec son QR, dessinée dans le viseur quand la caméra n'est pas active (maq/14-scanner.html). */
function EtiquetteDemo() {
  return (
    <Svg width={VISEUR} height={VISEUR} viewBox="0 0 280 280">
      <Rect x={70} y={40} width={140} height={200} rx={16} fill="#C9A227" />
      <Rect x={90} y={70} width={100} height={140} rx={8} fill="#FFFFFF" />
      <G transform="translate(105 82) scale(3.3)" fill={colors.ink}>
        <Rect x={0} y={0} width={7} height={7} />
        <Rect x={14} y={0} width={7} height={7} />
        <Rect x={0} y={14} width={7} height={7} />
        <Rect x={1} y={1} width={5} height={5} fill="#FFFFFF" />
        <Rect x={15} y={1} width={5} height={5} fill="#FFFFFF" />
        <Rect x={1} y={15} width={5} height={5} fill="#FFFFFF" />
        <Rect x={2} y={2} width={3} height={3} />
        <Rect x={16} y={2} width={3} height={3} />
        <Rect x={2} y={16} width={3} height={3} />
        {[
          [9, 1], [11, 3], [8, 5], [10, 9], [13, 11], [16, 9], [19, 12], [9, 14], [12, 17], [15, 15], [18, 18], [3, 9], [5, 11], [20, 20],
        ].map(([x, y]) => (
          <Rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />
        ))}
      </G>
      <SvgText x={140} y={196} textAnchor="middle" fontFamily={FAMILLES["800"]} fontSize={13} fill={colors.labelA}>
        ARDI
      </SvgText>
    </Svg>
  );
}

export function ScannerScreen({ navigation }: Props) {
  const { t, tx, align, direction } = useI18n();
  const insets = useSafeAreaInsets();
  const focus = useIsFocused();
  const [permission, demanderPermission] = useCameraPermissions();
  const [cameraKo, setCameraKo] = useState(false);
  const [lampe, setLampe] = useState(false);
  const [code, setCode] = useState("");
  const [manuel, setManuel] = useState(false);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [erreur, setErreur] = useState(false);
  const [attente, setAttente] = useState(false);
  const [balayage] = useState(() => new Animated.Value(0));
  const verrou = useRef(false);
  const dernier = useRef<{ code: string; quand: number } | null>(null);

  const cameraActive = Boolean(permission?.granted) && focus && !cameraKo;

  useEffect(() => {
    if (resultat) {
      return;
    }
    const boucle = Animated.loop(
      Animated.sequence([
        Animated.timing(balayage, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(balayage, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== "web" }),
      ]),
    );
    boucle.start();
    return () => boucle.stop();
  }, [balayage, resultat]);

  async function chercher(qr: string) {
    const valeur = qr.trim();
    if (!valeur || verrou.current) {
      return;
    }
    verrou.current = true;
    dernier.current = { code: valeur, quand: Date.now() };
    setAttente(true);
    setErreur(false);
    setResultat(null);
    try {
      const trouve = await trouver(valeur);
      if (trouve) {
        setResultat(trouve);
      } else {
        setErreur(true);
      }
    } finally {
      setAttente(false);
      verrou.current = false;
    }
  }

  function surScan(scan: BarcodeScanningResult) {
    const valeur = scan.data?.trim();
    if (!valeur) {
      return;
    }
    // Le même code reste devant l'objectif : on ne le relit pas avant 4 s.
    if (dernier.current && dernier.current.code === valeur && Date.now() - dernier.current.quand < 4000) {
      return;
    }
    void chercher(valeur);
  }

  function recommencer() {
    setResultat(null);
    setErreur(false);
    dernier.current = null;
  }

  function demander() {
    if (permission && !permission.granted && !permission.canAskAgain) {
      void Linking.openSettings().catch(() => setCameraKo(true));
      return;
    }
    setCameraKo(false);
    void demanderPermission().catch(() => setCameraKo(true));
  }

  const ligneY = balayage.interpolate({ inputRange: [0, 1], outputRange: [20, VISEUR - 23] });

  let messageCamera: string | null = null;
  if (!cameraActive && focus) {
    if (cameraKo) {
      messageCamera = t("mdCamUnavailable");
    } else if (permission && !permission.granted && !permission.canAskAgain) {
      messageCamera = t("mdCamDenied");
    } else {
      messageCamera = t("mdCamAsk");
    }
  }
  const peutDemander = !cameraKo && !permission?.granted;
  const montrerManuel = !cameraActive || manuel;

  return (
    <View style={[styles.racine, { direction }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={[styles.contenu, { paddingTop: insets.top + 20 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.barre}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("mdClose")}
              onPress={() => allerOnglet(navigation, "Marche", "Marche")}
              style={({ pressed }) => [styles.rond, pressed && styles.presse]}
            >
              <Icon name="close" color={colors.white} size={20} strokeWidth={2.2} />
            </Pressable>
            <Text style={styles.titre} accessibilityRole="header">
              {t("scannerTitle")}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={lampe ? t("mdTorchOff") : t("mdTorchOn")}
              accessibilityState={{ disabled: !cameraActive, selected: lampe }}
              disabled={!cameraActive}
              onPress={() => setLampe((on) => !on)}
              style={({ pressed }) => [styles.rond, lampe && cameraActive && styles.rondOn, !cameraActive && styles.inactif, pressed && styles.presse]}
            >
              <Icon name="flash" color={lampe && cameraActive ? colors.ink : colors.white} size={20} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={styles.viseur}>
            {cameraActive ? (
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                enableTorch={lampe}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={resultat || attente ? undefined : surScan}
                onMountError={() => setCameraKo(true)}
              />
            ) : (
              <EtiquetteDemo />
            )}
            <View style={styles.cadre} pointerEvents="none" />
            {resultat ? null : <Animated.View pointerEvents="none" style={[styles.ligne, { transform: [{ translateY: ligneY }] }]} />}
          </View>

          <Text style={styles.consigne}>{t("scannerBody")}</Text>

          {attente ? (
            <View style={styles.attente}>
              <ActivityIndicator color={colors.leaf} />
              <Text style={styles.attenteTexte}>{t("mdSearching")}</Text>
            </View>
          ) : null}

          {resultat ? (
            <View style={styles.resultat}>
              <Pressable
                accessibilityRole={resultat.produit ? "button" : "text"}
                accessibilityLabel={`${tx(resultat.nom)} · ${resultat.ferme}. ${resultat.produit ? t("productDetected") : t("mdLabelOnly")}`}
                disabled={!resultat.produit}
                onPress={() => resultat.produit && navigation.navigate("Produit", { id: resultat.produit.id })}
                style={({ pressed }) => [styles.carte, pressed && styles.presse]}
              >
                <LabelBadge note={resultat.note} size={40} />
                <View style={styles.flex}>
                  <Text style={[styles.carteTitre, { textAlign: align }]} numberOfLines={2}>
                    {tx(resultat.nom)} · {resultat.ferme}
                  </Text>
                  <Text style={[styles.carteSous, { textAlign: align }]}>{resultat.produit ? t("productDetected") : t("mdLabelOnly")}</Text>
                  {resultat.statut === "suspendu" ? <Text style={[styles.carteAlerte, { textAlign: align }]}>{t("mdLabelSuspended")}</Text> : null}
                </View>
                {resultat.produit ? <Icon name={direction === "rtl" ? "back" : "forward"} color={colors.olive} size={20} strokeWidth={2.2} /> : null}
              </Pressable>
              <Pressable accessibilityRole="button" onPress={recommencer} style={({ pressed }) => [styles.boutonClair, pressed && styles.presse]}>
                <Icon name="scan" color={colors.white} size={18} strokeWidth={2} />
                <Text style={styles.boutonClairTexte}>{t("mdScanAgain")}</Text>
              </Pressable>
            </View>
          ) : null}

          {erreur ? <Notice tone="error" text={t("qrUnknown")} action={{ label: t("mdScanAgain"), onPress: recommencer }} /> : null}

          {messageCamera ? (
            <View style={styles.panneau}>
              <Text style={[styles.panneauTexte, { textAlign: align }]}>{messageCamera}</Text>
              {peutDemander || (permission && !permission.canAskAgain) ? (
                <Pressable accessibilityRole="button" onPress={demander} style={({ pressed }) => [styles.boutonPlein, pressed && styles.presse]}>
                  <Icon name="camera" color={colors.white} size={18} strokeWidth={2} />
                  <Text style={styles.boutonPleinTexte}>{permission && !permission.granted && !permission.canAskAgain ? t("mdCamSettings") : t("mdCamAllow")}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {cameraActive && !manuel ? (
            <Pressable accessibilityRole="button" onPress={() => setManuel(true)} hitSlop={8} style={styles.lienManuel}>
              <Text style={styles.lienManuelTexte}>{t("qrManual")}</Text>
            </Pressable>
          ) : null}

          {montrerManuel ? (
            <View style={styles.panneau}>
              <Text style={[styles.panneauTitre, { textAlign: align }]}>{t("qrManual")}</Text>
              <View style={styles.saisie}>
                <TextInput
                  accessibilityLabel={t("qrManual")}
                  value={code}
                  onChangeText={setCode}
                  placeholder={sprint10.qr_demo}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  onSubmitEditing={() => void chercher(code)}
                  style={[styles.champ, { textAlign: align }]}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !code.trim() || attente }}
                  disabled={!code.trim() || attente}
                  onPress={() => void chercher(code)}
                  style={({ pressed }) => [styles.boutonChercher, (!code.trim() || attente) && styles.inactif, pressed && styles.presse]}
                >
                  <Text style={styles.boutonPleinTexte}>{t("search")}</Text>
                </Pressable>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={attente}
                onPress={() => void chercher(sprint10.qr_demo)}
                style={({ pressed }) => [styles.boutonClair, pressed && styles.presse]}
              >
                <Icon name="qr" color={colors.white} size={18} strokeWidth={2} />
                <Text style={styles.boutonClairTexte}>{t("simulateScan")}</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <BuyerTabs actif="Scanner" />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  racine: { flex: 1, backgroundColor: colors.scanner },
  contenu: { paddingHorizontal: 20, paddingBottom: 28, gap: 18 },
  barre: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rond: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.scannerSoft, alignItems: "center", justifyContent: "center" },
  rondOn: { backgroundColor: VERT },
  inactif: { opacity: 0.45 },
  presse: { opacity: 0.8 },
  titre: { flex: 1, textAlign: "center", color: colors.white, fontSize: 15, ...police("800") },
  viseur: {
    alignSelf: "center",
    width: VISEUR,
    height: VISEUR,
    marginTop: 40,
    borderRadius: 28,
    backgroundColor: "#2A352C",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  cadre: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 28, borderWidth: 3, borderColor: VERT },
  ligne: { position: "absolute", top: 0, left: 16, right: 16, height: 3, borderRadius: 2, backgroundColor: VERT },
  consigne: { marginHorizontal: 20, textAlign: "center", fontSize: 15, lineHeight: 22, color: colors.leaf, ...police("500") },
  attente: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  attenteTexte: { color: colors.leaf, fontSize: 14, ...police("700") },
  resultat: { gap: 10 },
  carte: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14 },
  carteTitre: { fontSize: 14, color: colors.ink, ...police("800") },
  carteSous: { marginTop: 2, fontSize: 12, color: colors.muted, ...police("600") },
  carteAlerte: { marginTop: 2, fontSize: 12, color: colors.clay, ...police("800") },
  panneau: { gap: 10, backgroundColor: colors.scannerSoft, borderRadius: 18, padding: 14 },
  panneauTitre: { color: colors.white, fontSize: 14, ...police("800") },
  panneauTexte: { color: colors.leaf, fontSize: 13, lineHeight: 19, ...police("600") },
  lienManuel: { alignSelf: "center", minHeight: 44, justifyContent: "center" },
  lienManuelTexte: { color: colors.leaf, fontSize: 14, textDecorationLine: "underline", ...police("700") },
  saisie: { flexDirection: "row", gap: 8 },
  champ: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 14,
    color: colors.white,
    fontSize: 15,
    ...police("600"),
  },
  boutonChercher: { minHeight: 48, borderRadius: 14, backgroundColor: colors.olive, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  boutonPlein: { minHeight: 48, borderRadius: 14, backgroundColor: colors.olive, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  boutonPleinTexte: { color: colors.white, fontSize: 15, ...police("800") },
  boutonClair: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  boutonClairTexte: { color: colors.white, fontSize: 14, ...police("800") },
});
