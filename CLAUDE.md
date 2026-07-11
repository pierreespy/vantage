# Vantage Chronicle — mémoire projet (Claude Code)

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
  Le rendu de l'explication est factorisé dans `src/components/WordView.tsx`, partagé par
  l'onglet Mot du jour et le détail du Glossaire.
- **Glossaire** : lexique cherchable de **tous** les mots du jour passés (avec explication
  complète), ouvert via un bouton dans l'en-tête de l'onglet Mot du jour
  (`GlossaireModal`). Les données viennent de `config.wordsUrl` (`words.json`) via
  `GlossaryProvider` (fetch + cache + graine) ; le mot du jour courant est fusionné en tête
  pour apparaître avant même que la routine ne l'ajoute. Côté `vantage-content` :
  `remember-word.mjs` accumule le `word` complet dans `words.json` (dédup par terme, **sans
  rétention**) — distinct de `recent-words.json` (anti-répétition, 30 j).
- **Design tokens** : toujours passer par `src/theme.ts` (couleurs/bordures) et
  `src/fonts.ts` (alias de polices `fonts.serifBold`, `fonts.mono`, …). Ne pas coder
  les couleurs/polices en dur dans les écrans.
- **Favoris** = état partagé et persisté via `src/state/favorites.tsx` (AsyncStorage) ;
  catalogue de startups dans `src/data/favoris.ts` (propre à l'utilisateur, hors édition).
  Le répertoire recherchable s'enrichit tout seul : toute société du Journal absente du
  catalogue est mémorisée par `EditionProvider` (`discoveredStartups`, persisté) avec son
  **secteur et sa série**, puis fusionnée dans « Ajouter un favori » — jamais suivie
  d'office. Les brèves de secteur `Fonds`/`Réglementaire` (investisseurs, régulateurs) sont
  exclues. Le secteur du lead/deal vient de leur champ `sector` (`Lead`/`Deal` dans
  `types.ts`), le kicker ne servant qu'à l'affichage.
- **Badge « IA »** : `useEdition().usesAI(name)` (dans `EditionProvider`) combine la liste
  curée `src/data/aiStartups.ts` et les sociétés qu'une édition marque `ai: true`
  (accumulées + persistées). Affiché dans le Journal (`app/(tabs)/index.tsx`) et sur les
  cartes Favoris (`app/(tabs)/favoris.tsx`). Badge en claret pour le distinguer des
  badges secteur (texte accent) et série (fond encre).
- **Notification du matin** : **une notif locale générique/jour à 7h30**, programmée
  par le téléphone lui-même (`expo-notifications`, trigger `DAILY`) — **aucun backend**,
  aucun token, aucun serveur. Texte fixe (« l'édition du jour est en ligne ») : une notif
  locale ne peut pas citer la une du jour (contenu écrit la nuit côté serveur). Côté app :
  `NotificationsProvider` (`src/state/notifications.tsx`) demande la permission **après la
  1re lecture** (via `noteRead()`, appelé à l'ouverture d'un article dans le Journal),
  pré-amorcée par `NotifPrimerModal` (calqué sur `FavSyncConsentModal`). Passer à une notif
  qui nomme la une demanderait un push serveur (registre de tokens + envoi 7h30).
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
