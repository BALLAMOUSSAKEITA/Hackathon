import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "../api";
import { FarmerTabs } from "../components/chrome";
import { Icon } from "../components/icons";
import { C, Carte, EnTete, Pastilles, T } from "../components/maquetteC-ui";
import { Button, Field, Loader, Notice, Screen } from "../components/ui";
import { sprint13 } from "../donnees";
import { formatNumber, useI18n } from "../i18n";
import { colors, police } from "../theme";
import type { Localized } from "../types";

type Heure = { heure: string; part: number };

type Solaire = {
  vide: boolean;
  profondeur_puits_m?: number;
  puissance_kw: number;
  panneaux: number;
  reservoir_m3: number;
  cout_gasoil_dt: number;
  cout_steg_dt: number;
  cout_solaire_dt: number;
  kwh_m3: number;
  heures?: Heure[];
  aides?: Localized;
};

type Source = "gasoil" | "steg";

function cent(valeur: number) {
  return Math.floor(valeur * 100 + 0.5) / 100;
}

/** Même calcul que api/app/suite.py solaire(), pour le mode hors ligne. */
function calculSolaire(profondeur: number): Solaire {
  const f = sprint13;
  const kwhM3 = (0.00272 * profondeur) / f.eta;
  const volume = f.debit_m3_h * f.heures_pompage;
  const kwhJour = volume * kwhM3;
  const puissance = kwhJour / f.heures_soleil;
  const panneaux = Math.ceil(puissance / f.puissance_panneau_kw);
  const annuel = kwhJour * 365;
  return {
    vide: false,
    profondeur_puits_m: profondeur,
    puissance_kw: cent(puissance),
    panneaux,
    reservoir_m3: Math.round(volume),
    cout_gasoil_dt: Math.round(annuel * f.prix_gasoil_dt_kwh),
    cout_steg_dt: Math.round(annuel * f.prix_steg_dt_kwh),
    cout_solaire_dt: panneaux * f.prix_panneau_dt,
    kwh_m3: cent(kwhM3),
    heures: f.heures,
    aides: f.aides,
  };
}

/**
 * Production heure par heure de 7 h à 18 h : on relie les points du fichier (9 h, 11 h…)
 * et on descend à zéro au lever (6 h) et au coucher (19 h).
 */
function courbeHoraire(heures: Heure[]): { heure: number; part: number }[] {
  const points = [
    { h: 6, p: 0 },
    ...heures.map((ligne) => ({ h: parseInt(ligne.heure, 10), p: ligne.part })).filter((point) => Number.isFinite(point.h)),
    { h: 19, p: 0 },
  ].sort((a, b) => a.h - b.h);
  const sortie: { heure: number; part: number }[] = [];
  for (let heure = 7; heure <= 18; heure += 1) {
    const apres = points.findIndex((point) => point.h >= heure);
    const b = points[Math.max(apres, 0)];
    const a = points[Math.max(apres - 1, 0)];
    const part = b.h === a.h ? b.p : a.p + ((b.p - a.p) * (heure - a.h)) / (b.h - a.h);
    sortie.push({ heure, part: Math.max(part, 0) });
  }
  return sortie;
}

