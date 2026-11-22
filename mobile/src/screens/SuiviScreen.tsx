import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { api, ApiError, estAnnule } from "../api";
import { FarmerTabs } from "../components/chrome";
import { Action, C, Carte, dateCourte, EnTete, Pastilles, PastilleIcone, T } from "../components/maquetteC-ui";
import { Button, Footnote, Loader, Notice, Screen } from "../components/ui";
import type { IconName } from "../components/icons";
import { sprint14 } from "../donnees";
import { formatNumber, useI18n, type CopyKey } from "../i18n";
import { colors, police } from "../theme";
import type { Localized } from "../types";

type Scenario = "une" | "deux";
type Indice = "vegetation" | "humidite";

type Suivi = {
  zones: { id: string; nom: Localized; ndvi: number }[];
  plan_eau_m3: number;
  irrigation_m3: number;
  alertes: { type: string; statut: string; message: Localized }[];
  statut: string;
};

type Photo = { uri: string; nom: string; position?: string };

/** Même logique que api/app/suite.py suivi(), pour le mode hors ligne. */
function suiviLocal(scenario: Scenario): Suivi {
  const fiche = sprint14;
  const divergentes = fiche.series[scenario].filter((image) => image.irrigation_m3 > fiche.plan_eau_m3).length;
  const statut = divergentes >= 2 ? "ecart_confirme" : divergentes === 1 ? "a_confirmer" : "conforme";
  return {
    zones: fiche.zones,
    plan_eau_m3: fiche.plan_eau_m3,
    irrigation_m3: fiche.irrigation_m3,
    alertes: fiche.irrigation_m3 > fiche.plan_eau_m3 ? [{ type: "irrigation", statut, message: fiche.alerte }] : [],
    statut,
  };
}

const STATUTS: Record<string, CopyKey> = {
  conforme: "statusConforme",
  a_confirmer: "statusAConfirmer",
  ecart_confirme: "statusEcart",
};

/** Sentinel-2 repasse tous les 5 jours : dernière image et prochaine, calées sur ce rythme. */
const REVISITE_JOURS = 5;
const JOUR_MS = 24 * 3600 * 1000;

const LIGNES = 4;
const COLONNES = 5;

/** Petite variation fixe d'une case à l'autre, pour que la grille ne soit pas uniforme. */
function variation(ligne: number, colonne: number, graine: number) {
  return (((ligne * 7 + colonne * 13 + graine * 5) % 7) - 3) * 0.015;
}

type Case = { zone: Localized; valeur: number; couleur: string; stress: boolean };

/**
 * Grille 4 × 5 construite à partir des zones du fichier : les lignes du haut sont la première zone (nord),
 * celles du bas la dernière (sud). Végétation = NDVI ; humidité = indice estimé à partir du même NDVI.
 */
function grille(zones: Suivi["zones"], indice: Indice): Case[] {
  const cases: Case[] = [];
  for (let ligne = 0; ligne < LIGNES; ligne += 1) {
    const zone = zones[Math.min(zones.length - 1, Math.floor((ligne * zones.length) / LIGNES))];
    for (let colonne = 0; colonne < COLONNES; colonne += 1) {
      if (!zone) {
        continue;
      }
      if (indice === "vegetation") {
        const valeur = zone.ndvi + variation(ligne, colonne, 0);
        const couleur = valeur >= 0.4 ? colors.green : valeur >= 0.3 ? C.vertClair : colors.orange;
        cases.push({ zone: zone.nom, valeur, couleur, stress: valeur < 0.3 });
      } else {
        const valeur = zone.ndvi - 0.18 + variation(ligne, colonne, 3);
        const couleur = valeur >= 0.2 ? colors.water : valeur >= 0.1 ? C.bleuClair : colors.orange;
        cases.push({ zone: zone.nom, valeur, couleur, stress: valeur < 0.1 });
      }
    }
  }
  return cases;
}

function positionExif(exif: Record<string, unknown> | null | undefined): string | undefined {
  const lat = exif?.GPSLatitude;
  const lon = exif?.GPSLongitude;
  if (typeof lat !== "number" || typeof lon !== "number") {
    return undefined;
  }
  const signeLat = exif?.GPSLatitudeRef === "S" ? -1 : 1;
  const signeLon = exif?.GPSLongitudeRef === "W" ? -1 : 1;
  return `${(lat * signeLat).toFixed(5)},${(lon * signeLon).toFixed(5)}`;
}

