# Vantage — mémoire projet (Claude Code)

App iOS Expo (React Native + TypeScript + expo-router). Coquille à onglets d'après les
maquettes Claude Design « Vantage App iOS ». Voir **`README.md`** pour le détail complet.

## À savoir avant d'éditer

- App **entièrement native**. **3 onglets** dans une barre flottante en pilule
  (`src/components/FloatingTabBar.tsx`) :
  - `Journal` (`app/(tabs)/index.tsx`), `Favoris` (`app/(tabs)/favoris.tsx`),
    `Mot du jour` (`app/(tabs)/mot-du-jour.tsx`).
- **Contenu quotidien** : le Journal et le Mot du jour lisent l'objet `Edition`
  (`src/content/types.ts`) fourni par `EditionProvider` (`src/content/EditionProvider.tsx`),
  qui télécharge `config.contentUrl` (JSON), met en cache, et retombe sur
  `sampleEdition` si indisponible. Gabarit + règles dans **`daily-content/`**
  (`example-edition.json`, `recent-words.json`, `GENERATION.md`).
  Ne pas remettre de contenu de veille en dur dans les écrans — passer par l'`Edition`.
- **Mot du jour** : le choix se fait à la génération (voir `daily-content/GENERATION.md`) :
  terme HealthTech/MedTech/Biotech utile en VC santé, **jamais un terme présent dans
  `recent-words.json`** (mémoire des ~30 derniers jours, mise à jour chaque matin).
- **Design tokens** : toujours passer par `src/theme.ts` (couleurs/bordures) et
  `src/fonts.ts` (alias de polices `fonts.serifBold`, `fonts.mono`, …). Ne pas coder
  les couleurs/polices en dur dans les écrans.
- **Favoris** = état partagé et persisté via `src/state/favorites.tsx` (AsyncStorage) ;
  catalogue de startups dans `src/data/favoris.ts` (propre à l'utilisateur, hors édition).
  Le répertoire recherchable s'enrichit tout seul : toute société du Journal absente du
  catalogue est mémorisée par `EditionProvider` (`discoveredStartups`, persisté) et
  fusionnée dans « Ajouter un favori » — jamais suivie d'office. Les brèves de secteur
  `Fonds`/`Réglementaire` (investisseurs, régulateurs) sont exclues de cette découverte.
- **Ops / « boîte aux lettres » hors de ce dépôt** : les routines quotidiennes
  (Journal + Favoris news), le code d'accès du jour et le backend de remontée anonyme
  (Firestore : `firestore.rules`, `union.mjs`, `routine/`) vivent dans le dépôt
  **`vantage-content`** (`DAILY_PROMPT.md`, `backend/routine/CCR_ROUTINE.md`, `gen-access.mjs`).
  Ce dépôt-ci ne change que pour les vraies MàJ logicielles.

## Vérifier

```bash
npm run typecheck                 # tsc --noEmit — doit passer
npx expo export --platform ios    # doit bundler sans erreur
```

## Conventions

- Palette FT/Bloomberg : papier `#F9EFE3`, encre `#22201D`, accent pétrole `#0B4F6C`,
  claret `#8A2B2B`. « CHRONICLE » en pétrole.
- Règle éditoriale permanente : dans les brèves/actus, **noms précis** (société, montant,
  investisseur lead), jamais de descriptions vagues.
- Phase 2 (deal-tracker/contacts) : ajouter des `Tabs.Screen` + une entrée `TABS`.
