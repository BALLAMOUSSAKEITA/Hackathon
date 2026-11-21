# Ardi — Plan de sprints

Application mobile : la bonne culture sur la bonne terre.  
Hackathon KIZUNA 2026 · ESPRIT, Tunis · 21–22 novembre 2026.  
Source : cahier des charges v1.0 et maquettes `Ardi — Maquettes mobiles.html` (écrans 0 à 16).

18 sprints. Chacun se lance seul, dans n'importe quel ordre. Le créneau (J1, J2, après le hackathon) est une proposition de calendrier, pas un prérequis.

Priorités du cahier : **M** indispensable, **S** important, **C** souhaitable. La colonne Démo indique ce qui doit être montrable pendant le hackathon.

## Équipe

| Personne | Responsabilité | Périmètre |
| --- | --- | --- |
| **Balla Moussa** | Application mobile React Native, parcours agriculteur | Écrans, navigation, carte, langues, accessibilité, hors-ligne |
| **Nafissatou** | Back-end FastAPI, données, moteur de calcul | API, PostgreSQL/PostGIS, cultures, formules eau / énergie / label, sources externes |
| **Christian** | Intelligence artificielle, énergie, parcours acheteur | Assistant vocal, pompage solaire, QR, marché, scan, panier, impact |

Les trois avancent en parallèle dans chaque sprint. Personne n'attend le livrable d'un autre, ni dans le sprint, ni d'un sprint à l'autre.

## Stack retenue

| Couche | Choix |
| --- | --- |
| Mobile | React Native (Expo), React Navigation, `react-native-maps`, Android 8+ en priorité, iOS 14+ |
| API | Python, FastAPI |
| Données | PostgreSQL + PostGIS (ou Supabase) |
| Fichiers | Stockage d'objets pour photos de sol, photos produits, étiquettes |
| Voix | Reconnaissance (Whisper) et synthèse vocale |
| Assistant | LLM avec outils, réponses limitées aux données Ardi |
| Notifications | Écran in-app pendant le hackathon, FCM ensuite |

## Règles de calcul à respecter

Ces formules sont la référence des tests. Les chiffres du cahier sont des exemples à remplacer par les données réelles.

- Besoin en eau (FAO-56) : `ETc = Kc × ET0`. Irrigation = `(ETc − pluie efficace) / efficience`. Efficience 0,9 en goutte-à-goutte, 0,6 en gravitaire. 1 mm sur 1 ha = 10 m³.
- Énergie de pompage : `E (kWh/m³) = 0,00272 × H / η`, avec `η = 0,5` par défaut. Un puits de 60 m donne environ 0,33 kWh/m³.
- Revenu par m³ = `(rendement × prix − coûts − coût de l'énergie) / besoin en eau`.
- Une culture est exclue si le sol, la salinité, la température ou l'eau disponible ne conviennent pas.
- Label : **A** ≥ 2,2 DT/m³ (culture compatible, irrigation localisée, consommation conforme au plan), **B** ≥ 1,5, **C** ≥ 1,1, **D** ≥ 0,8, **E** en dessous ou dépassement répété du puits.

## Écrans et responsables

| N° | Écran (maquette) | Exigences | Responsable UI | Sprint |
| --- | --- | --- | --- | --- |
| 0 | Bienvenue et langue | F1 | Balla Moussa | 2 |
| 1 | Accueil agriculteur | F5, F11 | Balla Moussa | 8 |
| 2 | Ma parcelle | F2 | Balla Moussa | 4 |
| 3 | Analyse de la terre | F3 | Balla Moussa | 5 |
| 4 | Que planter ? | F5 | Balla Moussa | 6 |
| 5 | Simulateur | F6 | Balla Moussa | 7 |
| 6 | Assistant vocal | F8 | Christian | 9 |
| 7 | Label de la ferme | F11 | Balla Moussa | 8 |
| 8 | Énergie et pompage solaire | F7 | Christian | 13 |
| 9 | Suivi satellite et alertes | F9 | Balla Moussa | 14 |
| 10 | Mes ventes | F12 | Balla Moussa | 11 |
| 11 | Notifications | F10 | Balla Moussa | 11 |
| 12 | Acheteur : produit scanné | F13 | Christian | 10 |
| 13 | Acheteur : marché responsable | F13 | Christian | 10 |
| 14 | Acheteur : scanner | F13 | Christian | 10 |
| 15 | Acheteur : panier | F13 | Christian | 10 |
| 16 | Acheteur : mon impact | F14 | Christian | 15 |