export function SuiviScreen() {
  const { lang, t, tx } = useI18n();
  const [maintenant] = useState(() => Date.now());
  const [scenario, setScenario] = useState<Scenario>("une");
  const [indice, setIndice] = useState<Indice>("vegetation");
  const [suivi, setSuivi] = useState<Suivi | null>(null);
  const [horsLigne, setHorsLigne] = useState(false);
  const [chargement, setChargement] = useState(true);

  const [choix, setChoix] = useState(false);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [retour, setRetour] = useState<{ tone: "success" | "error" | "warning"; text: string } | null>(null);

  useEffect(() => {
    const controleur = new AbortController();
    api<Suivi>(`/parcelles/${sprint14.parcelle_id}/suivi?scenario=${scenario}`, { signal: controleur.signal })
      .then((corps) => {
        setSuivi(corps);
        setHorsLigne(false);
      })
      .catch((erreur) => {
        if (estAnnule(erreur) || controleur.signal.aborted) {
          return;
        }
        setSuivi(suiviLocal(scenario));
        setHorsLigne(true);
      })
      .finally(() => {
        if (!controleur.signal.aborted) {
          setChargement(false);
        }
      });
    return () => controleur.abort();
  }, [scenario]);

  async function choisirPhoto(depuis: "camera" | "galerie") {
    setRetour(null);
    try {
      if (depuis === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setRetour({ tone: "error", text: t("mcCameraDenied") });
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.6, exif: true };
      const resultat = depuis === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (resultat.canceled || !resultat.assets?.length) {
        return;
      }
      const image = resultat.assets[0];
      const nom = image.fileName ?? image.uri.split("/").pop() ?? "photo.jpg";
      setPhoto({ uri: image.uri, nom, position: positionExif(image.exif) });
      setChoix(false);
    } catch {
      setRetour({ tone: "error", text: t("mcPhotoError") });
    }
  }

  async function envoyer() {
    if (!photo) {
      return;
    }
    setEnvoi(true);
    setRetour(null);
    try {
      await api(`/parcelles/${sprint14.parcelle_id}/contestation`, { body: { photo: photo.nom, position: photo.position } });
      setRetour({ tone: "success", text: t("contestSent") });
      setPhoto(null);
    } catch (erreur) {
      setRetour(
        erreur instanceof ApiError && erreur.status === 0
          ? { tone: "warning", text: t("mcContestKept") }
          : { tone: "error", text: t("networkError") },
      );
    } finally {
      setEnvoi(false);
    }
  }

  const derniere = Math.floor(maintenant / JOUR_MS / REVISITE_JOURS) * REVISITE_JOURS * JOUR_MS;
  const prochaine = derniere + REVISITE_JOURS * JOUR_MS;
  const cases = suivi ? grille(suivi.zones, indice) : [];
  const zonesStress = suivi ? suivi.zones.filter((zone) => zone.ndvi < 0.3) : [];
  const depasse = suivi ? suivi.irrigation_m3 > suivi.plan_eau_m3 : false;
  const couleurEau = depasse ? colors.clay : colors.water;
  const nomsStress = [...new Set(cases.filter((c) => c.stress).map((c) => tx(c.zone)))].join(", ");

  return (
    <Screen tabs={<FarmerTabs actif="Parcelle" />} contentStyle={styles.contenu}>
      <EnTete titre={t("trackTitle")} sousTitre={t("mcImageDates", { a: dateCourte(derniere, lang), b: dateCourte(prochaine, lang) })} />

      {horsLigne ? <Notice tone="warning" text={t("offline")} /> : null}
      {chargement && !suivi ? <Loader label={t("loading")} /> : null}

      {suivi ? (
        <>
          <Carte style={styles.carteZones}>
            <View style={styles.ligneTete}>
              <T size={14} weight="800" style={styles.flex}>
                {t("zoneHealth")}
              </T>
              <Pastilles
                label={t("zoneHealth")}
                valeur={indice}
                onChange={setIndice}
                options={[
                  { id: "vegetation" as Indice, label: t("mcVegetation") },
                  { id: "humidite" as Indice, label: t("mcHumidity") },
                ]}
              />
            </View>
            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel={nomsStress ? t(indice === "vegetation" ? "mcGridStress" : "mcGridDry", { zones: nomsStress }) : t("mcGridHealthy")}
              style={styles.grille}
            >
              {cases.map((c, index) => (
                <View key={index} style={[styles.case, { backgroundColor: c.couleur }]} />
              ))}
            </View>
            <View style={styles.legende}>
              <Text style={styles.legendeTexte}>{t(indice === "vegetation" ? "mcLegendStress" : "mcLegendDry")}</Text>
              <Text style={styles.legendeTexte}>{t(indice === "vegetation" ? "mcLegendHealthy" : "mcLegendWet")}</Text>
            </View>
          </Carte>

          <Carte style={styles.carteEau}>
            <View style={styles.ligneEau}>
              <T size={13} weight="800" style={styles.flex}>
                {t("waterUsedSeason")}
              </T>
              <T size={13} weight="800" color={couleurEau}>
                {formatNumber(suivi.irrigation_m3, lang, 0)} / {formatNumber(suivi.plan_eau_m3, lang, 0)} m³
              </T>
            </View>
            <View style={styles.piste}>
              <View style={[styles.remplissage, { width: `${Math.min(suivi.irrigation_m3 / Math.max(suivi.plan_eau_m3, 1), 1) * 100}%`, backgroundColor: couleurEau }]} />
            </View>
            <T size={12} weight="600" color={depasse ? colors.clay : colors.muted}>
              {t(STATUTS[suivi.statut] ?? "statusAConfirmer")}
            </T>
          </Carte>

          <View style={styles.ligneTete}>
            <T size={15} weight="800" style={styles.flex}>
              {t("alerts")}
            </T>
            <Pastilles
              label={t("alerts")}
              valeur={scenario}
              onChange={(suivant) => {
                setChargement(true);
                setScenario(suivant);
              }}
              options={[
                { id: "une" as Scenario, label: t("oneImage") },
                { id: "deux" as Scenario, label: t("twoImages") },
              ]}
            />
          </View>
          <View style={styles.alertes}>
            {zonesStress.length === 0 && suivi.alertes.length === 0 ? <Notice tone="success" text={t("noAlert")} /> : null}
            {zonesStress.map((zone) => (
              <Alerte
                key={zone.id}
                icon="drop"
                bg={colors.claySoft}
                fg={colors.clay}
                titre={t("mcZoneStressTitle", { zone: tx(zone.nom) })}
                texte={t("mcZoneStressBody", { ndvi: formatNumber(zone.ndvi, lang, 2) })}
              />
            ))}
            {suivi.alertes.map((alerte, index) => (
              <Alerte
                key={`${alerte.type}-${index}`}
                icon="alertCircle"
                bg={colors.sand}
                fg={colors.amber}
                titre={tx(alerte.message)}
                texte={t(STATUTS[alerte.statut] ?? "statusAConfirmer")}
              />
            ))}
          </View>

          {photo ? (
            <Carte style={styles.carteEau}>
              <View style={styles.ligneEau}>
                <Image source={{ uri: photo.uri }} style={styles.vignette} accessibilityIgnoresInvertColors />
                <View style={styles.flex}>
                  <T size={14} weight="800" numberOfLines={1}>
                    {photo.nom}
                  </T>
                  <T size={12} color={colors.muted}>
                    {photo.position ? t("mcPhotoGps", { p: photo.position }) : t("mcPhotoNoGps")}
                  </T>
                </View>
              </View>
              <View style={styles.ligneEau}>
                <Action label={t("mcChangePhoto")} contour onPress={() => setChoix(true)} />
                <Action label={t("mcSendContest")} icon="send" loading={envoi} onPress={() => void envoyer()} />
              </View>
            </Carte>
          ) : null}

          {choix ? (
            <View style={styles.ligneEau}>
              <Action label={t("mcTakePhoto")} icon="camera" onPress={() => void choisirPhoto("camera")} />
              <Action label={t("mcFromGallery")} contour onPress={() => void choisirPhoto("galerie")} />
            </View>
          ) : !photo ? (
            <Button label={t("contest")} icon="camera" variant="secondary" onPress={() => setChoix(true)} />
          ) : null}
          {retour ? <Notice tone={retour.tone} text={retour.text} /> : null}
        </>
      ) : null}

      <Footnote>
        {tx(sprint14.hypothese)} {indice === "humidite" ? t("mcHumidityNote") : ""}
      </Footnote>
    </Screen>
  );
}

