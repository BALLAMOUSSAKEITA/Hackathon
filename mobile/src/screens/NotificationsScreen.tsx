import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api } from "../api";
import { allerOnglet, FarmerTabs } from "../components/chrome";
import type { IconName } from "../components/icons";
import { C, EnTete, PastilleIcone, T, TitreGroupe } from "../components/maquetteC-ui";
import { Loader, Notice, Screen } from "../components/ui";
import { sprint11 } from "../donnees";
import { useI18n, type CopyKey } from "../i18n";
import type { RootStackParamList } from "../navigation/types";
import { colors, labelEau, police } from "../theme";
import type { Localized } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Notifications">;

type Notif = { id: string; type: string; lue: boolean; message: Localized; commande_id?: string; date?: string };

type Cible = "Suivi" | "Solaire" | "Ventes" | "Label";

const TYPES: Record<string, { icon?: IconName; bg: string; fg: string; titre: CopyKey; cible: Cible; ageMin: number }> = {
  irrigation: { icon: "drop", bg: colors.waterSoft, fg: colors.water, titre: "mcNotifTitleIrrigation", cible: "Suivi", ageMin: 10 },
  pompage: { icon: "bolt", bg: colors.sand, fg: colors.amber, titre: "mcNotifTitlePompage", cible: "Solaire", ageMin: 120 },
  commande: { icon: "cart", bg: C.vertPale, fg: colors.olive, titre: "notifCommande", cible: "Ventes", ageMin: 180 },
  label: { icon: "drop" as IconName, bg: labelEau.bg, fg: labelEau.fg, titre: "mcNotifTitleLabel", cible: "Label", ageMin: 2 * 24 * 60 },
  alerte: { icon: "alertCircle", bg: colors.claySoft, fg: colors.clay, titre: "mcNotifTitleAlert", cible: "Suivi", ageMin: 3 * 24 * 60 },
};

const MINUTE = 60 * 1000;

/**
 * Le fichier ne date pas les notifications. Si l'API ne fournit pas de date,
 * on situe chaque type à un âge fixe (conseil du jour récent, label plus ancien).
 */
function dateDe(notification: Notif, maintenant: number): number {
  const lue = notification.date ? Date.parse(notification.date) : NaN;
  if (Number.isFinite(lue)) {
    return lue;
  }
  return maintenant - (TYPES[notification.type]?.ageMin ?? 4 * 24 * 60) * MINUTE;
}