## Vue d'ensemble

| Sprint | Créneau | Objectif | Démo |
| --- | --- | --- | --- |
| 1 | J1 matin | Socle React Native, API, modèle de données | — |
| 2 | J1 matin | Langue, profil, compte | F1.1, F1.2 |
| 3 | J1 matin | 15 cultures tunisiennes | F4.1, F4.2 |
| 4 | J1 matin | Parcelle sur la carte | F2.1 à F2.4 |
| 5 | J1 après-midi | Analyse sol, climat, eau, énergie | F3.1, F3.2, F3.4, F3.5 |
| 6 | J1 soir | Classement « Que planter ? » | F5.1, F5.3, F5.4 |
| 7 | J1 soir | Simulateur et plan adopté | F6 |
| 8 | J2 matin | Accueil, label A–E, QR | F11.1, F11.4 |
| 9 | J2 matin | Assistant vocal darija | F8 |
| 10 | J2 matin | Marché, scan, fiche, panier | F13.1 à F13.4 |
| 11 | J2 matin | Ventes agriculteur et notifications | F12.1, F12.2, F10.1 |
| 12 | J2 après-midi | Scénario de démo, tests, pitch | Critères §11 |
| 13 | Après | Pompe solaire | F7.1 à F7.3 |
| 14 | Après | Suivi satellite et alertes | F9, F3.3 |
| 15 | Après | Impact acheteur et compte pro | F14 |
| 16 | Après | Hors-ligne, accessibilité, performance | §5 |
| 17 | Après | Multi-parcelles, profil, prix | F1.4, F2.6, F4.3 |
| 18 | Après | Confiance du label et pilote | F11.2 à F11.5, F15 |

## Indépendance

Chaque sprint se suffit à lui-même.

- Il embarque son jeu de données `fixtures/sprint-XX.json` : parcelle, cultures, plan, label, produits, tout ce que son écran affiche.
- Il s'ouvre directement sur son écran. Aucun parcours n'oblige à terminer un autre sprint avant.
- Balla démontre l'écran avec ce fichier. Nafissatou démontre l'API avec le même fichier. Christian démontre les contenus, les contrôles ou l'écran dont il a la charge avec le même fichier.
- Ce qui n'est pas dans le sprint est hors de son périmètre. Il n'est pas reporté, et il n'est pas attendu.

## Définition d'un sprint terminé

- L'écran du sprint tourne sur un téléphone ou un émulateur Android à partir de son fichier de données.
- L'API du sprint répond à partir du même fichier.
- Les textes visibles existent en français, en arabe (de droite à gauche) et en darija (latin).
- Les zones tactiles font au moins 44 px.
- Tout chiffre affiché est présent dans le fichier du sprint ou calculé à partir de lui, avec l'hypothèse affichée quand elle existe.

---

## Sprint 1 — Socle technique

**Créneau :** J1 matin. **Fichier :** `fixtures/sprint-01.json` (ferme de démo : parcelle, puits, culture actuelle, produit). Ce sprint livre l'application qui s'ouvre et l'API qui répond. Les autres sprints ont leur propre fichier et ne l'attendent pas.

### Balla Moussa

- Créer le projet React Native avec Expo, le thème Ardi et la navigation (React Navigation, piles agriculteur et acheteur).
- Poser la coquille de navigation et les états vides des écrans 0 à 11.
- Prévoir le sens d'écriture RTL pour l'arabe (`I18nManager`) et des cibles tactiles de 44 px.

### Nafissatou

- Créer l'API FastAPI et la base PostgreSQL + PostGIS.
- Créer les entités : Utilisateur, Parcelle, Analyse, Culture, Plan, Label, Vérification, Produit, Commande, Alerte.
- Exposer un endpoint de santé et documenter les routes de la section 6.4.

### Christian

- Rédiger le contrat d'API (corps des requêtes et des réponses) partagé avec Balla et Nafissatou.
- Préparer la ferme de démo : une parcelle, un puits, une culture actuelle gourmande en eau, un produit labellisé.
- Écrire le scénario de démo en 8 étapes, de l'écran 0 jusqu'au scan acheteur.

