import type { NavigationProp } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import type { RootStackParamList } from "../navigation/types";

import { LanguageSwitch } from "../components/LanguageSwitch";
import { Tap } from "../components/Tap";
import { API_URL } from "../fixture";
import { formatNumber, useI18n } from "../i18n";
import type { Lang, Localized } from "../types";
import { colors, tap } from "../theme";
import sprint07 from "../../../fixtures/sprint-07.json";
import sprint08 from "../../../fixtures/sprint-08.json";
import sprint09 from "../../../fixtures/sprint-09.json";
import sprint10 from "../../../fixtures/sprint-10.json";
import sprint11 from "../../../fixtures/sprint-11.json";
import sprint12 from "../../../fixtures/sprint-12.json";
import sprint13 from "../../../fixtures/sprint-13.json";
import sprint14 from "../../../fixtures/sprint-14.json";
import sprint15 from "../../../fixtures/sprint-15.json";
import sprint16 from "../../../fixtures/sprint-16.json";
import sprint17 from "../../../fixtures/sprint-17.json";
import sprint18 from "../../../fixtures/sprint-18.json";

type Texte = { fr: string; ar: string; darija: string };

function lire(texte: string) {
  const voix = globalThis.speechSynthesis;
  if (!voix) {
    return;
  }
  voix.cancel();
  voix.speak(new SpeechSynthesisUtterance(texte));
}

function nom(valeur: Localized | string, lang: Lang) {
  return typeof valeur === "string" ? valeur : valeur[lang];
}

function cent(valeur: number) {
  return Math.floor(valeur * 100 + 0.5) / 100;
}

