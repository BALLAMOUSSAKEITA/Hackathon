import { useRef, useState, type ComponentRef } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api } from "../api";
import { lettre } from "../classement";
import { FarmerTabs } from "../components/chrome";
import { Icon } from "../components/icons";
import { CarreLabel } from "../components/maquetteB-ui";
import { Notice, Screen } from "../components/ui";
import { sprint07, sprint09 } from "../donnees";
import { formatNumber, useI18n } from "../i18n";
import type { RootStackParamList } from "../navigation/types";
import type { Localized } from "../types";
import { colors, police } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Assistant">;

type Carte = { titre?: unknown; dt_m3?: number; surface_ha?: number; profondeur_m?: number; kwh_m3?: number } | null;

type Reponse = { texte: string; traduction_fr: string; refus?: boolean; carte?: Carte };

type Message =
  | { id: number; auteur: "moi"; texte: string; voix?: number }
  | { id: number; auteur: "ardi"; reponse: Reponse; horsLigne: boolean };

const SUGGESTIONS = [4, 1, 12, 13, 5].map((i) => sprint09.questions[i]).filter(Boolean);

const SOUS_TITRE = "#3B7A4B";
const CARTE_FOND = "#F0F5EC";
const CARTE_BORD = "#D5E3CC";

/** Même règle que la route /assistant : seules les questions connues reçoivent une réponse. */
function repondreLocal(question: string): Reponse {
  const q = question.trim().toLowerCase();
  const connue = sprint09.questions.find((item) => q === item.darija.toLowerCase() || q === item.fr.toLowerCase());
  if (!connue) {
    return { texte: sprint09.hors_sujet.darija, traduction_fr: sprint09.hors_sujet.fr, refus: true, carte: null };
  }
  const cartes = sprint09.cartes as Record<string, Carte>;
  return {
    texte: connue.reponse,
    traduction_fr: connue.traduction_fr,
    refus: false,
    carte: connue.carte ? cartes[connue.carte] ?? null : null,
  };
}

/* ------------------------- Synthèse vocale (web) ------------------------- */

function voixDisponible(): boolean {
  return typeof globalThis !== "undefined" && "speechSynthesis" in globalThis && typeof SpeechSynthesisUtterance !== "undefined";
}

function lire(texte: string) {
  if (!voixDisponible()) {
    return;
  }
  globalThis.speechSynthesis.cancel();
  const phrase = new SpeechSynthesisUtterance(texte);
  // Darija et français sont écrits en lettres latines : voix française.
  phrase.lang = "fr-FR";
  globalThis.speechSynthesis.speak(phrase);
}

/* ---------------------- Reconnaissance vocale (web) ---------------------- */

type Reconnaissance = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function creerReconnaissance(): Reconnaissance | null {
  const g = globalThis as unknown as { SpeechRecognition?: new () => Reconnaissance; webkitSpeechRecognition?: new () => Reconnaissance };
  const Classe = g.SpeechRecognition ?? g.webkitSpeechRecognition;
  return Classe ? new Classe() : null;
}

/** Horloge lue uniquement dans les gestionnaires d'événement. */
function maintenant() {
  return Date.now();
}