**Livrable :** application qui s'ouvre sur la ferme de démo, API qui répond, scénario de pitch écrit.  
**Critère :** chacun des trois montre sa partie sans ouvrir le livrable des deux autres.

---

## Sprint 2 — Bienvenue, langue et profil

**Créneau :** J1 matin. **Écran 0.** **Fichier :** `fixtures/sprint-02.json` (trois profils de démo). **Exigences :** F1.1 (M), F1.2 (M), F1.3 simulé (S).

### Balla Moussa

- Écran Bienvenue : darija, arabe (RTL), français.
- Choix du profil : agriculteur, acheteur particulier, acheteur professionnel.
- Mémoriser langue et profil sur l'appareil, à partir du fichier de ce sprint.

### Nafissatou

- `POST /auth/otp` et `POST /auth/verify` avec un code SMS simulé et fixe pour la démo.
- Utilisateur : téléphone, nom, rôle, langue.
- Refuser un rôle inconnu.

### Christian

- Fichier de traduction des libellés de l'écran 0 et de la navigation, dans les trois langues.
- Parcours d'inscription en moins de quatre tapes, testé en darija et en arabe.

**Livrable :** on choisit une langue et un profil, un compte de démo est créé.  
**Critère :** l'arabe s'affiche de droite à gauche sur tout l'écran 0.

---

## Sprint 3 — Base de cultures

**Créneau :** J1 matin. **Fichier :** `fixtures/sprint-03.json` (15 cultures complètes, prix en fourchette). **Exigences :** F4.1 (M), F4.2 (M). Ce sprint s'arrête aux prix initiaux.

### Balla Moussa

- Composant fiche culture : nom, besoin en eau, rendement, prix, délai avant production, sols compatibles.
- Afficher le nom dans la langue active.

### Nafissatou

- Charger au moins 15 cultures adaptées à la Tunisie : olivier, pistachier, grenadier, figuier de Barbarie, palmier dattier, oignon, tomate, pastèque, orge, câpres, et cinq autres du même bassin.
- Pour chacune : nom en trois langues, Kc par stade (FAO-56), rendement, prix, coûts, sols, tolérance au sel et à la chaleur, durée avant production.
- Endpoint de lecture des cultures, filtre par compatibilité de sol.

### Christian

- Saisir les prix de départ en fourchette (min / typique / max), source ONAGRI ou marché de gros notée sur chaque ligne.
- Vérifier qu'aucune culture de la démo n'a de Kc, de prix ou de rendement manquant.

**Livrable :** 15 cultures interrogeables par l'application.  
**Critère :** une fiche s'ouvre dans les trois langues sans trou de donnée.

---

## Sprint 4 — Ma parcelle

**Créneau :** J1 matin. **Écran 2.** **Fichier :** `fixtures/sprint-04.json` (un polygone déjà tracé, un puits, une culture, une énergie). **Exigences :** F2.1 à F2.4 (M), F2.5 photo (C). Ce sprint traite une seule parcelle.

### Balla Moussa

- Carte satellite avec `react-native-maps` et dessin du polygone de la parcelle.
- Surface calculée et affichée dès la fermeture du tracé.
- Formulaire : source d'eau (puits, GDA ou barrage, réseau), profondeur du puits, débit de la pompe, culture actuelle, énergie (réseau STEG, gasoil, solaire).

### Nafissatou

- `POST /parcelles` : géométrie GeoJSON, surface en hectares, paramètres d'eau et d'énergie.
- Recalculer la surface côté serveur et rejeter un polygone invalide.
- Le propriétaire est l'identifiant d'agriculteur écrit dans le fichier de ce sprint.

### Christian

- Photo du sol facultative, envoyée au stockage si le réseau tient, ignorée sinon.
- Jeu de démo prêt à charger : parcelle déjà tracée, pour ne pas redessiner pendant le pitch.

**Livrable :** une parcelle tracée, enregistrée, avec son eau et son énergie.  
**Critère :** la surface affichée sur le téléphone est la même que celle renvoyée par l'API.

---

## Sprint 5 — Analyse de la terre

**Créneau :** J1 après-midi. **Écran 3.** **Fichier :** `fixtures/sprint-05.json` (parcelle, puits de 60 m, réponses sol et climat, série NDVI sur 12 mois). **Exigences :** F3.1, F3.2, F3.4, F3.5 (M), F3.3 en données figées dans ce fichier.