function Alerte({ icon, bg, fg, titre, texte }: { icon: IconName; bg: string; fg: string; titre: string; texte: string }) {
  return (
    <View style={styles.alerte}>
      <PastilleIcone icon={icon} bg={bg} fg={fg} size={32} />
      <View style={styles.flex}>
        <T size={13} weight="800" lh={1.4}>
          {titre}
        </T>
        <T size={13} lh={1.4} color={colors.body}>
          {texte}
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenu: { gap: 14, paddingTop: 24, paddingBottom: 32 },
  flex: { flex: 1 },
  ligneTete: { flexDirection: "row", alignItems: "center", gap: 8 },
  carteZones: { padding: 14, gap: 10 },
  grille: { flexDirection: "row", flexWrap: "wrap", gap: 4, padding: 6, backgroundColor: C.carteFond, borderRadius: 12 },
  case: { height: 34, borderRadius: 6, flexBasis: "18%", flexGrow: 1 },
  legende: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  legendeTexte: { fontSize: 12, color: colors.muted, ...police("700"), flexShrink: 1 },
  carteEau: { paddingVertical: 14, paddingHorizontal: 16, gap: 8 },
  ligneEau: { flexDirection: "row", alignItems: "center", gap: 8 },
  piste: { height: 10, borderRadius: 5, backgroundColor: colors.line, overflow: "hidden" },
  remplissage: { height: 10, borderRadius: 5 },
  alertes: { gap: 8 },
  alerte: { backgroundColor: colors.card, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, flexDirection: "row", gap: 12, alignItems: "flex-start" },
  vignette: { width: 52, height: 52, borderRadius: 10, backgroundColor: colors.line },
});
