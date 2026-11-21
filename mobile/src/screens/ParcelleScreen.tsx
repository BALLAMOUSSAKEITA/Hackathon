import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { LanguageSwitch } from "../components/LanguageSwitch";
import { ParcelleCarte } from "../components/ParcelleCarte";
import { Tap } from "../components/Tap";
import { API_URL, sprint04, type ParcelleDemo } from "../fixture";
import { formatNumber, useI18n, type CopyKey } from "../i18n";
import type { RootStackParamList } from "../navigation/types";
import { surfaceHectares, type Anneau } from "../surface";
import { colors, tap } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Parcelle">;

const SOURCES: { id: ParcelleDemo["source_eau"]; label: CopyKey }[] = [
  { id: "puits", label: "puits" },
  { id: "gda", label: "gda" },
  { id: "reseau", label: "reseauEau" },
];

const ENERGIES: { id: ParcelleDemo["energie"]; label: CopyKey }[] = [
  { id: "reseau", label: "reseau" },
  { id: "gasoil", label: "gasoil" },
  { id: "solaire", label: "solaire" },
];

const PHOTO_DEMO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function anneauDemo(): Anneau {
  return sprint04.parcelle.geometrie.coordinates[0].map(([lon, lat]) => [lon, lat]);
}

export function ParcelleScreen(_props: Props) {
  const demo = sprint04.parcelle;
  const { lang, t, direction } = useI18n();
  const [anneau, setAnneau] = useState<Anneau>(anneauDemo);
  const [ferme, setFerme] = useState(true);
  const [source, setSource] = useState(demo.source_eau);
  const [profondeur, setProfondeur] = useState(String(demo.profondeur_puits_m));
  const [debit, setDebit] = useState(String(demo.debit_m3_h));
  const [energie, setEnergie] = useState(demo.energie);
  const [photo, setPhoto] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [surfaceApi, setSurfaceApi] = useState<number | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const align = direction === "rtl" ? "right" : "left";
  const locale = surfaceHectares(anneau);
  const surface = surfaceApi ?? locale;

  function chargerDemo() {
    setAnneau(anneauDemo());
    setFerme(true);
    setSource(demo.source_eau);
    setProfondeur(String(demo.profondeur_puits_m));
    setDebit(String(demo.debit_m3_h));
    setEnergie(demo.energie);
    setSurfaceApi(null);
    setMessage(null);
  }

  function fermer() {
    if (anneau.length < 3) {
      setMessage(t("needPoints"));
      return;
    }
    const fermeAnneau =
      anneau[0][0] === anneau[anneau.length - 1][0] && anneau[0][1] === anneau[anneau.length - 1][1]
        ? anneau
        : ([...anneau, anneau[0]] as Anneau);
    setAnneau(fermeAnneau);
    setFerme(true);
    setSurfaceApi(null);
    setMessage(surfaceHectares(fermeAnneau) == null ? t("polygonInvalid") : null);
  }

  async function enregistrer() {
    const calculee = surfaceHectares(anneau);
    if (!ferme || calculee == null) {
      setMessage(t("polygonInvalid"));
      return;
    }
    const profondeurNombre = Number(profondeur.replace(",", "."));
    const debitNombre = Number(debit.replace(",", "."));
    if (!Number.isFinite(profondeurNombre) || !Number.isFinite(debitNombre) || debitNombre <= 0) {
      setMessage(t("polygonInvalid"));
      return;
    }
    setEnvoi(true);
    try {
      const reponse = await fetch(`${API_URL}/parcelles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: demo.id,
          nom: demo.nom,
          geometrie: { type: "Polygon", coordinates: [anneau] },
          surface_ha: calculee,
          source_eau: source,
          profondeur_puits_m: profondeurNombre,
          debit_m3_h: debitNombre,
          energie,
          culture_actuelle: demo.culture_actuelle,
          photo_sol: photo,
        }),
      });
      if (!reponse.ok) {
        setMessage(t("polygonInvalid"));
        return;
      }
      const corps = (await reponse.json()) as { surface_ha: number; photo_sol: string | null };
      setSurfaceApi(corps.surface_ha);
      const photoTexte = photo && !corps.photo_sol ? ` ${t("photoIgnored")}` : "";
      setMessage(
        corps.surface_ha === calculee
          ? `${t("parcelSaved")} ${t("surfaceSame")}${photoTexte}`
          : t("parcelSaved"),
      );
    } catch {
      setSurfaceApi(null);
      setMessage(t("parcelOffline"));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <ScrollView style={{ direction }} contentContainerStyle={styles.content}>
      <LanguageSwitch />
      <Text style={[styles.title, { textAlign: align }]}>{t("screen2")}</Text>
      <Text style={[styles.hint, { textAlign: align }]}>{t("drawHint")}</Text>
      <ParcelleCarte
        anneau={anneau}
        ferme={ferme}
        onAjouter={(point) => {
          setAnneau((actuel) => [...actuel, point]);
          setSurfaceApi(null);
          setMessage(null);
        }}
      />
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={fermer} style={styles.action}>
          <Text style={styles.actionText}>{t("closeShape")}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={chargerDemo} style={styles.action}>
          <Text style={styles.actionText}>{t("loadDemo")}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setAnneau([]);
            setFerme(false);
            setSurfaceApi(null);
            setMessage(null);
          }}
          style={styles.action}
        >
          <Text style={styles.actionText}>{t("clearShape")}</Text>
        </Pressable>
      </View>

      <View style={styles.surface}>
        <Text style={styles.surfaceLabel}>{t("surface")}</Text>
        <Text style={styles.surfaceValue}>
          {surface == null ? "—" : `${formatNumber(surface, lang, 2)} ${t("unitHa")}`}
        </Text>
      </View>

      <Text style={[styles.label, { textAlign: align }]}>{t("waterSource")}</Text>
      <View style={styles.choices}>
        {SOURCES.map((choix) => (
          <Pressable
            key={choix.id}
            accessibilityRole="button"
            onPress={() => setSource(choix.id)}
            style={[styles.choice, source === choix.id && styles.choiceOn]}
          >
            <Text style={[styles.choiceText, source === choix.id && styles.choiceTextOn]}>{t(choix.label)}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { textAlign: align }]}>{t("well")}</Text>
      <TextInput
        accessibilityLabel={t("well")}
        keyboardType="decimal-pad"
        value={profondeur}
        onChangeText={setProfondeur}
        style={[styles.input, { textAlign: align }]}
      />
      <Text style={[styles.label, { textAlign: align }]}>{t("flow")}</Text>
      <TextInput
        accessibilityLabel={t("flow")}
        keyboardType="decimal-pad"
        value={debit}
        onChangeText={setDebit}
        style={[styles.input, { textAlign: align }]}
      />

      <Text style={[styles.label, { textAlign: align }]}>{t("energy")}</Text>
      <View style={styles.choices}>
        {ENERGIES.map((choix) => (
          <Pressable
            key={choix.id}
            accessibilityRole="button"
            onPress={() => setEnergie(choix.id)}
            style={[styles.choice, energie === choix.id && styles.choiceOn]}
          >
            <Text style={[styles.choiceText, energie === choix.id && styles.choiceTextOn]}>{t(choix.label)}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { textAlign: align }]}>{t("crop")}</Text>
      <View style={[styles.choice, styles.choiceOn]}>
        <Text style={[styles.choiceText, styles.choiceTextOn]}>{demo.culture_actuelle.nom[lang]}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => setPhoto((actuel) => (actuel ? null : PHOTO_DEMO))}
        style={styles.action}
      >
        <Text style={styles.actionText}>{photo ? t("photoReady") : t("photoSoil")}</Text>
      </Pressable>

      <Tap label={t("saveParcel")} onPress={() => void enregistrer()} style={envoi ? styles.attente : undefined} />
      {message ? <Text style={[styles.message, { textAlign: align }]}>{message}</Text> : null}
      <Text style={[styles.note, { textAlign: align }]}>{sprint04.hypothese[lang]}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, backgroundColor: colors.bg },
  title: { width: "100%", fontSize: 28, fontWeight: "800", color: colors.ink },
  hint: { width: "100%", color: colors.muted, lineHeight: 20 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  action: {
    minHeight: tap.minHeight,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  actionText: { color: colors.olive, fontWeight: "700" },
  surface: {
    backgroundColor: colors.oliveSoft,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  surfaceLabel: { color: colors.olive, fontWeight: "700" },
  surfaceValue: { fontSize: 32, fontWeight: "800", color: colors.ink },
  label: { width: "100%", fontWeight: "700", color: colors.ink },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: {
    minHeight: tap.minHeight,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  choiceOn: { backgroundColor: colors.olive, borderColor: colors.olive },
  choiceText: { color: colors.ink, fontWeight: "700" },
  choiceTextOn: { color: colors.white },
  input: {
    minHeight: tap.minHeight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    color: colors.ink,
    fontSize: 16,
  },
  attente: { opacity: 0.45 },
  message: { width: "100%", color: colors.olive, fontWeight: "700", lineHeight: 20 },
  note: { width: "100%", color: colors.muted, lineHeight: 18 },
});