### Balla Moussa

- Écran Analyse : texture, pH, matière organique, pluie, température, ET0, ensoleillement, eau disponible, kWh/m³.
- État de chargement, erreur réseau, et réaffichage de l'analyse contenue dans le fichier du sprint.
- L'écran s'ouvre directement sur cette analyse. Un bouton la relance. Objectif d'affichage : moins de 2 secondes une fois les données reçues.

### Nafissatou

- `POST /parcelles/{id}/analyse`.
- SoilGrids (texture, pH, carbone organique), Open-Meteo (pluie, température, ET0), NASA POWER (ensoleillement).
- Eau disponible sur la saison à partir du débit et des heures de pompage.
- Énergie par m³ avec la formule du cahier, section 4.2.
- Mettre les réponses externes en cache. L'analyse complète doit rester sous 10 secondes.

### Christian

- Série NDVI de démonstration sur 12 mois, figée, rattachée à la parcelle de démo.
- Afficher la source de chaque bloc (SoilGrids, Open-Meteo, NASA POWER, série figée).

**Livrable :** écran 3 rempli pour la ferme de démo.  
**Critère :** pour un puits de 60 m et η = 0,5, l'API renvoie environ 0,33 kWh/m³.

---

## Sprint 6 — Que planter ?

**Créneau :** J1 soir. **Écran 4.** **Fichier :** `fixtures/sprint-06.json` (analyse déjà chiffrée, culture actuelle, 15 cultures, eau du puits). **Exigences :** F5.1, F5.3, F5.4 (M), F5.2 (S). Les cultures intercalaires sont une ligne du classement dans ce fichier.

### Balla Moussa

- Liste classée, avec pour chaque culture : DT/m³, m³/ha, kWh/ha, délai, label obtenu.
- Tris : revenu par m³ (défaut), consommation d'eau, rapidité d'entrée en production.
- Bandeau culture actuelle et écart avec la meilleure option.

### Nafissatou

- `GET /parcelles/{id}/recommandations?tri=`.
- Exclure toute culture incompatible avec le sol, le sel, la chaleur ou l'eau disponible.
- Calculer le revenu par m³, la pénalité de risque (puits trop juste, pluie incertaine) et le label prévisionnel.
- Le classement ne contient jamais une culture exclue.

### Christian

- Court texte « pourquoi cette culture », limité aux chiffres et aux hypothèses déjà présents dans le fichier du sprint (prix typique, efficience, η).
- Préparer deux tris de démo : le défaut, puis le tri par eau, pour le pitch.

**Livrable :** un classement réel, pas une liste en dur dans l'écran.  
**Critère :** changer le tri change l'ordre sans réintroduire une culture incompatible.

---

## Sprint 7 — Simulateur

**Créneau :** J1 soir. **Écran 5.** **Fichier :** `fixtures/sprint-07.json` (surface, capacité du puits, cultures proposées, situation actuelle). **Exigences :** F6.1 à F6.4 (M). Le plan adopté est enregistré dans ce sprint et la lettre de label s'affiche sur l'écran du simulateur.

### Balla Moussa

- Curseurs de répartition de la surface entre plusieurs cultures.
- Résultats en direct : revenu, eau, énergie, label, écart avec la situation actuelle.
- Alerte visible si la surface de la parcelle ou la capacité du puits est dépassée.
- Bouton « Adopter ce plan ».

### Nafissatou

- `POST /parcelles/{id}/simulation` : recalcul complet à chaque jeu de curseurs.
- `POST /parcelles/{id}/plan` : enregistre le plan dans les données de ce sprint.
- Refuser un plan dont la somme des hectares dépasse la parcelle, et signaler un besoin en eau supérieur au puits.

### Christian

- Bloc de comparaison « aujourd'hui / plan » : m³ économisés, kWh économisés, DT/m³, lettre de label.
- Vérifier le recalcul sur trois répartitions, dont une qui dépasse le puits.

**Livrable :** le simulateur suit les doigts et un plan peut être adopté.  
**Critère :** chaque mouvement de curseur met à jour revenu, eau, énergie et label, et un dépassement est impossible à ignorer.

---

