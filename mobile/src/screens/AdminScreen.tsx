import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "../api";
import type { IconName } from "../components/icons";
import { C, Carte, EnTete, Etiquette, Ligne, T } from "../components/maquetteC-ui";
import { Button, Footnote, LabelBadge, Notice, Pill, Screen } from "../components/ui";
import { sprint18 } from "../donnees";
import { useI18n, type CopyKey } from "../i18n";
import { colors, police } from "../theme";

const STATUTS: Record<string, { cle: CopyKey; bg: string; fg: string }> = {
  actif: { cle: "labelActive", bg: C.vertPale, fg: C.vertTexte },
  en_verification: { cle: "labelChecking", bg: colors.waterSoft, fg: C.bleuFonce },
  suspendu: { cle: "labelSuspended", bg: colors.claySoft, fg: colors.clay },
  conteste: { cle: "labelContested", bg: colors.sand, fg: C.ambreFonce },
};

const FILE: Record<string, { cle: CopyKey; icon: IconName; couleur: string }> = {
  label: { cle: "modLabel", icon: "badge", couleur: colors.amber },
  produit: { cle: "modProduit", icon: "store", couleur: colors.clay },
  compte: { cle: "modCompte", icon: "user", couleur: colors.olive },
};

type LigneFile = { id: string; type: string };

export function AdminScreen() {
  const { t, tx } = useI18n();
  const [chargement, setChargement] = useState(false);
  const [retour, setRetour] = useState<{ tone: "success" | "error" | "warning"; text: string } | null>(null);
  const [statuts, setStatuts] = useState<Record<string, string>>({});
  const [suspension, setSuspension] = useState<string | null>(null);
  const [file, setFile] = useState<LigneFile[]>(sprint18.file);
  const [horsLigne, setHorsLigne] = useState(false);

  useEffect(() => {
    const controleur = new AbortController();
    api<{ file: LigneFile[] }>("/admin/file", { signal: controleur.signal })
      .then((corps) => {
        setFile(corps.file);
        setHorsLigne(false);
      })
      .catch(() => {
        if (!controleur.signal.aborted) {
          setHorsLigne(true);
        }
      });
    return () => controleur.abort();
  }, []);

  async function ouvrirSuspendu() {
    setChargement(true);
    setRetour(null);
    try {
      const corps = await api<{ note: string | null }>("/labels/ardi-suspendu");
      setRetour(corps.note === null ? { tone: "warning", text: t("suspendedNotice") } : { tone: "success", text: t("publicShows", { note: corps.note }) });
    } catch {
      setRetour({ tone: "error", text: t("networkError") });
    } finally {
      setChargement(false);
    }
  }

  async function suspendre(qr: string) {
    setSuspension(qr);
    setRetour(null);
    try {
      const corps = await api<{ statut: string }>(`/admin/labels/${qr}/suspendre`, { method: "POST" });
      setStatuts((actuel) => ({ ...actuel, [qr]: corps.statut }));
      setRetour({ tone: "success", text: t("mcLabelSuspendedDone", { qr }) });
    } catch {
      setRetour({ tone: "error", text: t("networkError") });
    } finally {
      setSuspension(null);
    }
  }

  return (
    <Screen contentStyle={styles.contenu}>
      <EnTete titre={t("adminTitle")} sousTitre={t("adminSubtitle", { lieu: sprint18.pilote.lieu, n: sprint18.pilote.agriculteurs })} />

      <T size={15} weight="800">
        {t("labelsTitle")}
      </T>
      <View style={styles.liste}>
        {sprint18.labels.map((etiquette) => {
          const code = statuts[etiquette.qr] ?? etiquette.statut;
          const statut = STATUTS[code] ?? STATUTS.en_verification;
          const suspendu = code === "suspendu";
          return (
            <Carte key={etiquette.qr} style={styles.label}>
              <View style={styles.ligneLabel}>
                <LabelBadge note={suspendu ? null : etiquette.note} size={40} />
                <View style={styles.flex}>
                  <T size={15} weight="800">
                    {etiquette.ferme} · {tx(etiquette.produit)}
                  </T>
                  <T size={12} color={colors.muted}>
                    {etiquette.qr}
                  </T>
                </View>
                <Etiquette texte={t(statut.cle)} bg={statut.bg} fg={statut.fg} />
              </View>
              {!suspendu ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={suspension !== null}
                  onPress={() => void suspendre(etiquette.qr)}
                  style={({ pressed }) => [styles.suspendre, (pressed || suspension === etiquette.qr) && styles.presse]}
                >
                  <Text style={styles.suspendreTexte}>{suspension === etiquette.qr ? "…" : t("mcSuspendLabel")}</Text>
                </Pressable>
              ) : null}
            </Carte>
          );
        })}
      </View>
      <Button label={t("openSuspended")} icon="qr" variant="secondary" loading={chargement} onPress={() => void ouvrirSuspendu()} />
      {retour ? <Notice tone={retour.tone} text={retour.text} /> : null}

      <T size={15} weight="800">
        {t("moderation")}
      </T>
      {horsLigne ? <Notice tone="warning" text={t("offline")} /> : null}
      <Carte style={styles.file}>
        {file.map((ligne, index) => {
          const info = FILE[ligne.type] ?? FILE.label;
          return <Ligne key={ligne.id} icon={info.icon} iconColor={info.couleur} titre={t(info.cle)} sousTitre={ligne.id} derniere={index === file.length - 1} />;
        })}
      </Carte>

      <T size={15} weight="800">
        {t("thresholds")}
      </T>
      <View style={styles.pills}>
        {sprint18.seuils_a_calibrer.map((seuil) => (
          <Pill key={seuil} text={seuil} tone="muted" />
        ))}
      </View>

      <Footnote>{tx(sprint18.terrain)}</Footnote>
      <Footnote>{tx(sprint18.hypothese)}</Footnote>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contenu: { gap: 14, paddingTop: 24, paddingBottom: 32 },
  flex: { flex: 1 },
  liste: { gap: 10 },
  label: { borderRadius: 16, padding: 14, gap: 10 },
  ligneLabel: { flexDirection: "row", alignItems: "center", gap: 12 },
  suspendre: { minHeight: 40, borderRadius: 12, borderWidth: 1, borderColor: colors.lineStrong, alignItems: "center", justifyContent: "center" },
  suspendreTexte: { color: colors.clay, fontSize: 14, ...police("800") },
  presse: { opacity: 0.6 },
  file: { paddingVertical: 4, gap: 0 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