export function NotificationsScreen({ navigation }: Props) {
  const { t, tx } = useI18n();
  const [maintenant] = useState(() => Date.now());
  const [liste, setListe] = useState<Notif[]>(sprint11.notifications as Notif[]);
  const [chargement, setChargement] = useState(true);
  const [horsLigne, setHorsLigne] = useState(false);
  const [erreurLecture, setErreurLecture] = useState(false);

  useEffect(() => {
    let actif = true;
    api<{ notifications: Notif[] }>("/notifications")
      .then((corps) => {
        if (actif) {
          setListe(corps.notifications);
          setHorsLigne(false);
        }
      })
      .catch(() => {
        if (actif) {
          setHorsLigne(true);
        }
      })
      .finally(() => {
        if (actif) {
          setChargement(false);
        }
      });
    return () => {
      actif = false;
    };
  }, []);

  function marquer(id: string) {
    setListe((actuel) => actuel.map((item) => (item.id === id ? { ...item, lue: true } : item)));
    return api(`/notifications/${id}/lue`, { method: "POST" });
  }

  function toutLire() {
    setErreurLecture(false);
    const envois = liste.filter((item) => !item.lue).map((item) => marquer(item.id));
    Promise.all(envois).catch(() => setErreurLecture(true));
  }

  function ouvrir(notification: Notif) {
    marquer(notification.id).catch(() => undefined);
    const cible = TYPES[notification.type]?.cible;
    if (cible === "Label") {
      allerOnglet(navigation, "Home", "Label");
    } else if (cible) {
      navigation.navigate(cible);
    }
  }

  function relatif(ms: number): string {
    const minutes = Math.max(1, Math.round((maintenant - ms) / MINUTE));
    if (minutes < 60) {
      return t("mcAgoMin", { n: minutes });
    }
    const heures = Math.round(minutes / 60);
    if (heures < 24) {
      return t("mcAgoHour", { n: heures });
    }
    return t("mcAgoDay", { n: Math.round(heures / 24) });
  }

  const debutJour = new Date(maintenant).setHours(0, 0, 0, 0);
  const triees = liste.map((item) => ({ item, date: dateDe(item, maintenant) })).sort((a, b) => b.date - a.date);
  const aujourdhui = triees.filter((ligne) => ligne.date >= debutJour);
  const semaine = triees.filter((ligne) => ligne.date < debutJour);
  const nonLues = liste.filter((item) => !item.lue).length;

  function carte({ item, date }: { item: Notif; date: number }) {
    const info = TYPES[item.type];
    return (
      <Pressable
        key={item.id}
        accessibilityRole="button"
        accessibilityLabel={`${t(info?.titre ?? "notifOther")}. ${tx(item.message)}`}
        accessibilityState={{ selected: !item.lue }}
        onPress={() => ouvrir(item)}
        style={({ pressed }) => [styles.carte, pressed && styles.presse]}
      >
        {info?.icon || !info ? (
          <PastilleIcone icon={info?.icon ?? "bell"} bg={info?.bg ?? colors.oliveSoft} fg={info?.fg ?? colors.olive} size={40} />
        ) : (
          <PastilleIcone bg={info.bg} fg={info.fg} size={40}>
            <Text style={[styles.lettre, { color: info.fg }]}>{sprint11.label}</Text>
          </PastilleIcone>
        )}
        <View style={styles.corps}>
          <View style={styles.ligneTitre}>
            <T size={15} weight="800" style={styles.flex} color={item.lue ? colors.body : colors.ink}>
              {t(info?.titre ?? "notifOther", { label: sprint11.label })}
            </T>
            {!item.lue ? <View style={styles.point} accessibilityLabel={t("mcUnread")} /> : null}
          </View>
          <T size={13} lh={1.4} color={colors.body}>
            {tx(item.message)}
          </T>
          <T size={12} color={colors.muted}>
            {relatif(date)}
          </T>
        </View>
      </Pressable>
    );
  }

  return (
    <Screen tabs={<FarmerTabs actif="Home" />} contentStyle={styles.contenu}>
      <EnTete
        titre={t("screen11")}
        droite={
          nonLues ? (
            <Pressable accessibilityRole="button" onPress={toutLire} hitSlop={8} style={styles.action}>
              <Text style={styles.actionTexte}>{t("markAllRead")}</Text>
            </Pressable>
          ) : undefined
        }
      />
      {horsLigne ? <Notice tone="warning" text={t("offline")} /> : null}
      {erreurLecture ? <Notice tone="error" text={t("networkError")} /> : null}
      {chargement && liste.length === 0 ? <Loader label={t("loading")} /> : null}
      {!chargement && liste.length === 0 ? <Notice tone="info" text={t("noNotif")} /> : null}

      {aujourdhui.length ? <TitreGroupe>{t("mcToday")}</TitreGroupe> : null}
      {aujourdhui.map(carte)}
      {semaine.length ? <TitreGroupe>{t("mcThisWeek")}</TitreGroupe> : null}
      {semaine.map(carte)}
    </Screen>
  );
}

const styles = StyleSheet.create({
  contenu: { gap: 12, paddingTop: 24, paddingBottom: 32 },
  flex: { flex: 1 },
  carte: { backgroundColor: colors.card, borderRadius: 16, padding: 14, flexDirection: "row", gap: 12 },
  presse: { opacity: 0.85 },
  corps: { flex: 1, gap: 2 },
  ligneTitre: { flexDirection: "row", alignItems: "center", gap: 8 },
  point: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.clay },
  lettre: { fontSize: 16, ...police("800") },
  action: { minHeight: 44, justifyContent: "center" },
  actionTexte: { color: colors.olive, fontSize: 14, ...police("800") },
});
