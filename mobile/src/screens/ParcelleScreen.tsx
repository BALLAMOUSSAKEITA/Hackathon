import { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ApiError, api } from "../api";
import { BackButton, FarmerTabs } from "../components/chrome";
import { Icon } from "../components/icons";
import { ParcelleCarte } from "../components/ParcelleCarte";
import { Button, Footnote, Notice, Screen } from "../components/ui";
import { fixture, sprint04, type ParcelleDemo } from "../fixture";
import { formatNumber, useI18n, type CopyKey } from "../i18n";
import type { RootStackParamList } from "../navigation/types";
import { surfaceHectares, type Anneau } from "../surface";
import { colors, police } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Parcelle">;

const SOURCES: { id: ParcelleDemo["source_eau"]; label: CopyKey }[] = [
  { id: "puits", label: "puits" },
  { id: "gda", label: "mqaGda" },
  { id: "reseau", label: "reseauEau" },
];

const ENERGIES: { id: ParcelleDemo["energie"]; label: CopyKey }[] = [
  { id: "reseau", label: "reseau" },
  { id: "gasoil", label: "gasoil" },
  { id: "solaire", label: "solaire" },
];

/** La maquette affiche le débit en L/s ; l'API l'attend en m³/h. */
const LS_EN_M3H = 3.6;

type Message = { tone: "success" | "error" | "warning"; text: string };
type Photo = { uri: string; data: string };

function anneauDemo(): Anneau {
  return sprint04.parcelle.geometrie.coordinates[0].map(([lon, lat]) => [lon, lat]);
}

function nombre(texte: string): number {
  return Number(texte.replace(",", ".").trim());
}

function texteDecimal(valeur: number): string {
  return String(Math.round(valeur * 100) / 100).replace(".", ",");
}