function duree(secondes: number) {
  const s = Math.max(1, Math.round(secondes));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function AssistantScreen({ navigation }: Props) {
  const { lang, t, align, direction } = useI18n();
  const [saisie, setSaisie] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [attente, setAttente] = useState(false);
  const [traduit, setTraduit] = useState(lang === "fr");
  const [ecoute, setEcoute] = useState(false);
  const [avis, setAvis] = useState<string | null>(null);
  const defilement = useRef<ComponentRef<typeof ScrollView>>(null);
  const compteur = useRef(0);
  const micro = useRef<{ rec: Reconnaissance; debut: number } | null>(null);

  async function demander(texte: string, voix?: number) {
    const question = texte.trim();
    if (!question || attente) {
      return;
    }
    setSaisie("");
    setAvis(null);
    setAttente(true);
    setMessages((liste) => [...liste, { id: ++compteur.current, auteur: "moi", texte: question, voix }]);
    let reponse: Reponse;
    let horsLigne = false;
    try {
      reponse = await api<Reponse>("/assistant", { body: { question, langue: lang } });
    } catch {
      reponse = repondreLocal(question);
      horsLigne = true;
    }
    setMessages((liste) => [...liste, { id: ++compteur.current, auteur: "ardi", reponse, horsLigne }]);
    setAttente(false);
    if (!reponse.refus) {
      lire(traduit ? reponse.traduction_fr : reponse.texte);
    }
  }

  function basculerMicro() {
    if (micro.current) {
      micro.current.rec.stop();
      return;
    }
    const rec = creerReconnaissance();
    if (!rec) {
      setAvis(t("bVoiceUnavailable"));
      return;
    }
    rec.lang = lang === "ar" ? "ar-TN" : "fr-FR";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const transcrit = e.results[0]?.[0]?.transcript ?? "";
      const debut = micro.current?.debut ?? maintenant();
      if (transcrit.trim()) {
        void demander(transcrit, (maintenant() - debut) / 1000);
      } else {
        setAvis(t("bVoiceError"));
      }
    };
    rec.onerror = (e) => {
      setAvis(e.error === "not-allowed" || e.error === "service-not-allowed" ? t("bVoiceDenied") : t("bVoiceError"));
    };
    rec.onend = () => {
      micro.current = null;
      setEcoute(false);
    };
    try {
      rec.start();
      micro.current = { rec, debut: maintenant() };
      setAvis(null);
      setEcoute(true);
    } catch {
      micro.current = null;
      setAvis(t("bVoiceError"));
    }
  }

  const aTexte = saisie.trim().length > 0;

  return (
    <Screen scroll={false} keyboard tabs={<FarmerTabs actif="Assistant" />}>
      <View style={styles.tete}>
        <View style={styles.teteGauche}>
          <View style={styles.avatar}>
            <Icon name="sprout" color={colors.white} size={22} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.titre, { textAlign: align }]} accessibilityRole="header">
              {t("assistantTitle")}
            </Text>
            <Text style={[styles.sousTitre, { textAlign: align }]} numberOfLines={1}>
              {t("assistantSubtitle")}
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: traduit }}
          onPress={() => setTraduit((v) => !v)}
          style={({ pressed }) => [styles.traduire, traduit && styles.traduireOn, pressed && styles.presse]}
        >
          <Text style={styles.traduireTexte}>{traduit ? t("bShowOriginal") : t("bTranslate")}</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={defilement}
        style={styles.flex}
        contentContainerStyle={styles.fil}
        onContentSizeChange={() => defilement.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.bulle, styles.ardi]}>
          <Text style={[styles.texteArdi, { textAlign: align }]}>{t("assistantIntro")}</Text>
        </View>

        {messages.length === 0 ? (
          <View style={styles.suggestions}>
            {SUGGESTIONS.map((item) => (
              <Pressable
                key={item.darija}
                accessibilityRole="button"
                onPress={() => void demander(traduit ? item.fr : item.darija)}
                style={({ pressed }) => [styles.suggestion, pressed && styles.presse]}
              >
                <Text style={styles.suggestionTexte}>{traduit ? item.fr : item.darija}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {messages.map((message) =>
          message.auteur === "moi" ? (
            <View key={message.id} style={[styles.bulle, styles.moi, { gap: message.voix ? 6 : 4 }]}>
              {message.voix ? <BulleVoix texte={message.texte} secondes={message.voix} /> : null}
              <Text style={[styles.texteMoi, { textAlign: align }]}>{message.texte}</Text>
            </View>
          ) : (
            <BulleArdi
              key={message.id}
              reponse={message.reponse}
              horsLigne={message.horsLigne}
              traduit={traduit}
              onSimulateur={() => navigation.navigate("Simulateur")}
              onSolaire={() => navigation.navigate("Solaire")}
            />
          ),
        )}

        {attente ? (
          <View style={[styles.bulle, styles.ardi, styles.attente]}>
            <ActivityIndicator color={colors.olive} size="small" />
            <Text style={styles.petit}>{t("thinking")}</Text>
          </View>
        ) : null}
      </ScrollView>

      {avis || ecoute ? (
        <View style={styles.avis}>
          <Notice tone={ecoute ? "info" : "warning"} text={ecoute ? t("bListening") : avis ?? ""} />
        </View>
      ) : null}

      <View style={[styles.saisie, { direction }]}>
        <TextInput
          value={saisie}
          onChangeText={setSaisie}
          placeholder={t("bWriteOrSpeak")}
          placeholderTextColor={colors.muted}
          onSubmitEditing={() => void demander(saisie)}
          returnKeyType="send"
          submitBehavior="submit"
          accessibilityLabel={t("message")}
          style={[styles.champ, { textAlign: align }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={aTexte ? t("bSend") : t("bSpeakToAssistant")}
          accessibilityState={{ busy: attente, selected: ecoute }}
          disabled={attente && aTexte}
          onPress={() => (aTexte ? void demander(saisie) : basculerMicro())}
          style={({ pressed }) => [styles.micro, ecoute && styles.microEcoute, pressed && styles.presse]}
        >
          {aTexte ? (
            <Icon name="send" color={colors.white} size={22} />
          ) : ecoute ? (
            <View style={styles.stop} />
          ) : (
            <Icon name="mic" color={colors.white} size={24} />
          )}
        </Pressable>
      </View>
    </Screen>
  );
}

/* ------------------------------ Bulles ------------------------------ */

const ONDE = [6, 10, 14, 8, 16, 12, 6, 14, 10, 16, 8, 12, 6];

function BulleVoix({ texte, secondes }: { texte: string; secondes: number }) {
  const { t } = useI18n();
  return (
    <View style={styles.voix}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("bPlayVoice")}
        hitSlop={8}
        disabled={!voixDisponible()}
        onPress={() => lire(texte)}
      >
        <Icon name="play" color={colors.white} size={16} />
      </Pressable>
      <View style={styles.onde}>
        {ONDE.map((h, i) => (
          <View key={i} style={[styles.barre, { height: h }]} />
        ))}
      </View>
      <Text style={styles.voixDuree}>{duree(secondes)}</Text>
    </View>
  );
}

function BulleArdi({
  reponse,
  horsLigne,
  traduit,
  onSimulateur,
  onSolaire,
}: {
  reponse: Reponse;
  horsLigne: boolean;
  traduit: boolean;
  onSimulateur: () => void;
  onSolaire: () => void;
}) {
  const { t, align } = useI18n();
  const texte = traduit ? reponse.traduction_fr : reponse.texte;
  const carte = reponse.carte;
  return (
    <View style={[styles.bulle, styles.ardi]}>
      {reponse.refus ? (
        <View style={styles.horsSujet}>
          <Icon name="info" color={colors.amber} size={14} />
          <Text style={[styles.petit, { color: colors.amber }]}>{t("offTopic")}</Text>
        </View>
      ) : null}
      <Text style={[styles.texteArdi, { textAlign: align }]}>{texte}</Text>
      {traduit ? <Text style={[styles.mini, { textAlign: align }]}>{t("bTranslatedFr")}</Text> : null}
      {carte?.dt_m3 != null ? <CartePlan carte={carte} onPress={onSimulateur} /> : null}
      {carte?.kwh_m3 != null ? <CarteSolaire carte={carte} onPress={onSolaire} /> : null}
      {voixDisponible() && !reponse.refus ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => lire(texte)}
          style={({ pressed }) => [styles.ecouter, pressed && styles.presse]}
        >
          <Icon name="volume" color={colors.olive} size={16} />
          <Text style={styles.ecouterTexte}>{t("bListenAnswer")}</Text>
        </Pressable>
      ) : null}
      {horsLigne ? <Text style={[styles.mini, { textAlign: align }]}>{t("offline")}</Text> : null}
    </View>
  );
}

function CartePlan({ carte, onPress }: { carte: NonNullable<Carte>; onPress: () => void }) {
  const { lang, t, tx, align } = useI18n();
  const titre = carte.titre && typeof carte.titre === "object" ? (carte.titre as Localized) : null;
  const dt = carte.dt_m3 ?? 0;
  const ha = carte.surface_ha ?? sprint07.surface_ha;
  // Effet du plan comparé à aujourd'hui, avec les chiffres du simulateur.
  const culture = titre ? sprint07.cultures.find((c) => c.nom.fr === titre.fr) : undefined;
  const pct = (valeur: number, ref: number) => {
    const p = Math.round(((valeur - ref) / ref) * 100);
    return `${p > 0 ? "+" : p < 0 ? "−" : ""}${formatNumber(Math.abs(p), lang, 0)} %`;
  };
  const fleche = lang === "ar" ? "←" : "→";
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => [styles.carte, pressed && styles.presse]}>
      <View style={styles.carteTete}>
        <Text style={styles.carteTitre}>{t("bProposedPlan")}</Text>
        <CarreLabel note={lettre(dt)} taille={28} rayon={8} />
      </View>
      <Text style={[styles.carteTexte, { textAlign: align }]}>
        {titre ? `${tx(titre)} ${formatNumber(ha, lang, 1)} ${t("unitHa")}` : `${formatNumber(ha, lang, 1)} ${t("unitHa")}`} ·{" "}
        {formatNumber(dt, lang, 2)} {t("unitDt")}/m³
      </Text>
      {culture ? (
        <Text style={[styles.carteChiffres, { textAlign: align }]}>
          <Text style={{ color: colors.water }}>
            {t("bPctWater", { v: pct(ha * culture.eau_m3_ha, sprint07.actuel.eau_m3) })}
          </Text>
          {" · "}
          <Text style={{ color: colors.olive }}>
            {t("bPctRevenue", { v: pct(ha * culture.revenu_dt_ha, sprint07.actuel.revenu_dt) })}
          </Text>
        </Text>
      ) : null}
      <Text style={[styles.carteLien, { textAlign: align }]}>
        {t("openSimulator")} {fleche}
      </Text>
    </Pressable>
  );
}