export function SimulateurScreen() {
  const { lang, t, direction } = useI18n();
  const fiche = sprint07;
  const [parts, setParts] = useState<Record<string, number>>({ capres: 2.4 });
  const [message, setMessage] = useState<string | null>(null);
  const calcul = useMemo(() => {
    let surface = 0;
    let eau = 0;
    let revenu = 0;
    for (const culture of fiche.cultures) {
      const hectares = parts[culture.id] ?? 0;
      surface += hectares;
      eau += hectares * culture.eau_m3_ha;
      revenu += hectares * culture.revenu_dt_ha;
    }
    const energie = eau * fiche.kwh_m3;
    const dt = eau ? cent(revenu / eau) : 0;
    const alerteSurface = surface > fiche.surface_ha + 1e-6;
    const alertePuits = eau > fiche.capacite_puits_m3;
    const label = dt < 0.8 ? "E" : !alertePuits && dt >= 2.2 ? "A" : dt >= 1.5 ? "B" : dt >= 1.1 ? "C" : "D";
    return { surface, eau: Math.round(eau), revenu: Math.round(revenu), energie: Math.round(energie), dt, label, alerteSurface, alertePuits };
  }, [parts, fiche]);

  async function adopter() {
    const repartition = fiche.cultures
      .filter((culture) => (parts[culture.id] ?? 0) > 0)
      .map((culture) => ({ culture_id: culture.id, hectares: parts[culture.id] }));
    const reponse = await fetch(`${API_URL}/parcelles/${fiche.parcelle_id}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repartition }),
    });
    setMessage(reponse.ok ? t("parcelSaved") : reponse.status === 422 ? t("planRefused") : t("analysisError"));
  }

  return (
    <ScrollView style={{ direction }} contentContainerStyle={styles.content}>
      <LanguageSwitch />
      <Text style={styles.title}>{t("screen5")}</Text>
      {fiche.cultures.map((culture) => (
        <View key={culture.id} style={styles.row}>
          <Text style={styles.nom}>{nom(culture.nom, lang)}</Text>
          <Pressable accessibilityRole="button" style={styles.mini} onPress={() => setParts((actuel) => ({ ...actuel, [culture.id]: Math.max(0, cent((actuel[culture.id] ?? 0) - 0.2)) }))}>
            <Text style={styles.miniTexte}>−</Text>
          </Pressable>
          <Text style={styles.valeur}>{formatNumber(parts[culture.id] ?? 0, lang, 1)} ha</Text>
          <Pressable accessibilityRole="button" style={styles.mini} onPress={() => setParts((actuel) => ({ ...actuel, [culture.id]: cent((actuel[culture.id] ?? 0) + 0.2) }))}>
            <Text style={styles.miniTexte}>+</Text>
          </Pressable>
        </View>
      ))}
      <View style={[styles.banner, (calcul.alerteSurface || calcul.alertePuits) && styles.alerte]}>
        <Text style={styles.kwh}>{calcul.label}</Text>
        <Text>{formatNumber(calcul.revenu, lang, 0)} DT</Text>
        <Text>{formatNumber(calcul.eau, lang, 0)} m³ · {formatNumber(calcul.energie, lang, 0)} kWh</Text>
        <Text>{formatNumber(calcul.dt, lang, 2)} DT/m³</Text>
        <Text>
          {t("gap")} {formatNumber(fiche.actuel.eau_m3 - calcul.eau, lang, 0)} m³
        </Text>
        {calcul.alerteSurface ? <Text style={styles.erreur}>Surface {formatNumber(calcul.surface, lang, 1)} / {fiche.surface_ha} ha</Text> : null}
        {calcul.alertePuits ? <Text style={styles.erreur}>Puits {formatNumber(calcul.eau, lang, 0)} / {fiche.capacite_puits_m3} m³</Text> : null}
      </View>
      <Text style={styles.note}>
        {t("crop")} {nom(fiche.actuel.nom, lang)} · {fiche.actuel.label} · {formatNumber(fiche.actuel.dt_m3, lang, 2)} DT/m³
      </Text>
      <Tap label={t("adoptPlan")} onPress={() => void adopter()} />
      {message ? <Text style={styles.status}>{message}</Text> : null}
      <Text style={styles.note}>{fiche.hypothese[lang]}</Text>
    </ScrollView>
  );
}

export function AccueilFermierScreen() {
  const { lang, t, direction } = useI18n();
  const accueil = sprint08.accueil;
  return (
    <ScrollView style={{ direction }} contentContainerStyle={styles.content}>
      <LanguageSwitch />
      <Text style={styles.title}>{t("screen1")}</Text>
      <View style={styles.banner}>
        <Text style={styles.kwh}>{accueil.label_actuel}</Text>
        <Text>{accueil.label_potentiel}</Text>
        <Text>{formatNumber(accueil.bilan.eau_m3, lang, 0)} m³ · {formatNumber(accueil.bilan.energie_kwh, lang, 0)} kWh</Text>
        <Text>{nom(accueil.conseil.culture, lang)} · {formatNumber(accueil.conseil.ecart_dt_m3, lang, 2)} DT/m³</Text>
      </View>
      <Text style={styles.note}>{sprint08.hypothese[lang]}</Text>
    </ScrollView>
  );
}

export function LabelScreen() {
  const { lang, t, direction } = useI18n();
  const [fiche, setFiche] = useState<{ note: string | null; statut: string; produit: Texte } | null>(null);
  useEffect(() => {
    fetch(`${API_URL}/labels/ardi-ferme-ben-ali`).then((reponse) => reponse.json()).then(setFiche).catch(() => setFiche(null));
  }, []);
  return (
    <ScrollView style={{ direction }} contentContainerStyle={styles.content}>
      <LanguageSwitch />
      <Text style={styles.title}>{t("screen7")}</Text>
      <Text style={styles.kwh}>{fiche?.note ?? sprint08.labels[0].note}</Text>
      <Text>{formatNumber(sprint08.accueil.bilan.eau_m3, lang, 0)} m³ · {formatNumber(sprint08.accueil.bilan.energie_kwh, lang, 0)} kWh</Text>
      <Text>{fiche ? nom(fiche.produit, lang) : nom(sprint08.labels[0].produit, lang)}</Text>
      <Text style={styles.qr}>{sprint08.labels[0].qr}</Text>
      {sprint08.verifications.map((ligne) => (
        <Text key={ligne.id}>{ligne.resultat}</Text>
      ))}
      <Text style={styles.note}>{sprint08.hypothese[lang]}</Text>
    </ScrollView>
  );
}

export function AssistantScreen() {
  const { lang, direction } = useI18n();
  const [question, setQuestion] = useState(sprint09.questions[0].darija);
  const [reponse, setReponse] = useState<{ texte: string; traduction_fr: string; refus?: boolean; carte?: { dt_m3?: number; profondeur_m?: number } | null } | null>(null);

  async function demander(texte: string) {
    setQuestion(texte);
    const http = await fetch(`${API_URL}/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: texte, langue: lang }),
    });
    const corps = await http.json();
    setReponse(corps);
    lire(corps.texte);
  }

  return (
    <ScrollView style={{ direction }} contentContainerStyle={styles.content}>
      <LanguageSwitch />
      <Text style={styles.title}>Assistant</Text>
      <TextInput value={question} onChangeText={setQuestion} style={styles.input} />
      <Tap label="Envoyer" onPress={() => void demander(question)} />
      <Pressable accessibilityRole="button" style={styles.choice} onPress={() => void demander(sprint09.questions[6].darija)}>
        <Text>Micro · {sprint09.questions[6].darija}</Text>
      </Pressable>
      {reponse ? (
        <View style={styles.card}>
          <Text style={styles.nom}>{reponse.texte}</Text>
          <Text style={styles.note}>{reponse.traduction_fr}</Text>
          {reponse.carte ? (
            <Text>
              {reponse.carte.dt_m3 != null ? `${reponse.carte.dt_m3} DT/m³` : ""}
              {reponse.carte.profondeur_m != null ? `${reponse.carte.profondeur_m} m` : ""}
            </Text>
          ) : null}
          <Pressable accessibilityRole="button" onPress={() => lire(reponse.texte)} style={styles.mini}>
            <Text style={styles.miniTexte}>Lire</Text>
          </Pressable>
        </View>
      ) : null}
      {sprint09.questions.slice(0, 6).map((item) => (
        <Pressable key={item.darija} accessibilityRole="button" style={styles.choice} onPress={() => void demander(item.darija)}>
          <Text>{item.darija}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function MarcheScreen() {
  const { lang, direction } = useI18n();
  const [filtre, setFiltre] = useState("A");
  const [produits, setProduits] = useState<typeof sprint10.produits>([]);
  const [ouvert, setOuvert] = useState<(typeof sprint10.produits)[number] | null>(null);
  const [quantite, setQuantite] = useState(1);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const parametre = filtre ? `?label=${filtre}` : "";
    fetch(`${API_URL}/produits${parametre}`).then((reponse) => reponse.json()).then((corps) => setProduits(corps.produits)).catch(() => setProduits(sprint10.produits));
  }, [filtre]);

  async function scanner(qr: string) {
    const reponse = await fetch(`${API_URL}/produits?qr=${qr}`);
    const corps = await reponse.json();
    setOuvert(corps.produits?.[0] ?? null);
  }

  async function payer(moyen: string) {
    if (!ouvert) {
      return;
    }
    const reponse = await fetch(`${API_URL}/commandes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lignes: [{ produit_id: ouvert.id, quantite }], moyen_paiement: moyen }),
    });
    const corps = await reponse.json();
    setMessage(`${corps.statut} · ${corps.montant} DT`);
  }

  return (
    <ScrollView style={{ direction }} contentContainerStyle={styles.content}>
      <LanguageSwitch />
      <Text style={styles.title}>Marché</Text>
      <View style={styles.row}>
        {["A", "B", ""].map((label) => (
          <Pressable key={label || "tous"} accessibilityRole="button" style={[styles.choice, filtre === label && styles.choiceOn]} onPress={() => setFiltre(label)}>
            <Text>{label || "Tous"}</Text>
          </Pressable>
        ))}
      </View>
      <Tap label="Scanner le QR de démo" onPress={() => void scanner(sprint10.qr_demo)} />
      {produits.map((produit) => (
        <Pressable key={produit.id} accessibilityRole="button" style={styles.card} onPress={() => setOuvert(produit)}>
          <Text style={styles.nom}>{nom(produit.nom, lang)} · {produit.label}</Text>
          <Text>{produit.prix} DT · {produit.region}</Text>
        </Pressable>
      ))}
      {ouvert ? (
        <View style={styles.banner}>
          <Text style={styles.nom}>{nom(ouvert.nom, lang)}</Text>
          <Text>{ouvert.histoire[lang]}</Text>
          <Text>{ouvert.eau_m3_kg} m³/kg · {ouvert.kwh_kg} kWh/kg</Text>
          <View style={styles.row}>
            <Pressable accessibilityRole="button" style={styles.mini} onPress={() => setQuantite((valeur) => Math.max(1, valeur - 1))}><Text>−</Text></Pressable>
            <Text>{quantite}</Text>
            <Pressable accessibilityRole="button" style={styles.mini} onPress={() => setQuantite((valeur) => valeur + 1)}><Text>+</Text></Pressable>
          </View>
          <Tap label="Payer à la livraison" onPress={() => void payer("livraison")} />
          <Tap label="Carte simulée" variant="secondary" onPress={() => void payer("carte")} />
          {message ? <Text>{message}</Text> : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

export function VentesScreen() {
  const { lang, direction } = useI18n();
  const [prix, setPrix] = useState("11");
  const [statut, setStatut] = useState(sprint11.commande_demo.statut);
  const [message, setMessage] = useState<string | null>(null);

  async function agir(corps: object) {
    const reponse = await fetch(`${API_URL}/commandes/cmd-demo`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });
    const commande = await reponse.json();
    setStatut(commande.statut);
  }

  async function publier() {
    const reponse = await fetch(`${API_URL}/produits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: "Câpres du jour", prix: Number(prix), stock: 30 }),
    });
    setMessage(reponse.ok ? "Publié" : "Erreur");
  }

  return (
    <ScrollView style={{ direction }} contentContainerStyle={styles.content}>
      <LanguageSwitch />
      <Text style={styles.title}>Mes ventes</Text>
      <TextInput value={prix} onChangeText={setPrix} keyboardType="decimal-pad" style={styles.input} />
      <Tap label="Publier" onPress={() => void publier()} />
      <View style={styles.card}>
        <Text style={styles.nom}>{nom(sprint11.commande_demo.produit, lang)}</Text>
        <Text>{sprint11.commande_demo.quantite} kg · {statut}</Text>
        <Tap label="Accepter" onPress={() => void agir({ statut: "acceptee" })} />
        <Tap label="Autre prix" variant="secondary" onPress={() => void agir({ prix: Number(prix) })} />
      </View>
      <Text style={styles.note}>{sprint11.devis.message[lang]}</Text>
      {message ? <Text>{message}</Text> : null}
    </ScrollView>
  );
}