export function SolaireScreen() {
  const { lang, t, tx } = useI18n();
  const [profondeur, setProfondeur] = useState(String(sprint13.profondeur_puits_m));
  const [resultat, setResultat] = useState<Solaire | null>(null);
  const [chargement, setChargement] = useState(true);
  const [message, setMessage] = useState<{ tone: "error" | "warning"; text: string } | null>(null);
  const [source, setSource] = useState<Source>("gasoil");
  const [edition, setEdition] = useState(false);

  async function calculer(valeur: string) {
    const nombre = Number(valeur.replace(",", "."));
    if (!valeur.trim() || !Number.isFinite(nombre) || nombre <= 0) {
      setMessage({ tone: "error", text: t("invalidDepth") });
      return;
    }
    setChargement(true);
    setMessage(null);
    try {
      const corps = await api<Solaire>(`/parcelles/${sprint13.parcelle_id}/solaire?profondeur=${nombre}`);
      setResultat(corps.vide ? null : { ...corps, profondeur_puits_m: corps.profondeur_puits_m ?? nombre });
      setEdition(false);
    } catch {
      setResultat(calculSolaire(nombre));
      setMessage({ tone: "warning", text: t("offline") });
      setEdition(false);
    } finally {
      setChargement(false);
    }
  }

  // Premier calcul à l'ouverture, avec la profondeur du fichier.
  useEffect(() => {
    const controleur = new AbortController();
    const profondeurInitiale = sprint13.profondeur_puits_m;
    api<Solaire>(`/parcelles/${sprint13.parcelle_id}/solaire?profondeur=${profondeurInitiale}`, { signal: controleur.signal })
      .then((corps) => setResultat(corps.vide ? null : { ...corps, profondeur_puits_m: corps.profondeur_puits_m ?? profondeurInitiale }))
      .catch(() => {
        if (!controleur.signal.aborted) {
          setResultat(calculSolaire(profondeurInitiale));
          setMessage({ tone: "warning", text: t("offline") });
        }
      })
      .finally(() => {
        if (!controleur.signal.aborted) {
          setChargement(false);
        }
      });
    return () => controleur.abort();
  }, [t]);

  const courbe = courbeHoraire(resultat?.heures ?? sprint13.heures);
  const maxPart = Math.max(...courbe.map((ligne) => ligne.part), 0.01);
  const conseillees = courbe.filter((ligne) => ligne.part >= maxPart * 0.5);
  const debut = conseillees[0]?.heure ?? 9;
  const fin = conseillees[conseillees.length - 1]?.heure ?? 16;

  const profondeurAffichee = resultat?.profondeur_puits_m ?? sprint13.profondeur_puits_m;
  const coutActuel = resultat ? (source === "gasoil" ? resultat.cout_gasoil_dt : resultat.cout_steg_dt) : 0;
  const amorti = resultat && coutActuel > 0 ? resultat.cout_solaire_dt / coutActuel : null;
  const kwhJour = resultat ? resultat.reservoir_m3 * resultat.kwh_m3 : 0;

  return (
    <Screen keyboard tabs={<FarmerTabs actif="Parcelle" />} contentStyle={styles.contenu}>
      <EnTete titre={t("solarTitle")} sousTitre={t("mcSolarForWell", { m: formatNumber(profondeurAffichee, lang, 0) })} />

      {message ? <Notice tone={message.tone} text={message.text} /> : null}
      {chargement && !resultat ? <Loader label={t("loading")} /> : null}
      {!chargement && !resultat ? <Notice tone="info" text={t("mcSolarNeedDepth")} /> : null}

      {resultat ? (
        <>
          <View style={styles.hero}>
            <T size={13} weight="800" color={C.heroClair}>
              {t("solarAdvised")}
            </T>
            <View style={styles.grille3}>
              <HeroStat valeur={`${formatNumber(resultat.puissance_kw, lang, 1)} kWc`} label={t("power")} />
              <HeroStat valeur={formatNumber(resultat.panneaux, lang, 0)} label={t("panels")} />
              <HeroStat valeur={`${formatNumber(resultat.reservoir_m3, lang, 0)} m³`} label={t("tank")} />
            </View>
            <T size={13} lh={1.45} color={C.heroTexte}>
              {t("mcSolarCalcBasis", {
                m3: formatNumber(resultat.reservoir_m3, lang, 0),
                kwh: formatNumber(kwhJour, lang, 0),
                p: formatNumber(profondeurAffichee, lang, 0),
                h: formatNumber(sprint13.heures_soleil, lang, 1),
              })}
            </T>
          </View>

          <Carte>
            <View style={styles.ligneTete}>
              <T size={14} weight="800" style={styles.flex}>
                {t("mcCompareWith")}
              </T>
              <Pastilles
                label={t("mcCompareWith")}
                couleur={colors.amber}
                valeur={source}
                onChange={setSource}
                options={[
                  { id: "gasoil" as Source, label: t("gasoil") },
                  { id: "steg" as Source, label: "STEG" },
                ]}
              />
            </View>
            <View style={styles.grille2}>
              <View style={[styles.tuile, styles.tuileGrise]}>
                <T size={12} weight="700" color={colors.muted}>
                  {t(source === "gasoil" ? "mcPumpGasoil" : "mcPumpSteg")}
                </T>
                <T size={18} weight="800">
                  {t("perYearDt", { v: formatNumber(coutActuel, lang, 0) })}
                </T>
              </View>
              <View style={[styles.tuile, styles.tuileSable]}>
                <T size={12} weight="700" color={C.ambreFonce}>
                  {t("solaire")}
                </T>
                <T size={18} weight="800">
                  ≈ {t("perYearDt", { v: formatNumber(0, lang, 0) })}
                </T>
              </View>
            </View>
            <View style={[styles.ligneValeur, styles.bordHaut]}>
              <T size={13} weight="700" color={colors.muted} style={styles.flex}>
                {t("mcSolarInvestment")}
              </T>
              <T size={14} weight="800">
                {formatNumber(resultat.cout_solaire_dt, lang, 0)} DT
              </T>
            </View>
            <View style={styles.ligneValeur}>
              <T size={13} weight="700" color={colors.muted} style={styles.flex}>
                {t("mcPaybackIn")}
              </T>
              <T size={18} weight="800" color={colors.amber}>
                {amorti === null ? "—" : `≈ ${t("mcYearsN", { n: formatNumber(amorti, lang, 1) })}`}
              </T>
            </View>
            <T size={12} color={colors.muted} lh={1.4}>
              {tx(resultat.aides ?? sprint13.aides)} {tx(sprint13.hypothese)}
            </T>
          </Carte>
        </>
      ) : null}

      <Carte style={styles.carteHeures}>
        <T size={14} weight="800">
          {t("whenPump")}
        </T>
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={t("mcPumpWindow", { a: debut, b: fin })}
          style={styles.histogramme}
        >
          {courbe.map((ligne) => {
            const conseillee = ligne.heure >= debut && ligne.heure <= fin;
            return (
              <View
                key={ligne.heure}
                style={[styles.barre, { height: `${Math.max((ligne.part / maxPart) * 100, 6)}%`, backgroundColor: conseillee ? C.barreSoleil : colors.line }]}
              />
            );
          })}
        </View>
        <View style={styles.axe}>
          <Text style={styles.axeTexte}>7 h</Text>
          <Text style={styles.axeTexte}>12 h</Text>
          <Text style={styles.axeTexte}>18 h</Text>
        </View>
        <T size={13} lh={1.4}>
          <Text style={[styles.fort, police("800")]}>{t("mcPumpWindow", { a: debut, b: fin })}</Text> {t("mcPumpWindowRest")}
        </T>
      </Carte>

      {edition ? (
        <Carte>
          <Field
            label={t("wellDepth")}
            value={profondeur}
            onChangeText={setProfondeur}
            unit="m"
            keyboardType="decimal-pad"
            error={message?.tone === "error"}
          />
          <View style={styles.ligneBoutons}>
            <Button label={t("mcCancel")} variant="secondary" small style={styles.flex} onPress={() => setEdition(false)} />
            <Button label={t("calculate")} icon="bolt" small style={styles.flex} loading={chargement} onPress={() => void calculer(profondeur)} />
          </View>
        </Carte>
      ) : (
        <Pressable accessibilityRole="button" onPress={() => setEdition(true)} hitSlop={8} style={({ pressed }) => [styles.lien, pressed && styles.presse]}>
          <Icon name="sliders" color={colors.olive} size={18} />
          <Text style={styles.lienTexte}>{t("mcEditDepth", { m: formatNumber(profondeurAffichee, lang, 0) })}</Text>
        </Pressable>
      )}
    </Screen>
  );
}

