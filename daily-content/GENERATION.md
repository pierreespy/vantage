# Génération du contenu quotidien — la « règle du jeu »

Ce dossier décrit **comment est fabriquée l'édition du jour** que l'app télécharge.
Chaque matin, une tâche Claude produit **trois fichiers**, déposés à l'URL de contenu
(`config.contentUrl` côté app) :

- **`edition.json`** — le contenu affiché par l'app (voir `example-edition.json` pour le
  gabarit exact ; le format est défini par le type `Edition` dans `src/content/types.ts`).
- **`recent-words.json`** — la **mémoire** des mots du jour récents, pour ne pas se répéter.
- **`startup-news.json`** — les **nouvelles par startup** qui alimentent l'onglet Favoris
  (voir `example-startup-news.json` pour le gabarit ; contrat figé dans
  `docs/perso-favoris.md`). Réutilise la forme `NewsItem` `{ title, source, date, url }`
  de `src/data/favoris.ts`.

> Tant que l'automatisation n'est pas branchée, ces fichiers se remplacent à la main.
> La tâche du matin, elle, suit la procédure ci-dessous à la lettre.

---

## Le « Mot du jour » — critères de choix

Le mot du jour doit être **un terme HealthTech / MedTech / Biotech que Pierre peut
réellement croiser** en travaillant dans le VC santé (pitch de startup, mémo
d'investissement, due diligence, actu de deal). Règles, dans l'ordre :

1. **Domaine** — strictement HealthTech / MedTech / Biotech : un terme **scientifique,
   technologique, clinique, réglementaire ou business** propre au secteur. Pas de jargon
   VC généraliste hors-santé (le « term sheet » ou la « dilution » ne comptent pas ici).
2. **Pertinence VC santé** — privilégier ce qui aide à **comprendre pourquoi une boîte
   lève des fonds ou se fait racheter** : une technologie en vogue, une modalité
   thérapeutique, un concept-clé de thèse d'investissement, ou un terme réglementaire
   structurant.
3. **Bon niveau** — ni trop basique (déjà connu de tous, ex. « vaccin »), ni trop pointu
   ou anecdotique. Vise le terme « utile à maîtriser » pour un futur analyste.
4. **PAS DE RÉPÉTITION** — ne jamais choisir un terme présent dans `recent-words.json`
   (fenêtre des ~30 derniers jours). C'est la règle non négociable.
5. **Variété** — faire tourner les familles d'un jour à l'autre, ne pas enchaîner deux
   fois la même catégorie :
   - **Modalités thérapeutiques** — ADC, CAR-T, ARNm, siRNA, PROTAC, thérapie génique
     AAV, bispécifiques, cellules NK allogéniques…
   - **Plateformes / technos** — CRISPR & base editing, organoïdes, biologie de synthèse,
     IA de découverte de médicaments, protein design…
   - **Diagnostic / data** — biopsie liquide, diagnostic compagnon, biomarqueur,
     real-world evidence, imagerie augmentée par IA…
   - **Réglementaire / accès au marché** — marquage CE-MDR, 510(k) / PMA (FDA),
     désignation orpheline, DTx / SaMD (logiciel dispositif médical), remboursement (HAS)…
   - **Business santé** — désignation Breakthrough, exclusivité des données, deals à
     milestones & royalties, licensing…

   > Ces exemples ne sont qu'une amorce, pas une liste fermée — tout terme respectant
   > les règles 1–4 convient.

---

## La procédure du matin (pas à pas)

1. **Lire `recent-words.json`** → récupérer la liste des termes déjà utilisés récemment.
2. **Choisir un nouveau terme** respectant les règles 1–5 ci-dessus, **absent** de cette
   liste.
3. **Rédiger le bloc `word`** (mêmes champs que le gabarit) :
   `term`, `full`, `fr`, `field`, `definition` (vulgarisée, une phrase claire),
   `parts` (3 briques : label + rôle), `how` (3 étapes du mécanisme),
   `why` (pourquoi c'est en vogue, angle VC), `deals` (M&A/levées de référence, avec
   `year`).
4. **Générer le reste de l'édition** (`dateLong`, `ticker`, `lead`, `deal`,
   `brefsEurope`, `brefsIntl`) — **règle éditoriale permanente : noms précis** (société,
   montant, investisseur en lead), jamais de descriptions vagues.
   - **Champ `stage`** (optionnel) sur `lead` et chaque brève : le round de l'opération
     (`"Pre-seed"`, `"Seed"`, `"Series A"`, `"Series B"`, `"Series C"`, `"Growth"`,
     `"IPO"`…). L'app **mémorise** ce stade par société et l'affiche sur la carte Favoris.
     Ainsi le stade reste **dynamique et exact** (mis à jour à chaque nouvelle levée),
     plutôt que gravé en dur. À remplir dès que le round est connu.