export function NotificationsScreen() {
  const { lang, direction } = useI18n();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [liste, setListe] = useState(sprint11.notifications);
  useEffect(() => {
    fetch(`${API_URL}/notifications`).then((reponse) => reponse.json()).then((corps) => setListe(corps.notifications)).catch(() => undefined);
  }, []);
  return (
    <ScrollView style={{ direction }} contentContainerStyle={styles.content}>
      <LanguageSwitch />
      <Text style={styles.title}>Notifications</Text>
      {liste.map((notification) => (
        <Pressable
          key={notification.id}
          accessibilityRole="button"
          style={styles.card}
          onPress={() => {
            fetch(`${API_URL}/notifications/${notification.id}/lue`, { method: "POST" })
              .then((reponse) => reponse.json())
              .then((lue) => setListe((actuel) => actuel.map((item) => (item.id === lue.id ? lue : item))))
              .catch(() => undefined);
            if (notification.type === "commande") {
              navigation.navigate("Ventes");
            }
          }}
        >
          <Text style={styles.nom}>{notification.type}{notification.lue ? " · lue" : ""}</Text>
          <Text>{notification.message[lang]}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function DemoScreen() {
  const { lang, direction } = useI18n();
  return (
    <ScrollView style={{ direction }} contentContainerStyle={styles.content}>
      <LanguageSwitch />
      <Text style={styles.title}>Démo</Text>
      {sprint12.cartes.map((carte, index) => (
        <View key={carte.id} style={styles.card}>
          <Text style={styles.nom}>{index + 1}. {carte[lang]}</Text>
        </View>
      ))}
      {Object.entries(sprint12.pitch).map(([cle, valeur]) => (
        <Text key={cle}>{valeur[lang]}</Text>
      ))}
    </ScrollView>
  );
}

export function SolaireScreen() {
  const { lang, t, direction } = useI18n();
  const [profondeur, setProfondeur] = useState(String(sprint13.profondeur_puits_m ?? ""));
  const [resultat, setResultat] = useState<Record<string, number | string> | null>(null);
  async function calculer(valeur: string) {
    if (!valeur) {
      setResultat(null);
      return;
    }
    const reponse = await fetch(`${API_URL}/parcelles/${sprint13.parcelle_id}/solaire?profondeur=${valeur}`);
    setResultat(await reponse.json());
  }
  useEffect(() => {
    if (sprint13.profondeur_puits_m) {
      void calculer(String(sprint13.profondeur_puits_m));
    }
  }, []);
  if (!sprint13.profondeur_puits_m && profondeur === "") {
    return <ScrollView style={{ direction }} contentContainerStyle={styles.content}><Text style={styles.title}>{t("screen8")}</Text><Text>Profondeur manquante</Text></ScrollView>;
  }
  return (
    <ScrollView style={{ direction }} contentContainerStyle={styles.content}>
      <LanguageSwitch />
      <Text style={styles.title}>{t("screen8")}</Text>
      <TextInput value={profondeur} onChangeText={setProfondeur} keyboardType="decimal-pad" style={styles.input} />
      <Tap label="Calculer" onPress={() => void calculer(profondeur)} />
      {resultat && !resultat.vide ? (
        <View style={styles.banner}>
          <Text>{resultat.puissance_kw} kW · {resultat.panneaux} panneaux</Text>
          <Text>Réservoir {resultat.reservoir_m3} m³</Text>
          <Text>Gasoil {resultat.cout_gasoil_dt} DT · STEG {resultat.cout_steg_dt} DT</Text>
          <Text>Solaire {resultat.cout_solaire_dt} DT</Text>
        </View>
      ) : null}
      {sprint13.heures.map((heure) => (
        <Text key={heure.heure}>{heure.heure} · {Math.round(heure.part * 100)} %</Text>
      ))}
      <Text style={styles.note}>{sprint13.aides[lang]}</Text>
    </ScrollView>
  );
}

export function SuiviScreen() {
  const { lang, t, direction } = useI18n();
  const [scenario, setScenario] = useState("une");
  const [corps, setCorps] = useState<{ statut: string; alertes: { message: Texte }[]; zones: { id: string; nom: Texte; ndvi: number }[]; irrigation_m3: number; plan_eau_m3: number } | null>(null);
  useEffect(() => {
    fetch(`${API_URL}/parcelles/${sprint14.parcelle_id}/suivi?scenario=${scenario}`).then((reponse) => reponse.json()).then(setCorps).catch(() => setCorps(null));
  }, [scenario]);
  return (
    <ScrollView style={{ direction }} contentContainerStyle={styles.content}>
      <LanguageSwitch />
      <Text style={styles.title}>{t("screen9")}</Text>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" style={styles.choice} onPress={() => setScenario("une")}><Text>1 image</Text></Pressable>
        <Pressable accessibilityRole="button" style={styles.choice} onPress={() => setScenario("deux")}><Text>2 images</Text></Pressable>
      </View>
      {corps?.zones.map((zone) => (
        <Text key={zone.id}>{nom(zone.nom, lang)} · NDVI {zone.ndvi}</Text>
      ))}
      {corps ? <Text>{corps.irrigation_m3} / {corps.plan_eau_m3} m³ · {corps.statut}</Text> : null}
      {corps?.alertes.map((alerte) => (
        <Text key={alerte.message.fr} style={styles.erreur}>{alerte.message[lang]}</Text>
      ))}
      <Tap label="Contester avec une photo" onPress={() => void fetch(`${API_URL}/parcelles/${sprint14.parcelle_id}/contestation`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ photo: "sol.jpg", position: "35.04,9.49" }) })} />
    </ScrollView>
  );
}

export function ImpactScreen() {
  const { direction } = useI18n();
  const [pro, setPro] = useState(false);
  const compte = pro ? sprint15.compte_pro : sprint15.compte;
  const [corps, setCorps] = useState<{ eau_m3: number; fermes: number; part_a: number; montant: number } | null>(null);
  useEffect(() => {
    fetch(`${API_URL}/impact?compte=${compte}`).then((reponse) => reponse.json()).then(setCorps).catch(() => setCorps(null));
  }, [compte]);
  return (
    <ScrollView style={{ direction }} contentContainerStyle={styles.content}>
      <LanguageSwitch />
      <Text style={styles.title}>Mon impact</Text>
      <Pressable accessibilityRole="button" style={styles.choice} onPress={() => setPro((valeur) => !valeur)}>
        <Text>{pro ? "Compte professionnel" : "Compte particulier"}</Text>
      </Pressable>
      {corps ? (
        <View style={styles.banner}>
          <Text style={styles.kwh}>{corps.eau_m3} m³</Text>
          <Text>{corps.fermes} fermes · {Math.round(corps.part_a * 100)} % A</Text>
          <Text>{corps.montant} DT</Text>
        </View>
      ) : null}
      <Tap
        label="Télécharger le rapport"
        onPress={() => {
          if (typeof document === "undefined" || !corps) {
            return;
          }
          const lien = document.createElement("a");
          lien.href = URL.createObjectURL(new Blob([JSON.stringify(corps, null, 2)], { type: "application/json" }));
          lien.download = "impact-ardi.json";
          lien.click();
        }}
      />
    </ScrollView>
  );
}

export function HorsLigneScreen() {
  const { lang, direction } = useI18n();
  const [accord, setAccord] = useState(false);
  const [message, setMessage] = useState(sprint16.hypothese[lang]);
  return (
    <ScrollView style={{ direction }} contentContainerStyle={styles.content}>
      <LanguageSwitch />
      <Text style={styles.title}>Hors ligne</Text>
      <Text>{nom(sprint16.analyse.texture, lang)} · {sprint16.analyse.kwh_m3} kWh/m³</Text>
      <Text style={styles.note}>{sprint16.analyse.source}</Text>
      {sprint16.classement.map((ligne) => (
        <Text key={ligne.dt_m3}>{nom(ligne.nom, lang)} · {ligne.dt_m3} DT/m³</Text>
      ))}
      <Pressable accessibilityRole="button" style={styles.choice} onPress={() => setAccord((valeur) => !valeur)}>
        <Text>{accord ? "✓ " : ""}{sprint16.consentement[lang]}</Text>
      </Pressable>
      <Tap
        label="Envoyer la parcelle"
        onPress={() => {
          void fetch(`${API_URL}/hors-ligne/parcelle`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...sprint16.parcelle_a_envoyer, consentement: accord }),
          }).then((reponse) => setMessage(reponse.ok ? "Envoyée" : "En attente du réseau ou de l'accord"));
        }}
      />
      <Text>{message}</Text>
      <Text style={styles.note}>Photo {sprint16.photo.nom} · {sprint16.photo.octets_compresses} o</Text>
    </ScrollView>
  );
}