function CarteSolaire({ carte, onPress }: { carte: NonNullable<Carte>; onPress: () => void }) {
  const { lang, t, align } = useI18n();
  const fleche = lang === "ar" ? "←" : "→";
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => [styles.carte, pressed && styles.presse]}>
      <View style={styles.carteTete}>
        <Text style={styles.carteTitre}>{t("bSolarPump")}</Text>
        <Icon name="sun" color={colors.amber} size={22} />
      </View>
      <Text style={[styles.carteTexte, { textAlign: align }]}>
        {carte.profondeur_m != null ? `${t("well")} ${formatNumber(carte.profondeur_m, lang, 0)} ${t("unitM")} · ` : ""}
        <Text style={{ color: colors.amber }}>{formatNumber(carte.kwh_m3 ?? 0, lang, 2)} kWh/m³</Text>
      </Text>
      <Text style={[styles.carteLien, { textAlign: align }]}>
        {t("openSolar")} {fleche}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  presse: { opacity: 0.85 },
  tete: {
    minHeight: 72,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  teteGauche: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.olive, alignItems: "center", justifyContent: "center" },
  titre: { fontSize: 18, lineHeight: 23, color: colors.ink, ...police("800") },
  sousTitre: { fontSize: 12, lineHeight: 16, color: SOUS_TITRE, ...police("700") },
  traduire: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.white,
    justifyContent: "center",
  },
  traduireOn: { backgroundColor: colors.oliveSoft, borderColor: colors.olive },
  traduireTexte: { fontSize: 13, color: colors.olive, ...police("800") },
  fil: { flexGrow: 1, justifyContent: "flex-end", gap: 12, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  bulle: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, gap: 6 },
  moi: { alignSelf: "flex-end", maxWidth: "82%", backgroundColor: colors.olive, borderBottomEndRadius: 4 },
  ardi: { alignSelf: "flex-start", maxWidth: "86%", backgroundColor: colors.white, paddingVertical: 12, borderBottomStartRadius: 4 },
  texteMoi: { fontSize: 14, lineHeight: 20, color: colors.white, ...police("500") },
  texteArdi: { fontSize: 14, lineHeight: 20, color: colors.ink, ...police("500") },
  petit: { fontSize: 13, color: colors.muted, ...police("600") },
  mini: { fontSize: 11, color: colors.muted, ...police("600") },
  attente: { flexDirection: "row", alignItems: "center", gap: 8 },
  horsSujet: { flexDirection: "row", alignItems: "center", gap: 4 },
  voix: { flexDirection: "row", alignItems: "center", gap: 8 },
  onde: { flexDirection: "row", alignItems: "center", gap: 3, flex: 1, minWidth: 60 },
  barre: { width: 2.5, borderRadius: 2, backgroundColor: colors.leaf },
  voixDuree: { fontSize: 12, color: colors.leaf, ...police("700") },
  carte: {
    marginTop: 4,
    backgroundColor: CARTE_FOND,
    borderWidth: 1,
    borderColor: CARTE_BORD,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  carteTete: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  carteTitre: { fontSize: 13, color: colors.ink, ...police("800") },
  carteTexte: { fontSize: 13, color: colors.body, ...police("600") },
  carteChiffres: { fontSize: 12, ...police("800") },
  carteLien: { fontSize: 12, color: colors.olive, ...police("800") },
  ecouter: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.white,
  },
  ecouterTexte: { fontSize: 12, color: colors.olive, ...police("700") },
  suggestions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  suggestion: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.white,
  },
  suggestionTexte: { fontSize: 13, color: colors.olive, ...police("700") },
  avis: { paddingHorizontal: 16 },
  saisie: {
    minHeight: 76,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.bg,
  },
  champ: {
    flex: 1,
    minWidth: 0,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.white,
    paddingHorizontal: 18,
    fontSize: 15,
    color: colors.ink,
    ...police("500"),
  },
  micro: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.olive, alignItems: "center", justifyContent: "center" },
  microEcoute: { backgroundColor: colors.clay },
  stop: { width: 16, height: 16, borderRadius: 3, backgroundColor: colors.white },
});