function HeroStat({ valeur, label }: { valeur: string; label: string }) {
  return (
    <View style={styles.heroStat}>
      <T size={20} weight="800" color={colors.white} numberOfLines={1}>
        {valeur}
      </T>
      <T size={12} weight="600" color={C.heroClair}>
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  contenu: { gap: 14, paddingTop: 24, paddingBottom: 32 },
  flex: { flex: 1 },
  hero: { backgroundColor: colors.amber, borderRadius: 20, padding: 18, gap: 12 },
  grille3: { flexDirection: "row", gap: 8 },
  heroStat: { flex: 1, gap: 2 },
  ligneTete: { flexDirection: "row", alignItems: "center", gap: 8 },
  grille2: { flexDirection: "row", gap: 10 },
  tuile: { flex: 1, borderRadius: 14, padding: 12, gap: 2 },
  tuileGrise: { backgroundColor: colors.bg },
  tuileSable: { backgroundColor: colors.sand },
  ligneValeur: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  bordHaut: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10 },
  carteHeures: { gap: 10 },
  histogramme: { flexDirection: "row", alignItems: "flex-end", gap: 4, height: 56, direction: "ltr" },
  barre: { flex: 1, borderRadius: 3 },
  axe: { flexDirection: "row", justifyContent: "space-between", direction: "ltr" },
  axeTexte: { fontSize: 11, color: colors.muted, ...police("700") },
  fort: { color: colors.amber },
  ligneBoutons: { flexDirection: "row", gap: 8 },
  lien: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, alignSelf: "flex-start" },
  lienTexte: { color: colors.olive, fontSize: 14, ...police("800") },
  presse: { opacity: 0.7 },
});