export function ReglagesScreen() {
  const { lang, direction } = useI18n();
  const [corps, setCorps] = useState<{ profil: { nom: string; langue: string }; parcelles: { id: string; nom: string; figee: boolean }[]; classement: { id: string; nom: Texte; dt_m3: number }[]; plan_fige: { label: string } } | null>(null);
  function charger() {
    fetch(`${API_URL}/proprietaires/usr-demo/parcelles`).then((reponse) => reponse.json()).then(setCorps).catch(() => setCorps(null));
  }
  useEffect(() => {
    charger();
  }, []);
  return (
    <ScrollView style={{ direction }} contentContainerStyle={styles.content}>
      <LanguageSwitch />
      <Text style={styles.title}>Réglages</Text>
      {corps ? <Text>{corps.profil.nom} · {corps.profil.langue}</Text> : null}
      {corps?.parcelles.map((parcelle) => (
        <Text key={parcelle.id}>{parcelle.nom}{parcelle.figee ? " · figée" : ""}</Text>
      ))}
      <Text>Plan figé · {corps?.plan_fige.label}</Text>
      {corps?.classement.map((ligne) => (
        <Text key={ligne.id}>{nom(ligne.nom, lang)} · {ligne.dt_m3} DT/m³</Text>
      ))}
      <Tap
        label="Prix olivier 12 DT"
        onPress={() => {
          void fetch(`${API_URL}/prix`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ culture: "olivier", typique: 12, source: "ONAGRI" }),
          }).then(() => charger());
        }}
      />
    </ScrollView>
  );
}

