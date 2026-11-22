# Ardi Mobile — Sprint 1

## Lancer

```bash
cd mobile
npm install
npx expo start
```

L'application ouvre l'écran de bienvenue, avec darija, arabe RTL et français.
Le bouton ouvre la ferme de démonstration chargée depuis
`../fixtures/sprint-01.json`.

## Sprint 2

L'écran de bienvenue propose le français, l'arabe RTL, la darija et les trois
profils du fichier `../fixtures/sprint-02.json`. La langue et le profil sont
sauvegardés avec AsyncStorage.

## Sprint 4

L'écran Ouvre directement la parcelle prétracée du Sprint 4 sur une carte
`react-native-maps`. Le bouton du jeu préchargé restaure le polygone, puis
les champs eau, puits, culture et énergie peuvent être enregistrés hors ligne.