## Sprint 8 — Accueil agriculteur, label et QR

**Créneau :** J2 matin. **Écrans 1 et 7.** **Fichier :** `fixtures/sprint-08.json` (plan chiffré, label actif, deux vérifications simulées, QR). **Exigences :** F11.1 et F11.4 (M), F11.2 et F11.3 simulés dans ce fichier.

### Balla Moussa

- Accueil : label actuel, label potentiel, bilan de saison, conseil du jour.
- Écran Label : note A–E, économies d'eau et d'énergie, état des vérifications, QR code.
- Le conseil du jour affiche, sur l'accueil, la meilleure culture et l'écart chiffré contenus dans le fichier.

### Nafissatou

- Calcul du label selon les seuils de la section 4.4, à partir du plan contenu dans le fichier du sprint.
- `GET /labels/{qr}` : fiche publique (note, ferme, produit, statut).
- Statuts prévus : actif, suspendu. En démo, le label de la ferme reste actif.

### Christian

- QR unique par ferme et par produit.
- Étiquette simple à montrer (nom, label, QR).
- Vérification satellite simulée : un résultat « culture conforme » et un résultat « irrigation conforme » déjà stockés pour la démo.

**Livrable :** l'accueil et le label lisent le plan du fichier, le QR de ce sprint s'ouvre.  
**Critère :** une culture à 2,2 DT/m³ ou plus, compatible, en irrigation localisée et conforme au plan, obtient A. Sous 0,8 DT/m³, elle obtient E.

---

## Sprint 9 — Assistant vocal

**Créneau :** J2 matin. **Écran 6.** **Fichier :** `fixtures/sprint-09.json` (parcelle, analyse, classement, plan, 20 questions darija et leurs réponses chiffrées, dont une question sur les cultures intercalaires). **Exigences :** F8.1 et F8.2 (M), F8.3 et F8.5 (S), F8.4 (C).

### Balla Moussa

- Écran de conversation : saisie écrite, bouton micro, bulles, lecture à voix haute.
- Traduction française affichée sous une réponse en darija ou en arabe.
- Actions proposées dans la conversation : une carte « simulateur » et une carte « pompe solaire », remplies avec les chiffres du fichier de ce sprint.

### Nafissatou

- `POST /assistant` : question texte ou audio, réponse texte et audio.
- Outils autorisés : uniquement les objets présents dans le fichier de ce sprint.
- Si la donnée n'existe pas, la réponse le dit. Pas de chiffre hors de la base.

### Christian

- Reconnaissance vocale et synthèse, avec un jeu de 20 questions types en darija.
- Réponses qui citent la parcelle de l'agriculteur (surface, puits, culture actuelle, meilleure option, écart).
- Une question hors sujet reçoit un refus clair, puis une proposition de question utile.
- Une des 20 questions porte sur les cultures intercalaires et répond avec le revenu du fichier.

**Livrable :** une question orale en darija reçoit des chiffres de la parcelle, lus à voix haute.  
**Critère :** sur les 20 questions types, aucune réponse ne contient un nombre absent des données Ardi.

---

## Sprint 10 — Parcours acheteur

**Créneau :** J2 matin. **Écrans 12, 13, 14 et 15.** **Fichier :** `fixtures/sprint-10.json` (produits labellisés, fiches publiques, QR, panier). **Exigences :** F13.1 à F13.3 (M), F13.4 simulé (S). La commande en gros est hors de ce sprint.

### Balla Moussa

- Dans ce sprint, l'application s'ouvre en profil acheteur, directement sur le marché.
- Composants d'interface de ce sprint : carte produit, pastille de label, boutons de 44 px.

### Nafissatou

- `GET /produits` avec filtres label, catégorie, région, alimenté par le fichier de ce sprint.
- `POST /commandes` et `PATCH /commandes/{id}`.
- Paiement simulé : D17, carte, paiement à la livraison. Aucune donnée de carte n'est stockée par Ardi.

### Christian

- Marché : liste filtrable des produits labellisés.
- Scanner : appareil photo via `expo-camera`, lecture du QR, ouverture de la fiche contenue dans le fichier de ce sprint.
- Fiche produit : label, impact eau et énergie, histoire de la ferme.
- Panier : quantités, impact de la commande, choix du moyen de paiement simulé.