export function AdminScreen() {
  const { lang, direction } = useI18n();
  const [note, setNote] = useState<string | null>(sprint18.labels[2].note);
  return (
    <ScrollView style={{ direction }} contentContainerStyle={styles.content}>
      <LanguageSwitch />
      <Text style={styles.title}>Admin</Text>
      {sprint18.labels.map((etiquette) => (
        <Text key={etiquette.qr}>{etiquette.statut} · {etiquette.qr} · {etiquette.note}</Text>
      ))}
      <Text style={styles.erreur}>{note === null ? "Label suspendu, la fiche publique ne montre plus A." : `Fiche publique : ${note}`}</Text>
      <Tap
        label="Ouvrir le QR suspendu"
        onPress={() => {
          void fetch(`${API_URL}/labels/ardi-suspendu`).then((reponse) => reponse.json()).then((corps) => setNote(corps.note));
        }}
      />
      {sprint18.file.map((ligne) => (
        <Text key={ligne.id}>{ligne.type} · {ligne.id}</Text>
      ))}
      <Text style={styles.note}>{sprint18.terrain[lang]}</Text>
      {sprint18.seuils_a_calibrer.map((seuil) => (
        <Text key={seuil}>{seuil}</Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, backgroundColor: colors.bg },
  title: { width: "100%", fontSize: 28, fontWeight: "800", color: colors.ink },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  nom: { flex: 1, fontWeight: "800", color: colors.ink },
  valeur: { width: 64, fontWeight: "700" },
  mini: { minWidth: tap.minWidth, minHeight: tap.minHeight, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  miniTexte: { fontSize: 22, fontWeight: "800", color: colors.olive },
  banner: { backgroundColor: colors.oliveSoft, borderRadius: 16, padding: 16, gap: 4 },
  alerte: { backgroundColor: "#f8e4dc" },
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 6 },
  choice: { minHeight: tap.minHeight, justifyContent: "center", paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  choiceOn: { borderColor: colors.olive },
  kwh: { fontSize: 32, fontWeight: "800", color: colors.ink },
  qr: { fontWeight: "700", color: colors.olive },
  input: { minHeight: tap.minHeight, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, paddingHorizontal: 12 },
  note: { color: colors.muted, lineHeight: 18 },
  status: { color: colors.olive, fontWeight: "700" },
  erreur: { color: colors.clay, fontWeight: "700" },
});
