# Vantage — app iOS

Application iOS privée de veille VC HealthTech pour un futur analyste. App **entièrement
native**, à onglets, construite d'après les maquettes « Vantage App iOS » (Claude Design),
dans l'esprit éditorial FT/Bloomberg (papier ivoire, encre, accent pétrole,
« CHRONICLE » en bleu).

## Stack

- **React Native + Expo** (SDK 54, compatible Expo Go), **TypeScript**
- Navigation **expo-router** (onglets, `expo-router/js-tabs`)
- `expo-web-browser` (liens d'articles → Safari)
- `@react-native-async-storage/async-storage` (favoris + cache de l'édition)
- `react-native-svg` (icônes d'onglets), `expo-blur` (barre d'onglets givrée)
- Polices : Source Serif 4 · Archivo · IBM Plex Mono (`@expo-google-fonts/*`)

## Les onglets

Trois onglets natifs, dans une **barre flottante en pilule** (traitement « 1c » des
maquettes), onglet actif surligné en pétrole. Les onglets de la phase 2 s'ajouteront ici
sans effort.

| Onglet | Fichier | Détails |
| --- | --- | --- |
| **Journal** | `app/(tabs)/index.tsx` | La « une » : nameplate VANTAGE CHRONICLE, **ticker défilant** (↑ levée / ⇄ M&A), article à la une (★ favori + titre cliquable), carte « deal du jour », Brèves Europe + International (★ + résumé). Titres → Safari. Pull-to-refresh recharge l'édition. |
| **Favoris** | `app/(tabs)/favoris.tsx` | Une carte par startup suivie (★, secteur, stade + actus cliquables). Bouton `＋` → feuille « Ajouter un favori » avec **recherche en direct** et bascule Suivre / Suivi ✓. Filtres par secteur. État persisté. |
| **Mot du jour** | `app/(tabs)/mot-du-jour.tsx` | Fiche plein écran du terme du jour (ADC) : hero, anatomie, mécanisme, « pourquoi c'est en vogue », M&A récentes. |

## Le contenu quotidien (comment l'app se met à jour)

L'app ne lit pas dans une conversation Claude. Le contenu du jour vit dans **un seul
fichier JSON** hébergé à une URL fixe. Chaque matin, une tâche Claude génère ce fichier ;
l'app le télécharge au lancement et au pull-to-refresh, puis remplit ses écrans natifs.

- **Contrat de données** : `src/content/types.ts` (type `Edition`). Un exemple complet
  et valide est fourni : **`daily-content/example-edition.json`** — c'est le gabarit que
  la génération matinale reproduit chaque jour.
- **URL** : `src/config.ts` → `config.contentUrl`
  (ex. `https://<user>.github.io/<repo>/edition.json`).
- **Règles de génération** (choix du mot du jour, anti-répétition, etc.) :
  **`daily-content/GENERATION.md`**, avec sa mémoire `daily-content/recent-words.json`.
- **Robustesse** (jamais d'écran vide) : l'app utilise, dans l'ordre,
  1. l'édition **fraîchement téléchargée**, sinon
  2. la **dernière édition en cache** (fonctionne hors-ligne), sinon
  3. l'**édition d'exemple** intégrée à l'app (`src/content/sampleEdition.ts`).

> Mise en place : publier `edition.json` sur GitHub Pages (dépôt de contenu), renseigner
> son URL dans `config.ts`. Au début, on remplace le fichier à la main chaque matin ;
> l'automatisation (tâche planifiée) viendra ensuite. Ajouter `noindex` si le dépôt est
> public. Voir `../project/uploads/CLAUDE.md`.

Les **favoris** sont propres à l'utilisateur (stockés sur le téléphone), donc hors de
l'édition quotidienne ; le catalogue de startups suggérées est dans `src/data/favoris.ts`.

## Lancer le projet

Développement sous Windows/Linux, **sans Mac** (comme spécifié au brief) :

```bash
cd vantage
npm install
npx expo start        # puis scanner le QR code avec Expo Go sur iPhone
```

Build iOS distribuable via **EAS Build** (cloud) : `npx eas build -p ios`.

Vérifications rapides :

```bash
npm run typecheck                       # tsc --noEmit
npx expo export --platform ios          # bundle Hermes (smoke test hors-ligne)
```

## Arborescence

```
app/
  _layout.tsx              Providers (SafeArea, Edition, Favoris), fonts, Stack racine
  (tabs)/
    _layout.tsx            Navigateur d'onglets + barre flottante
    index.tsx              Journal (natif)
    favoris.tsx            Favoris (natif) + feuille d'ajout
    mot-du-jour.tsx        Mot du jour (natif)
src/
  theme.ts                 Palette & tokens (couleurs, bordures, verre)
  fonts.ts                 Chargement des polices + alias sémantiques
  config.ts                URL du contenu quotidien (edition.json)
  content/
    types.ts               Contrat de données « Edition » (+ garde runtime)
    sampleEdition.ts        Édition d'exemple intégrée (fallback)
    EditionProvider.tsx     Récupère / met en cache / diffuse l'édition
  components/
    FloatingTabBar.tsx     Barre d'onglets pilule givrée
    TabIcon.tsx            Icônes SVG (Journal / Favoris / Mot du jour)
    Ticker.tsx             Bandeau défilant (marquee)
  state/
    favorites.tsx          Contexte favoris (persisté via AsyncStorage)
  data/
    favoris.ts             Catalogue de startups + favoris initiaux
daily-content/             Le « circuit » du contenu quotidien (à héberger)
  example-edition.json     Gabarit du fichier edition.json
  recent-words.json        Mémoire des mots du jour récents (anti-répétition)
  GENERATION.md            Règles de génération (choix du mot du jour, no-repeat)
```

## Phase 2 (plus tard)

Deal-tracker / contacts : ajouter de nouveaux `Tabs.Screen` dans `app/(tabs)/_layout.tsx`
et une entrée dans `TABS` de `FloatingTabBar.tsx`. Voir `../project/uploads/CLAUDE.md`.