export function ParcelleScreen({ navigation }: Props) {
  const demo = sprint04.parcelle;
  const { lang, t, align, direction } = useI18n();
  const [anneau, setAnneau] = useState<Anneau>(anneauDemo);
  const [ferme, setFerme] = useState(true);
  const [source, setSource] = useState(demo.source_eau);
  const [profondeur, setProfondeur] = useState(String(demo.profondeur_puits_m));
  const [debitLs, setDebitLs] = useState(texteDecimal(demo.debit_m3_h / LS_EN_M3H));
  const [energie, setEnergie] = useState(demo.energie);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [choixPhoto, setChoixPhoto] = useState(false);
  const [photoAttente, setPhotoAttente] = useState(false);
  const [photoErreur, setPhotoErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [surfaceApi, setSurfaceApi] = useState<number | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const locale = ferme ? surfaceHectares(anneau) : null;
  const surface = surfaceApi ?? locale;
  const coins = ferme ? Math.max(0, anneau.length - 1) : anneau.length;
  const profondeurOk = source !== "puits" || (Number.isFinite(nombre(profondeur)) && nombre(profondeur) > 0);
  const debitOk = Number.isFinite(nombre(debitLs)) && nombre(debitLs) > 0;
  const texte = { textAlign: align } as const;

  function modifierTrace(suivant: Anneau, estFerme: boolean) {
    setAnneau(suivant);
    setFerme(estFerme);
    setSurfaceApi(null);
    setMessage(null);
  }

  function chargerDemo() {
    modifierTrace(anneauDemo(), true);
    setSource(demo.source_eau);
    setProfondeur(String(demo.profondeur_puits_m));
    setDebitLs(texteDecimal(demo.debit_m3_h / LS_EN_M3H));
    setEnergie(demo.energie);
  }

  function fermer() {
    if (anneau.length < 3) {
      setMessage({ tone: "error", text: t("needPoints") });
      return;
    }
    const debut = anneau[0];
    const fin = anneau[anneau.length - 1];
    const fermeAnneau = debut[0] === fin[0] && debut[1] === fin[1] ? anneau : ([...anneau, debut] as Anneau);
    modifierTrace(fermeAnneau, true);
    if (surfaceHectares(fermeAnneau) == null) {
      setMessage({ tone: "error", text: t("polygonInvalid") });
    }
  }

  async function prendrePhoto(origine: "camera" | "galerie") {
    setChoixPhoto(false);
    setPhotoErreur(null);
    setPhotoAttente(true);
    try {
      const permission =
        origine === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPhotoErreur(t("mqaPhotoDenied"));
        return;
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.3, base64: true };
      const resultat =
        origine === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (resultat.canceled || !resultat.assets?.length) {
        return;
      }
      const image = resultat.assets[0];
      const data = image.base64 ? `data:${image.mimeType ?? "image/jpeg"};base64,${image.base64}` : image.uri;
      setPhoto({ uri: image.uri, data });
      setMessage(null);
    } catch {
      setPhotoErreur(t("mqaPhotoError"));
    } finally {
      setPhotoAttente(false);
    }
  }

  async function enregistrerEtAnalyser() {
    const calculee = surfaceHectares(anneau);
    if (!ferme || calculee == null) {
      setMessage({ tone: "error", text: t("polygonInvalid") });
      return;
    }
    if (!profondeurOk || !debitOk) {
      setMessage({ tone: "error", text: t("invalidNumbers") });
      return;
    }
    setEnvoi(true);
    setMessage(null);
    try {
      const corps = await api<{ surface_ha: number; photo_sol: string | null }>("/parcelles", {
        body: {
          id: demo.id,
          nom: demo.nom,
          geometrie: { type: "Polygon", coordinates: [anneau] },
          surface_ha: calculee,
          source_eau: source,
          profondeur_puits_m: source === "puits" ? nombre(profondeur) : 0,
          debit_m3_h: Math.round(nombre(debitLs) * LS_EN_M3H * 10) / 10,
          energie,
          culture_actuelle: demo.culture_actuelle,
          photo_sol: photo?.data ?? null,
        },
      });
      setSurfaceApi(corps.surface_ha);
      const photoIgnoree = photo && !corps.photo_sol ? ` ${t("photoIgnored")}` : "";
      setMessage({ tone: "success", text: `${t("savedThenAnalyse")}${photoIgnoree}` });
      navigation.navigate("Analyse");
    } catch (erreur) {
      if (erreur instanceof ApiError && erreur.status > 0) {
        setMessage({ tone: "error", text: t("polygonInvalid") });
        return;
      }
      // Hors connexion : on garde la surface calculée sur le téléphone et on continue.
      setMessage({ tone: "warning", text: t("parcelOffline") });
      navigation.navigate("Analyse");
    } finally {
      setEnvoi(false);
    }
  }

  const lieu = `${fixture.ferme.nom}, ${fixture.ferme.region}`;

  return (
    <Screen keyboard tabs={<FarmerTabs actif="Parcelle" />} contentStyle={styles.content}>
      <View style={styles.carteWrap}>
        <ParcelleCarte
          hauteur={255}
          anneau={anneau}
          ferme={ferme}
          onAjouter={(point) => {
            setAnneau((actuel) => [...actuel, point]);
            setSurfaceApi(null);
            setMessage(null);
          }}
        />
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <View style={styles.retour}>
            <BackButton />
          </View>
          <View style={styles.recherche} accessibilityLabel={`${t("mqaSearchPlace")} : ${lieu}`} pointerEvents="none">
            <Icon name="search" color={colors.muted} size={16} />
            <Text style={[styles.rechercheText, texte]} numberOfLines={1}>
              {lieu}
            </Text>
          </View>

          <View style={styles.pastilleTrace} pointerEvents="none">
            <Icon name={ferme ? "check" : "map"} color={colors.white} size={16} strokeWidth={2.4} />
            <Text style={styles.pastilleTraceText}>
              {ferme
                ? `${t("parcelDrawn")} · ${surface == null ? "—" : `${formatNumber(surface, lang, 1)} ${t("unitHa")}`}`
                : t("mqaParcelDrawingPill", { n: coins })}
            </Text>
          </View>

          <View style={styles.actionsCarte}>
            {ferme ? (
              <PastilleBlanche label={t("redraw")} onPress={() => modifierTrace([], false)} />
            ) : (
              <>
                {anneau.length > 0 ? <PastilleBlanche label={t("mqaUndo")} onPress={() => modifierTrace(anneau.slice(0, -1), false)} /> : null}
                {anneau.length >= 3 ? <PastilleBlanche label={t("mqaClose")} onPress={fermer} fort /> : null}
              </>
            )}
          </View>
        </View>
      </View>

      <View style={styles.corps}>
        {!ferme ? (
          <View style={styles.aide}>
            <Icon name="info" color={colors.olive} size={18} />
            <Text style={[styles.aideText, texte]}>{t("drawHint")}</Text>
            <Pressable accessibilityRole="button" hitSlop={6} onPress={chargerDemo}>
              <Text style={styles.aideLien}>{t("mqaDemoShort")}</Text>
            </Pressable>
          </View>
        ) : null}

        <View>
          <Text style={[styles.h1, texte]}>{t("talkWater")}</Text>
          <Text style={[styles.sous, texte]}>{t("talkWaterBody")}</Text>
        </View>

        {message ? <Notice tone={message.tone} text={message.text} /> : null}

        <View style={styles.groupe}>
          <Text style={[styles.legende, texte]}>{t("waterSource")}</Text>
          <Choix options={SOURCES.map((s) => ({ id: s.id, label: t(s.label) }))} value={source} onChange={setSource} />
        </View>

        <View style={styles.champs}>
          {source === "puits" ? (
            <ChampUnite
              label={t("wellDepth")}
              value={profondeur}
              onChangeText={setProfondeur}
              unite={t("unitM")}
              erreur={!profondeurOk}
            />
          ) : null}
          <ChampUnite label={t("pumpFlow")} value={debitLs} onChangeText={setDebitLs} unite={t("mqaUnitLs")} erreur={!debitOk} />
        </View>

        <View style={styles.groupe}>
          <Text style={[styles.legende, texte]}>{t("energySource")}</Text>
          <Choix options={ENERGIES.map((e) => ({ id: e.id, label: t(e.label) }))} value={energie} onChange={setEnergie} />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("mqaPhotoSoil")}
          accessibilityState={{ busy: photoAttente }}
          disabled={photoAttente}
          onPress={() => setChoixPhoto((ouvert) => !ouvert)}
          style={({ pressed }) => [styles.photo, photo && styles.photoOn, pressed && styles.pressed]}
        >
          {photo ? (
            <Image source={{ uri: photo.uri }} style={styles.miniature} accessibilityIgnoresInvertColors />
          ) : (
            <View style={styles.photoIcon}>
              {photoAttente ? <ActivityIndicator color={colors.olive} /> : <Icon name="camera" color={colors.olive} size={20} />}
            </View>
          )}
          <View style={styles.flex}>
            <Text style={[styles.photoTitre, texte]}>{t("mqaPhotoSoil")}</Text>
            <Text style={[styles.photoSous, texte]}>{photo ? t("mqaPhotoAdded") : t("photoHint")}</Text>
          </View>
          {photo ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => {
                setPhoto(null);
                setChoixPhoto(false);
              }}
              style={styles.retirer}
            >
              <Icon name="close" color={colors.clay} size={14} strokeWidth={2.6} />
              <Text style={styles.retirerText}>{t("mqaPhotoRemove")}</Text>
            </Pressable>
          ) : null}
        </Pressable>

        {choixPhoto ? (
          <View style={styles.choixPhoto}>
            <Text style={[styles.legende, texte]}>{t("mqaPhotoFrom")}</Text>
            <View style={styles.choixRow}>
              <Button small variant="secondary" icon="camera" label={t("mqaPhotoCamera")} onPress={() => void prendrePhoto("camera")} style={styles.flex} />
              <Button small variant="secondary" icon="layers" label={t("mqaPhotoGallery")} onPress={() => void prendrePhoto("galerie")} style={styles.flex} />
            </View>
            <Pressable accessibilityRole="button" hitSlop={6} onPress={() => setChoixPhoto(false)} style={styles.annuler}>
              <Text style={styles.annulerText}>{t("mqaCancel")}</Text>
            </Pressable>
          </View>
        ) : null}
        {photoErreur ? <Notice tone="error" text={photoErreur} /> : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: envoi, disabled: envoi }}
          disabled={envoi}
          onPress={() => void enregistrerEtAnalyser()}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          {envoi ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Text style={styles.ctaText}>{t("analyseMyLand")}</Text>
              <Icon name={direction === "rtl" ? "arrowLeft" : "arrowRight"} color={colors.white} size={20} strokeWidth={2.2} />
            </>
          )}
        </Pressable>

        <Footnote>{sprint04.hypothese[lang]}</Footnote>
      </View>
    </Screen>
  );
}

