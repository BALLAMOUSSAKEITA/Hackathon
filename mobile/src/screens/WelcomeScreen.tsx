import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CommonActions } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ApiError, api } from "../api";
import { Icon, type IconName } from "../components/icons";
import { Notice } from "../components/ui";
import { sprint02, type ProfilDemo } from "../fixture";
import { useI18n, type CopyKey } from "../i18n";
import type { RootStackParamList } from "../navigation/types";
import { ecrireCompte, type Compte } from "../session";
import type { Lang } from "../types";
import { colors, police } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

const POINTS: [IconName, CopyKey][] = [
  ["map", "point1"],
  ["drop", "point2"],
  ["badge", "point3"],
];

/** Les noms de langue restent écrits dans leur propre langue, comme dans la maquette. */
const LANGUES: { id: Lang; nom: string }[] = [
  { id: "darija", nom: "Darija" },
  { id: "ar", nom: "العربية" },
  { id: "fr", nom: "Français" },
];

export function WelcomeScreen({ navigation }: Props) {
  const { lang, setLang, t, align, direction } = useI18n();
  const [message, setMessage] = useState<string | null>(null);
  const [attente, setAttente] = useState<string | null>(null);

  async function choisir(id: string) {
    const choisi = sprint02.profils.find((item) => item.id === id);
    if (!choisi || attente) {
      return;
    }
    setAttente(id);
    setMessage(null);
    const resultat = await ouvrirCompte(choisi, lang);
    setAttente(null);
    if (!resultat.ok) {
      setMessage(t(resultat.message));
      return;
    }
    // On remplace la pile : « retour » ne ramène pas à l'écran de connexion.
    const racine = resultat.utilisateur.role === "agriculteur" ? "Home" : "Marche";
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: racine }] }));
  }

  // La légende reste bilingue, comme dans la maquette : la langue choisie, puis l'autre écriture.
  const legende = lang === "ar" ? `${t("chooseLang")} · Choisis ta langue` : `${t("chooseLang")} · اختر لغتك`;
  const texte = { textAlign: align } as const;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={{ direction }} contentContainerStyle={styles.content} bounces={false}>
        <View style={styles.logo} accessibilityRole="header" accessibilityLabel="Ardi">
          <Icon name="sprout" color={colors.white} size={34} />
          <Text style={styles.logoText}>ardi</Text>
        </View>

        <View style={styles.hero}>
          <Text style={[styles.title, texte]}>{t("heroTitle")}</Text>
          <Text style={[styles.tagline, texte]}>{t("heroBody")}</Text>
        </View>

        <View style={styles.points}>
          {POINTS.map(([icon, cle]) => (
            <View key={cle} style={styles.pointRow}>
              <View style={styles.pointIcon}>
                <Icon name={icon} color={colors.oliveSoft} size={18} />
              </View>
              <Text style={[styles.pointText, texte]}>{t(cle)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.langue}>
          <Text style={[styles.legende, texte]}>{legende}</Text>
          <View accessibilityRole="radiogroup" style={styles.langRow}>
            {LANGUES.map((choix) => {
              const on = choix.id === lang;
              return (
                <Pressable
                  key={choix.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => setLang(choix.id)}
                  style={({ pressed }) => [styles.langBtn, on ? styles.langBtnOn : styles.langBtnOff, pressed && styles.pressed]}
                >
                  <Text style={[styles.langText, on ? styles.langTextOn : styles.langTextOff]}>{choix.nom}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.actions}>
          {message ? <Notice tone="error" text={message} /> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: attente === "usr-demo", disabled: attente !== null }}
            disabled={attente !== null}
            onPress={() => void choisir("usr-demo")}
            style={({ pressed }) => [styles.cta, styles.ctaLight, pressed && styles.pressed, attente === "usr-acheteur" && styles.dim]}
          >
            {attente === "usr-demo" ? (
              <ActivityIndicator color={colors.olive} />
            ) : (
              <Text style={[styles.ctaText, styles.ctaTextLight]}>{t("iAmFarmer")}</Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: attente === "usr-acheteur", disabled: attente !== null }}
            disabled={attente !== null}
            onPress={() => void choisir("usr-acheteur")}
            style={({ pressed }) => [styles.cta, styles.ctaOutline, pressed && styles.pressed, attente === "usr-demo" && styles.dim]}
          >
            {attente === "usr-acheteur" ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={[styles.ctaText, styles.ctaTextOutline]}>{t("iAmBuyer")}</Text>
            )}
          </Pressable>
          <Text style={styles.demo}>
            {t("demoLogin")} {sprint02.code_sms}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

async function ouvrirCompte(
  profil: ProfilDemo,
  langue: Compte["langue"],
): Promise<{ ok: boolean; utilisateur: Compte; message: CopyKey }> {
  const local: Compte = {
    id: profil.id,
    nom: profil.nom,
    telephone: profil.telephone,
    role: profil.role,
    langue,
  };
  try {
    await api("/auth/otp", { body: { telephone: profil.telephone }, timeoutMs: 5000 });
  } catch {
    // L'API ne répond pas ou ne connaît pas ce numéro : on entre avec le profil du fichier.
    await ecrireCompte(local).catch(() => undefined);
    return { ok: true, utilisateur: local, message: "errorNetwork" };
  }
  try {
    const corps = await api<{ utilisateur: Compte }>("/auth/verify", {
      body: { telephone: profil.telephone, code: sprint02.code_sms, role: profil.role, langue },
      timeoutMs: 5000,
    });
    await ecrireCompte(corps.utilisateur).catch(() => undefined);
    return { ok: true, utilisateur: corps.utilisateur, message: "accountReady" };
  } catch (erreur) {
    if (erreur instanceof ApiError && erreur.status === 422) {
      return { ok: false, utilisateur: local, message: "errorRole" };
    }
    if (erreur instanceof ApiError && erreur.status > 0) {
      return { ok: false, utilisateur: local, message: "errorCode" };
    }
    await ecrireCompte(local).catch(() => undefined);
    return { ok: true, utilisateur: local, message: "errorNetwork" };
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.olive },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 32, gap: 24 },
  logo: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoText: { color: colors.white, fontSize: 32, letterSpacing: -1, ...police("800") },
  hero: { gap: 10 },
  title: { color: colors.white, fontSize: 34, lineHeight: 37, letterSpacing: -1, ...police("800") },
  tagline: { color: colors.leaf, fontSize: 16, lineHeight: 24, ...police("400") },
  points: { gap: 10 },
  pointRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  pointIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.oliveDeep, alignItems: "center", justifyContent: "center" },
  pointText: { flex: 1, color: colors.oliveSoft, fontSize: 14, lineHeight: 20, ...police("600") },
  langue: { gap: 10 },
  legende: { color: colors.white, fontSize: 14, ...police("800") },
  langRow: { flexDirection: "row", gap: 8 },
  langBtn: { flex: 1, minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  langBtnOn: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.white },
  langBtnOff: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#6E9A70" },
  langText: { fontSize: 15 },
  langTextOn: { color: colors.olive, ...police("800") },
  langTextOff: { color: colors.white, ...police("600") },
  actions: { marginTop: "auto", gap: 10 },
  cta: { minHeight: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  ctaLight: { backgroundColor: colors.white },
  ctaOutline: { borderWidth: 1.5, borderColor: colors.leaf },
  ctaText: { fontSize: 16, ...police("800") },
  ctaTextLight: { color: colors.olive },
  ctaTextOutline: { color: colors.white },
  demo: { color: "rgba(215, 230, 208, 0.7)", fontSize: 11, textAlign: "center", ...police("500") },
  pressed: { opacity: 0.85 },
  dim: { opacity: 0.5 },
});
