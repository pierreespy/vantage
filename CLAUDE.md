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

## L'équipe d'agents (`.claude/agents/`)

Sous-agents spécialisés, à lancer via le tool Agent selon la tâche :

- **Contenu** — `margaux-fact-check` (lecture seule + web) : fact-checke un
  `edition.json`, verdict PUBLIER par défaut, ne bloque que sur l'invérifiable ;
  `leo-correction` (read/write) : applique les corrections relevées par Margaux.
- **Amélioration de l'existant** — `camille-ergonomie` (lecture seule) : audite un
  onglet existant et propose des améliorations UX priorisées.
- **Innovation** — `victor-innovation` (lecture seule) : fiches concept pour de
  nouveaux onglets/options (Phase 2 et au-delà).
- **Construction & revue** — `sofia-ecrans` (read/write) : implémente écrans et
  onglets dans les conventions maison ; `eleonore-da` (lecture seule) : audite tout
  diff UI contre la DA journal papier ; `karim-rn-expo` (lecture seule) : revue
  technique RN/Expo du diff (providers, hydratation, triplet de navigation).

Flux type : Camille/Victor proposent → Pierre arbitre → Sofia construit →
Éléonore + Karim relisent (→ Margaux/Léo pour tout ce qui touche l'édition).