function PastilleBlanche({ label, onPress, fort = false }: { label: string; onPress: () => void; fort?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.pastilleBlanche, fort && styles.pastilleOlive, pressed && styles.pressed]}
    >
      <Text style={[styles.pastilleBlancheText, fort && styles.pastilleOliveText]}>{label}</Text>
    </Pressable>
  );
}

function Choix<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  return (
    <View accessibilityRole="radiogroup" style={styles.choix}>
      {options.map((option) => {
        const on = option.id === value;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(option.id)}
            style={({ pressed }) => [styles.choixBtn, on ? styles.choixOn : styles.choixOff, pressed && styles.pressed]}
          >
            <Text style={[styles.choixText, on ? styles.choixTextOn : styles.choixTextOff]} numberOfLines={1} adjustsFontSizeToFit>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ChampUnite({
  label,
  value,
  onChangeText,
  unite,
  erreur,
  keyboardType = "decimal-pad",
}: {
  label: string;
  value: string;
  onChangeText: (texte: string) => void;
  unite: string;
  erreur: boolean;
  keyboardType?: KeyboardTypeOptions;
}) {
  const { align } = useI18n();
  return (
    <View style={styles.champ}>
      <Text style={[styles.legende, { textAlign: align }]}>{label}</Text>
      <View style={[styles.boite, erreur && styles.boiteErreur]}>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          style={[styles.input, { textAlign: align }]}
        />
        <Text style={styles.unite}>{unite}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 24, gap: 0 },
  pressed: { opacity: 0.85 },
  carteWrap: { height: 255, backgroundColor: "#E4EAD8" },
  retour: { position: "absolute", top: 12, start: 20 },
  recherche: {
    position: "absolute",
    top: 16,
    start: 76,
    end: 20,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
  },
  rechercheText: { flex: 1, fontSize: 13, color: colors.muted, ...police("600") },
  pastilleTrace: {
    position: "absolute",
    start: 20,
    bottom: 16,
    backgroundColor: colors.ink,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pastilleTraceText: { color: colors.white, fontSize: 13, ...police("700") },
  actionsCarte: { position: "absolute", end: 20, bottom: 12, flexDirection: "row", gap: 8 },
  pastilleBlanche: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  pastilleBlancheText: { color: colors.olive, fontSize: 13, ...police("800") },
  pastilleOlive: { backgroundColor: colors.olive },
  pastilleOliveText: { color: colors.white },
  corps: { paddingHorizontal: 20, paddingTop: 20, gap: 16 },
  aide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.oliveSoft,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  aideText: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.oliveDeep, ...police("600") },
  aideLien: { fontSize: 12, color: colors.olive, textDecorationLine: "underline", ...police("800") },
  h1: { fontSize: 22, lineHeight: 28, letterSpacing: -0.4, color: colors.ink, ...police("800") },
  sous: { marginTop: 4, fontSize: 14, lineHeight: 20, color: colors.muted, ...police("400") },
  groupe: { gap: 8 },
  legende: { fontSize: 13, color: colors.ink, ...police("800") },
  choix: { flexDirection: "row", gap: 8 },
  choixBtn: { flex: 1, minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  choixOn: { borderWidth: 2, borderColor: colors.olive, backgroundColor: colors.oliveSoft },
  choixOff: { borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.white },
  choixText: { fontSize: 14 },
  choixTextOn: { color: colors.olive, ...police("800") },
  choixTextOff: { color: colors.ink, ...police("600") },
  champs: { flexDirection: "row", gap: 10 },
  champ: { flex: 1, gap: 6 },
  boite: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
    gap: 6,
  },
  boiteErreur: { borderColor: colors.clay, borderWidth: 1.5 },
  input: { flex: 1, minWidth: 0, fontSize: 16, color: colors.ink, paddingVertical: 10, ...police("700") },
  unite: { fontSize: 14, color: colors.muted, ...police("600") },
  photo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#9FB38A",
    backgroundColor: colors.white,
  },
  photoOn: { borderStyle: "solid", borderColor: colors.olive },
  photoIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.oliveSoft, alignItems: "center", justifyContent: "center" },
  miniature: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.oliveSoft },
  photoTitre: { fontSize: 14, color: colors.ink, ...police("800") },
  photoSous: { marginTop: 2, fontSize: 12, color: colors.muted, ...police("400") },
  retirer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: colors.claySoft,
  },
  retirerText: { fontSize: 12, color: colors.clay, ...police("800") },
  choixPhoto: { gap: 8, backgroundColor: colors.white, borderRadius: 16, padding: 12 },
  choixRow: { flexDirection: "row", gap: 8 },
  annuler: { alignSelf: "center", minHeight: 32, justifyContent: "center" },
  annulerText: { fontSize: 13, color: colors.muted, ...police("700") },
  cta: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.olive,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  ctaText: { fontSize: 16, color: colors.white, ...police("800") },
});