**Livrable :** du marché au paiement simulé, et du QR à la bonne fiche.  
**Critère :** scanner le QR présent dans le fichier de ce sprint ouvre le produit correspondant.

---

## Sprint 11 — Ventes et notifications

**Créneau :** J2 matin. **Écrans 10 et 11.** **Fichier :** `fixtures/sprint-11.json` (ferme, label actif, produit, commande reçue, devis, quatre notifications). **Exigences :** F12.1, F12.2 (M), F12.3 et F12.4 (S), F10.1 (S). L'envoi SMS est hors de ce sprint.

### Balla Moussa

- Mes ventes : publier un produit (nom, prix, stock, photo), liste des commandes.
- Accepter une commande ou proposer un autre prix.
- Suivi : ventes et prix moyen comparé au marché.
- Écran Notifications : irrigation, pompage, commande, label. Une notification lue le reste.

### Nafissatou

- Publication d'un produit rattaché à la ferme et au label présents dans le fichier de ce sprint.
- Statuts de commande et contre-offre de prix.
- Prix moyen de l'agriculteur vs prix typique de la culture.
- Alertes du fichier (type, message, date, lue), lues par l'écran Notifications de ce sprint.

### Christian

- Écran de demande de devis, rempli par la demande présente dans le fichier.
- Les quatre notifications du fichier, une de chaque type, dans la langue de l'agriculteur.
- La notification « commande » ouvre le détail de cette commande sur l'écran Mes ventes de ce sprint.

**Livrable :** l'agriculteur publie, reçoit une commande de démo, la voit dans les notifications.  
**Critère :** accepter ou contre-proposer change le statut visible des deux côtés.

---

## Sprint 12 — Intégration, démo et pitch

**Créneau :** J2 après-midi. **Fichier :** `fixtures/sprint-12.json` (ferme, analyse, classement, plan, label, question darija, produit, QR, panier). **Exigences :** critères d'acceptation de la section 11, rejoués sur ce seul fichier.

### Balla Moussa

- Un écran « Démo » qui enchaîne huit cartes statiques lues dans le fichier : langue, parcelle, analyse, classement, simulateur, label, assistant, achat.
- Textes en darija, contrastes lisibles, cibles de 44 px, sur cet écran seulement.

### Nafissatou

- Dix parcelles dans le fichier : eau et énergie conformes aux formules des sections 4.1 et 4.2.
- Pour chacune, la liste des cultures exclues et le temps de calcul. Objectif : sous 10 secondes.

### Christian

- Vidéo de secours tournée sur l'écran Démo de ce sprint, sans réseau.
- Notes de pitch : eau, énergie, revenu par m³, label, vente. Une phrase par thème du hackathon.

**Livrable :** un pitch autonome et sa vidéo, alimentés par le seul fichier de ce sprint.  
**Critère :** les sept tests de la section 11 du cahier se vérifient dans `fixtures/sprint-12.json`, sans ouvrir un autre sprint.

### Scénario de démo

1. Choisir la darija et le profil agriculteur.
2. Ouvrir la parcelle (tracé ou jeu préchargé) : puits, débit, culture actuelle.
3. Lancer l'analyse : sol, climat, eau, kWh/m³.
4. Montrer le classement et l'écart avec la culture actuelle.
5. Bouger les curseurs, voir le dépassement, adopter un plan sobre.
6. Montrer le label et le QR.
7. Poser une question à voix haute. La réponse cite les chiffres de la parcelle.
8. Scanner le QR en profil acheteur et payer en simulé.

---

## Sprint 13 — Énergie et pompage solaire

**Après le hackathon.** **Écran 8.** **Fichier :** `fixtures/sprint-13.json` (profondeur, débit, ensoleillement, prix gasoil et STEG). **Exigences :** F7.1 à F7.3 (S). F7.4 aides (C), texte informatif dans ce fichier.

### Balla Moussa

- L'application s'ouvre directement sur l'écran Énergie.
- État vide si le fichier ne contient pas de profondeur de puits.

### Nafissatou

- `GET /parcelles/{id}/solaire`.
- Dimensionnement : puissance, nombre de panneaux, volume de réservoir, à partir du débit, de la hauteur et de l'ensoleillement NASA POWER.
- Coût annuel comparé au gasoil et au réseau STEG, et durée d'amortissement.

### Christian