5. **Router les news par startup dans `startup-news.json`** (voir la section
   « Favoris » ci-dessous pour le détail du fan-in et de la longue traîne).
6. **Écrire les trois fichiers** :
   - `edition.json` (l'édition du jour) ;
   - `recent-words.json` **mis à jour** : ajouter `{ "term", "full", "date" }` (date du
     jour au format `AAAA-MM-JJ`) **en tête** de `recent`, puis **tronquer aux ~30 plus
     récents** ;
   - `startup-news.json` (nouvelles par startup, gabarit ci-dessous).

---

## L'onglet Favoris — `startup-news.json`

L'onglet Favoris affiche, pour chaque startup suivie par l'utilisateur, ses **nouvelles
récentes**. Le contenu est **mutualisé** (par startup, jamais par utilisateur) : on génère
une fois, et l'app filtre localement selon les favoris on-device. Le contrat de données
est figé dans **`docs/perso-favoris.md`** ; le gabarit exact est
`example-startup-news.json`.

### Schéma (rappel du contrat)

```jsonc
{
  "generatedAt": "2026-07-09",            // date ISO AAAA-MM-JJ (fraîcheur affichée)
  "news": {
    // clé = nom EXACT de la startup, casse identique à src/data/startups.ts
    "Owkin": [
      { "title": "…", "source": "…", "date": "Hier", "url": "https://…" }
    ]
  }
}
```

- **Clés = noms de startups**, casse **strictement identique** à `src/data/startups.ts`
  (le review vérifie cette cohérence — une clé mal cassée n'est jamais affichée).
- **`NewsItem` = `{ title, source, date, url }`** — mêmes 4 champs que le type existant,
  URL en https, lien direct.
- Une startup **sans news du jour est absente** du dictionnaire — **jamais de tableau
  vide**.

### Étape 1 — Fan-in (sous-produit gratuit du Journal)

Le balayage HealthTech/MedTech/Biotech du matin (celui qui construit `edition.json`)
**est déjà fait** : réutilise-le. Pour **chaque item** du flux du jour (ticker, lead,
deal, `brefsEurope`, `brefsIntl`), **tague-le par société** et, si le nom correspond à une
startup du catalogue, **route-le** dans `news["<nom exact>"]`. Coût marginal quasi nul :
une startup qui « s'allume » dans la couverture du jour alimente les Favoris gratuitement.

- Normalise le nom vers la casse exacte de `src/data/startups.ts` avant d'écrire la clé.
- Un même événement peut nourrir à la fois `edition.json` et `startup-news.json` — c'est
  voulu.

### Étape 2 — Longue traîne (recherche ciblée, basse fréquence)

Pour les startups suivies qui **ne tombent pas** dans le flux du jour, fais une **recherche
web ciblée**, mais **uniquement** sur l'**union suivie** (la watchlist), **jamais** sur les
~370 startups du catalogue.

- **Lire l'union suivie depuis le backend** : un fichier/endpoint fourni par
  `vantage-backend` qui liste **l'union dédupliquée des startups réellement suivies** par
  les utilisateurs (favoris remontés anonymement, entrées non expirées à 30 j). Décrit
  génériquement ici car la plateforme reste à trancher (voir `docs/perso-favoris.md`) :
  attends-toi à une liste plate de noms de startups (casse catalogue).
- **Basse fréquence** : inutile de re-chercher chaque startup de l'union tous les jours ;
  faire tourner (rotation / cadence hebdomadaire) suffit pour la traîne. Le fan-in couvre
  déjà l'actualité chaude.
- Cette étape **ajoute** des entrées à `news`, sans écraser celles du fan-in.

### Règle éditoriale — noms précis (s'applique aussi aux Favoris)

Comme pour le Journal : **noms précis** dans chaque `title` — **société, montant,
investisseur en lead**. Jamais de description vague (« lève un tour de financement » →
« lève 260 M$ en Series B menée par Lightspeed et General Catalyst »). Sociétés, montants,
investisseurs, dates et URLs doivent être **réels et vérifiés**, rien d'inventé.

---

## Pourquoi une mémoire séparée ?

L'app n'a pas besoin de connaître l'historique des mots (elle n'affiche que celui du
jour). C'est **la génération** qui en a besoin, pour ne pas se répéter. On garde donc
cette mémoire dans son propre fichier, à côté de `edition.json`, plutôt que de la mêler
au contenu affiché.
