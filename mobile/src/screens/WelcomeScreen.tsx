import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { LanguageSwitch } from "../components/LanguageSwitch";
import { Tap } from "../components/Tap";
import { API_URL, sprint02, type ProfilDemo } from "../fixture";
import { useI18n, type CopyKey } from "../i18n";
import type { RootStackParamList } from "../navigation/types";
import { ecrireCompte, lireCompte, type Compte } from "../session";
import { colors, tap } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

export function WelcomeScreen({ navigation }: Props) {
  const { lang, t, direction } = useI18n();
  const [profilId, setProfilId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [attente, setAttente] = useState(false);
  const align = direction === "rtl" ? "right" : "left";
  const profil = sprint02.profils.find((item) => item.id === profilId) ?? null;

  useEffect(() => {
    lireCompte().then((compte) => {
      if (compte) {
        setProfilId(compte.id);
      }
    });
  }, []);

  async function entrer() {
    if (!profil || attente) {
      return;
    }
    setAttente(true);
    setMessage(null);
    const resultat = await ouvrirCompte(profil, lang);
    setAttente(false);
    if (!resultat.ok) {
      setMessage(t(resultat.message));
      return;
    }
    if (resultat.utilisateur.role === "agriculteur") {
      navigation.navigate("Home");
      return;
    }
    navigation.navigate("Buyer");
  }

  return (
    <SafeAreaView style={[styles.safe, { direction }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.mark, { textAlign: align }]}>Ardi</Text>
        <Text style={[styles.title, { textAlign: align }]}>{t("welcome")}</Text>
        <Text style={[styles.tagline, { textAlign: align }]}>{t("tagline")}</Text>

        <Text style={[styles.section, { textAlign: align }]}>{t("chooseLanguage")}</Text>
        <LanguageSwitch />

        <Text style={[styles.section, { textAlign: align }]}>{t("chooseProfile")}</Text>
        {sprint02.profils.map((item) => {
          const selected = item.id === profilId;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setProfilId(item.id)}
              style={[styles.card, selected && styles.cardOn]}
            >
              <Text style={[styles.role, { textAlign: align }]}>{item.libelle[lang]}</Text>
              <Text style={[styles.name, { textAlign: align }]}>{item.nom}</Text>
              <Text style={[styles.phone, { textAlign: align }]}>
                {t("phoneLabel")} {`\u202A${item.telephone}\u202C`}
              </Text>
            </Pressable>
          );
        })}

        <Text style={[styles.sms, { textAlign: align }]}>
          {t("smsSimulated")} {sprint02.code_sms}
        </Text>
        {message ? <Text style={[styles.message, { textAlign: align }]}>{message}</Text> : null}
        <Tap label={t("enter")} onPress={entrer} style={profil ? undefined : styles.disabled} />
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
    const otp = await fetch(`${API_URL}/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telephone: profil.telephone }),
    });
    if (!otp.ok) {
      await ecrireCompte(local);
      return { ok: true, utilisateur: local, message: "errorNetwork" };
    }
    const verification = await fetch(`${API_URL}/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telephone: profil.telephone,
        code: sprint02.code_sms,
        role: profil.role,
        langue,
      }),
    });
    if (verification.status === 422) {
      return { ok: false, utilisateur: local, message: "errorRole" };
    }
    if (!verification.ok) {
      return { ok: false, utilisateur: local, message: "errorCode" };
    }
    const corps = (await verification.json()) as { utilisateur: Compte };
    await ecrireCompte(corps.utilisateur);
    return { ok: true, utilisateur: corps.utilisateur, message: "accountReady" };
  } catch {
    await ecrireCompte(local);
    return { ok: true, utilisateur: local, message: "errorNetwork" };
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 12 },
  mark: { width: "100%", fontSize: 36, fontWeight: "800", color: colors.olive },
  title: { width: "100%", fontSize: 28, fontWeight: "800", color: colors.ink },
  tagline: { width: "100%", fontSize: 16, color: colors.ink },
  section: {
    width: "100%",
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  card: {
    minHeight: tap.minHeight,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 2,
  },
  cardOn: { borderColor: colors.olive, backgroundColor: colors.oliveSoft },
  role: { width: "100%", color: colors.clay, fontWeight: "700" },
  name: { width: "100%", color: colors.ink, fontSize: 18, fontWeight: "800" },
  phone: { width: "100%", color: colors.muted },
  sms: { width: "100%", color: colors.muted },
  message: { width: "100%", color: colors.olive, fontWeight: "600" },
  disabled: { opacity: 0.45 },
});