- Écran : puissance, panneaux, réservoir, comparaison de coût, meilleures heures de pompage.
- Encadré aides disponibles, clairement informatif, sans promesse de dossier.
- Les heures de pompage suivent la production solaire prévue.

**Livrable :** pour la ferme de démo, un dimensionnement et un comparatif de coût.  
**Critère :** changer la profondeur du puits change la puissance proposée.

---

## Sprint 14 — Suivi satellite et alertes

**Après le hackathon.** **Écran 9.** **Fichier :** `fixtures/sprint-14.json` (zones, NDVI, humidité, plan d'eau, deux images, une alerte). **Exigences :** F3.3 (S), F9.1 à F9.4 (S).

### Balla Moussa

- Carte de la parcelle découpée en zones.
- Jauge d'eau consommée par rapport au plan écrit dans le fichier.
- Liste des alertes de la parcelle, avec lien vers le détail.

### Nafissatou

- `GET /parcelles/{id}/suivi`.
- Mise à jour végétation et humidité à chaque image exploitable (environ 5 jours), en tâche de fond.
- Alertes : stress hydrique, pluie prévue, irrigation non conforme au plan.
- NDVI Sentinel-2 sur 12 mois, stocké dans le fichier de ce sprint.

### Christian

- Règle de sanction : un écart n'est retenu qu'après deux images concordantes.
- Contestation : l'agriculteur joint une photo géolocalisée à une alerte.
- Texte d'alerte court, avec une version audio dans le fichier.

**Livrable :** la carte par zone et au moins une alerte réelle calculée, plus la contestation.  
**Critère :** une irrigation au-dessus du plan du fichier crée une alerte. Une seule image divergente reste « à confirmer ». Deux images concordantes passent l'alerte à « écart confirmé ».

---

## Sprint 15 — Impact et compte professionnel

**Après le hackathon.** **Écran 16.** **Fichier :** `fixtures/sprint-15.json` (achats, fermes, labels, une commande en gros). **Exigences :** F14.1 (S), F14.2 (C), F13.5 (C).

### Balla Moussa

- L'écran s'ouvre sur Mon impact, avec un interrupteur « compte professionnel » qui lit le rôle dans le fichier.

### Nafissatou

- Agrégats par acheteur : eau soutenue par les achats, nombre de fermes, part de produits label A.
- Commande en gros : quantités professionnelles, statut dédié, sans paiement réel dans ce sprint.
- Export des lignes nécessaires au rapport (achats, labels, fermes, eau, énergie).

### Christian

- Écran Mon impact, fidèle à la maquette 16.
- Rapport d'impact pour un professionnel (RSE), téléchargeable.
- Parcours de commande en gros à partir des produits du fichier de ce sprint.

**Livrable :** un acheteur voit l'eau et les fermes que ses achats soutiennent. Un pro télécharge son rapport.  
**Critère :** les totaux de l'écran 16 égalent la somme des commandes de ce compte.

---

## Sprint 16 — Hors-ligne, accessibilité, performance

**Après le hackathon.** **Fichier :** `fixtures/sprint-16.json` (une analyse, un classement, une parcelle à envoyer, une photo). **Exigences :** section 5, prouvées sur l'écran de ce sprint.

### Balla Moussa

- Écran unique qui affiche l'analyse et le classement du fichier hors ligne.
- File d'envoi : la parcelle du fichier part quand la connexion revient.
- Contrastes WCAG AA, cibles 44 px, textes courts et icônes sur cet écran.
- Vérification sur un Android 8.

### Nafissatou

- Cache des appels SoilGrids, Open-Meteo et NASA POWER.
- L'analyse du fichier, servie depuis le cache, répond en moins de 10 secondes.
- HTTPS partout. Consentement explicite avant d'enregistrer la localisation de la parcelle (loi organique n° 2004-63, information INPDP).

### Christian

- Compression de la photo du fichier avant envoi.
- Chaque chiffre de l'écran cite sa source et son hypothèse, écrites dans le fichier.
- Phrases darija courtes pour les blocs de cet écran.

**Livrable :** l'écran de ce sprint reste lisible en mode avion.  
**Critère :** une fois le fichier chargé, couper le réseau laisse l'analyse et le classement affichés.

---

## Sprint 17 — Profil, plusieurs parcelles, prix

**Après le hackathon.** **Fichier :** `fixtures/sprint-17.json` (profil, deux parcelles, un plan figé, un tableau de prix). **Exigences :** F1.4 (S), F2.6 (S), F4.3 (S).

### Balla Moussa

- Écran Réglages : nom, langue, préférences de notifications, lus dans le fichier.
- Liste de deux parcelles. La parcelle sélectionnée est indiquée sur cet écran.
- Un bloc de classement par parcelle, calculé avec les prix du fichier.

### Nafissatou

- Requêtes filtrées par propriétaire : un agriculteur ne lit pas les parcelles d'un autre.
- Mise à jour du prix d'une culture sans redéploiement, avec date et source.
- Recalcul du classement de la parcelle non figée quand le prix du fichier change. Le plan figé garde le prix enregistré avec lui.

### Christian

- Import d'un fichier de prix (ONAGRI ou marché de gros) : fourchette min / typique / max.
- Écran de contrôle interne, simple, réservé au rôle admin : liste des cultures et dernier prix.

**Livrable :** deux parcelles côte à côte, un prix du fichier qui change le classement de la parcelle non figée.  
**Critère :** le plan déjà adopté ne change pas de lettre de label uniquement parce que le prix du jour a bougé.

---

## Sprint 18 — Confiance du label et préparation du pilote

**Après le hackathon.** **Fichier :** `fixtures/sprint-18.json` (labels actif, en vérification, suspendu et contesté, deux images, file admin, seuils du pilote). **Exigences :** F11.2, F11.3, F11.5 (S), F15.1 à F15.3 (S), F15.4 (C). Le fichier décrit un pilote de 20 à 50 agriculteurs, par exemple à Sidi Bouzid. La certification d'État reste hors version 1.

### Balla Moussa

- États du label sur l'écran 7 : actif, en vérification, suspendu, contesté.
- Message clair quand le label est suspendu, et envoi d'une photo de contestation incluse dans ce sprint.

### Nafissatou

- Vérification culture : le profil NDVI de la saison est comparé à celui de la culture déclarée.
- Vérification irrigation : humidité et évapotranspiration réelle (FAO WaPOR) comparées au plan.
- Suspension après écarts répétés, confirmés sur deux images.
- Tableau d'impact global : eau, énergie, revenus, nombre de labels actifs, suspendus, contestés.
- Modération minimale : retirer un produit, désactiver un compte.

### Christian

- File admin : labels à vérifier, produits signalés, comptes à modérer.
- Dossier pilote : liste des données à calibrer (seuils A–E, efficience, η), sans les présenter comme définitifs.
- Parcours de contrôle terrain : ce que l'équipe vérifie à la main tant que la visite n'est pas dans l'application.

**Livrable :** un écart confirmé deux fois suspend le label, l'agriculteur le voit, un admin peut le suivre.  
**Critère :** la fiche publique `GET /labels/{qr}` ne montre plus un label A suspendu.

---

## Répartition de la charge

| Personne | Sprints où elle porte l'écran | Fil conducteur |
| --- | --- | --- |
| Balla Moussa | 2, 4, 5, 6, 7, 8, 11, 14 | Parcours agriculteur, de la langue jusqu'au suivi |
| Nafissatou | Tous, côté API | Dans chaque sprint, la route se teste avec le fichier de ce sprint |
| Christian | 9, 10, 13, 15, 18 | Voix, acheteur, solaire, impact, admin |

Les sprints 1, 3, 12, 16 et 17 sont mixtes : les trois livrent une partie du même objectif, chacun à partir du fichier de ce sprint.

## Hors de ces 18 sprints

Le cahier des charges les laisse hors de la version 1, ou les réserve à l'après-pilote. Ils ne rentrent pas dans les sprints.

- Pilotage automatique de pompes ou de vannes, et tout matériel IoT.
- Diagnostic des maladies des plantes.
- Livraison : elle reste chez un partenaire.
- Label reconnu par l'État. Le label Ardi est une marque privée.
- Paiement réel (prestataire uniquement, Ardi ne stocke pas les cartes) et envoi SMS ou WhatsApp pour les téléphones trop anciens.
- Analyse d'une photo de sol par un modèle de vision.
- Extension au-delà du gouvernorat pilote, tableaux de bord pour le ministère, les GDA et les banques.

