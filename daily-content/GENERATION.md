# Génération du contenu quotidien — la « règle du jeu »

Ce dossier décrit **comment est fabriquée l'édition du jour** que l'app télécharge.
Chaque matin, la tâche Claude « édition » produit **deux fichiers**, déposés à l'URL de
contenu (`config.contentUrl` côté app) :

- **`edition.json`** — le contenu affiché par l'app (voir `example-edition.json` pour le
  gabarit exact ; le format est défini par le type `Edition` dans `src/content/types.ts`).
- **`recent-words.json`** — la **mémoire** des mots du jour récents, pour ne pas se répéter.

Un **troisième fichier**, `startup-news.json` (nouvelles par startup pour l'onglet
Favoris), **n'est PAS produit par la tâche du matin** : il est maintenu par une **routine
automatisée** (cron **un matin sur deux**, côté backend) qui lit l'union suivie, recherche
du neuf par startup et applique la rétention. Ses **règles éditoriales** sont documentées
plus bas (section « L'onglet Favoris ») car son étape LLM les suit ; le contrat de données
et la mécanique de la routine sont figés dans **`docs/perso-favoris.md`**. Gabarit :
`example-startup-news.json`.

> Tant que l'automatisation n'est pas branchée, `edition.json` et `recent-words.json` se
> remplacent à la main. La tâche du matin, elle, suit la procédure ci-dessous à la lettre.

---

## La ligne éditoriale — veille MedTech européenne

Vantage Chronicle suit **l'écosystème MedTech européen** dans son ensemble : dispositifs
médicaux, implants, robotique chirurgicale, neurotech, diagnostic & imagerie, logiciels
dispositifs médicaux / IA médicale, biomatériaux, santé numérique. **La finance est un bras
parmi d'autres** : l'édition raconte d'abord ce qui **avance**. Chaque brève est rangée dans
une des **quatre rubriques** (`pillar`, voir `src/content/pillars.ts`), affichées dans cet
ordre dans le Journal :

| `pillar` | Rubrique | Exemples |
| --- | --- | --- |
| `innovation` | Tech & clinique | première mondiale, premier patient implanté, résultats d'essai, publication, brevet clé, partenariat industriel/hospitalier |
| `marche` | Réglementaire & marché | marquage CE / MDR / IVDR, FDA (510(k), De Novo, Breakthrough), remboursement (HAS, PECAN, DiGA, NICE), déploiement hospitalier, dirigeant clé |
| `naissances` | Nouvelles pousses | création, spin-off de labo, lauréat i-Lab / EIC, entrée en incubateur |
| `financement` | Financement | levées, M&A, IPO |

Sans `pillar`, l'app déduit la rubrique du `signalType` (et range en `financement` une
brève qui n'a ni l'un ni l'autre, comme les anciennes éditions).

- **Équilibre** : au plus ~1/3 des brèves en `financement` ; au moins 3 rubriques couvertes.
- **La une** (`lead`) privilégie une avancée tech/clinique/réglementaire ou une naissance.
- **L'avancée du jour** (`milestone`) décrypte l'étape franchie la plus parlante
  (`milestone` = libellé court du badge, `summary` = le fait, `why` = pourquoi ça compte).
- **Le deal du jour** (`deal`) est **optionnel** : on l'omet un jour calme côté argent.
- **Ticker** : genres mélangés — `tech` (◆), `reg` (✓), `new` (✦), `lev` (↑), `mna` (⇄) ;
  `amount` porte la valeur courte (« 1er patient », « CE », « Spin-off », « €24M »).
- **Périmètre** : le médicament pur (biotech/pharma) est hors champ, sauf
  combinaison dispositif-médicament ou diagnostic compagnon. **Europe d'abord** ; hors
  Europe (`brefsIntl`, 1 à 3) seulement pour ce qui pèse sur la MedTech européenne.

---

## Le « Mot du jour » — critères de choix

Le mot du jour doit être **un terme MedTech que Pierre peut réellement croiser** en
suivant l'écosystème (annonce de startup, essai clinique, décision réglementaire, pitch,
mémo d'investissement). Règles, dans l'ordre :

1. **Domaine** — MedTech (et santé numérique) : un terme **technologique, clinique,
   réglementaire ou d'accès au marché** propre aux dispositifs médicaux. Pas de jargon
   VC généraliste (le « term sheet » ou la « dilution » ne comptent pas ici), et pas de
   modalité purement médicamenteuse.
2. **Pertinence** — privilégier ce qui aide à **comprendre une avancée ou la trajectoire
   d'une startup MedTech** : une technologie en vogue, un concept clinique, une étape
   réglementaire structurante, un mécanisme d'accès au marché.
3. **Bon niveau** — ni trop basique (déjà connu de tous, ex. « vaccin »), ni trop pointu
   ou anecdotique. Vise le terme « utile à maîtriser » pour un futur analyste.
4. **PAS DE RÉPÉTITION** — ne jamais choisir un terme présent dans `recent-words.json`
   (fenêtre des ~30 derniers jours). C'est la règle non négociable.
5. **Variété** — faire tourner les familles d'un jour à l'autre, ne pas enchaîner deux
   fois la même catégorie :
   - **Dispositifs & implants** — neurostimulation en boucle fermée, BCI, valve
     transcathéter (TAVI), stent résorbable, pancréas artificiel, cochléaire…
   - **Chirurgie & robotique** — robot chirurgical, navigation peropératoire, chirurgie
     guidée par l'image, jumeau numérique…
   - **Diagnostic & imagerie** — échographie de poche, IRM bas champ, biopsie liquide,
     point-of-care, imagerie augmentée par IA, IVD…
   - **Matériaux & fabrication** — impression 3D d'implants, hydrogels, électronique
     souple, biomatériaux résorbables…
   - **Réglementaire / accès au marché** — classes de dispositifs, IVDR, 510(k) / De Novo /
     PMA, Breakthrough Device, PECAN / forfait innovation, DiGA, SaMD, investigation
     clinique, évaluation clinique…

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
   `why` (pourquoi c'est en vogue, angle VC), `startups` (3-4 **startups réelles et
   actuelles** qui utilisent la techno/le process du jour : `name` + `use` (une ligne) +
   `place` optionnel. Noms précis et vérifiés, Europe d'abord).
   **Vérification obligatoire par recherche web, à chaque édition** : chaque startup existe,
   utilise vraiment la techno, et est **encore indépendante** (si rachetée par une pharma —
   Tubulis→Gilead, Mersana→Day One, Myricx→Novartis… — la remplacer). Le `use` = un fait vérifié.
   **`sources` (obligatoire, 2 à 4)** : les pages **réellement consultées** pendant la
   recherche web pour rédiger la définition, le mécanisme et le `why` — chacune
   `{ "publisher", "title", "url" }` (URL directe et fonctionnelle : autorité — FDA, EMA,
   HAS —, publication scientifique, média spécialisé, site de la société). **Aucune
   affirmation sans source** : si un fait ne peut pas être sourcé, le retirer. Ne jamais
   inventer une URL. L'app les affiche dans un bloc « Sources » cliquable en bas du Mot du
   jour (et du Glossaire).
4. **Générer le reste de l'édition** (`dateLong`, `ticker`, `lead`, `milestone`, `deal`
   optionnel, `brefsEurope`, `brefsIntl`) selon la **ligne éditoriale** ci-dessus — **règle
   éditoriale permanente : noms précis** (société, techno, indication, chiffres, autorité ;
   pour la finance montant + investisseur en lead), jamais de descriptions vagues.
   - **Champ `pillar`** sur `lead` et chaque brève : `innovation` / `marche` /
     `naissances` / `financement`. Avec `signalType` quand il s'applique.
   - **Champ `stage`** (optionnel) sur `lead` et chaque brève : le round de l'opération
     (`"Pre-seed"`, `"Seed"`, `"Series A"`, `"Series B"`, `"Series C"`, `"Growth"`,
     `"IPO"`…). L'app **mémorise** ce stade par société et l'affiche sur la carte Favoris.
     Ainsi le stade reste **dynamique et exact** (mis à jour à chaque nouvelle levée),
     plutôt que gravé en dur. À remplir dès que le round est connu. Pour le `deal`, le
     round vit dans le champ `round` (déjà obligatoire) — pas de `stage` séparé.
   - **Champ `sector`** : sur chaque **brève** (déjà présent) **et** désormais sur `lead`
     `milestone` et `deal` (optionnel) — `"MedTech"`, `"Neurotech"`, `"Imagerie"`,
     `"Diagnostics"`, `"Robotique chirurgicale"`, `"Biomatériaux"`, `"Digital Health"`… Le `lead` ne l'affiche pas (le `kicker` porte déjà le
     secteur) mais l'app l'utilise pour la découverte ci-dessous. À remplir.
   - **Champ `ai`** (optionnel, `lead` / `deal` / brèves) : mets `true` quand le **cœur du
     produit** de l'entreprise est piloté par l'IA/ML (découverte de médicaments par IA,
     imagerie médicale IA, copilote clinique… ex. Bioptimus, Aqemia, Owkin, Abridge).
     L'app affiche alors un badge **« IA »** dans le Journal et sur la carte Favoris, et
     mémorise l'info (le badge reste même quand l'entreprise quitte l'actu). Rester
     **conservateur** : un badge IA à tort est pire qu'un badge manquant.
   - **Découverte automatique de startups** : l'app **enregistre tout seul** dans son
     répertoire toute `company` de l'édition (`lead`, `deal`, brèves) qu'elle ne connaît pas
     encore — avec son **secteur** et sa **série** — pour la rendre recherchable/suivable dans
     « Ajouter un favori » (jamais suivie d'office). Pour ne pas y faire entrer un
     **investisseur ou un régulateur** (brève sur le nouveau véhicule d'un fonds, décision
     réglementaire), donne à ces brèves un `sector` honnête (`"Fonds"`, `"Réglementaire"`)
     plutôt qu'un secteur de startup : l'app exclut ces catégories. `lead` et `deal` sont
     toujours considérés comme la startup vedette du jour — renseigne donc bien leur `sector`.
5. **Écrire les deux fichiers** :
   - `edition.json` (l'édition du jour) ;
   - `recent-words.json` **mis à jour** : ajouter `{ "term", "full", "date" }` (date du
     jour au format `AAAA-MM-JJ`) **en tête** de `recent`, puis **tronquer aux ~30 plus
     récents**.

   > `startup-news.json` **ne fait pas partie** de cette tâche : il est maintenu par la
   > routine « news » (un matin sur deux) décrite dans la section « L'onglet Favoris » et
   > dans `docs/perso-favoris.md`.

---

## L'onglet Favoris — `startup-news.json` (routine automatisée)

L'onglet Favoris affiche, pour chaque startup suivie par l'utilisateur, ses **nouvelles
récentes**. Le contenu est **mutualisé** (par startup, jamais par utilisateur) : on génère
une fois, et l'app filtre localement selon les favoris on-device.

Ce fichier **n'est pas produit par la tâche du matin** ci-dessus. Il est maintenu par une
**routine planifiée** (cron **un matin sur deux**, côté backend) qui pousse
`startup-news.json` sur `vantage-content`. L'app **n'a aucune logique de rétention** :
elle affiche ce que la routine a publié. Le contrat de données et la mécanique complète
(lecture de l'union, fusion déterministe) sont figés dans **`docs/perso-favoris.md`
(« La routine de mise à jour »)** ; le gabarit exact est `example-startup-news.json`.

Cette section documente **les règles éditoriales que suit l'étape LLM de la routine**
(recherche + rédaction des titres). La fusion et la troncature, elles, sont
**déterministes** (code backend).

### Schéma (rappel du contrat)

```jsonc
{
  "generatedAt": "2026-07-09",            // date ISO AAAA-MM-JJ — dernière mise à jour
  "news": {
    // clé = nom EXACT de la startup, casse identique à src/data/startups.ts
    "Owkin": [
      { "title": "…", "source": "…", "date": "8 juil. 2026",
        "url": "https://…", "publishedAt": "2026-07-08" }
      // ≤ 3 items/startup, chacun ≤ 30 j, une affaire = un article
    ]
  }
}
```

- **Clés = noms de startups**, casse **strictement identique** à `src/data/startups.ts`
  (le review vérifie cette cohérence — une clé mal cassée n'est jamais affichée).
- **`NewsItem` = `{ title, source, date, url, publishedAt }`** :
  - `date` = **libellé d'affichage**, date FR **absolue** (ex. « 8 juil. 2026 ») ;
  - `publishedAt` = **date ISO `AAAA-MM-JJ`**, utilisée par la routine pour la **fenêtre
    glissante de 30 j** et le **tri décroissant** ;
  - `title`, `source`, `url` (https, lien direct) comme le type existant.
- Une startup **sans news** est **absente** du dictionnaire — **jamais de tableau vide**.

### Cadence

**Un matin sur deux** (cron backend). Le fan-in ci-dessous couvre déjà l'actualité chaude
d'un jour à l'autre via `edition.json` ; la routine consolide et rafraîchit le stock des
Favoris à cette cadence.

### Étape LLM 1 — Fan-in (réutiliser le balayage du Journal)

Le balayage MedTech qui construit `edition.json` **est déjà fait** :
réutilise-le. Pour **chaque item** du flux (ticker, lead, milestone, deal, `brefsEurope`,
`brefsIntl`), **tague-le par société** et, si le nom correspond à une startup de l'union
suivie, **route-le** dans `news["<nom exact>"]`. Coût marginal quasi nul : une startup qui
« s'allume » dans la couverture du jour alimente les Favoris gratuitement.

- Normalise le nom vers la casse exacte de `src/data/startups.ts` avant d'écrire la clé.
- Un même événement peut nourrir à la fois `edition.json` et `startup-news.json`.

### Étape LLM 2 — Longue traîne (recherche ciblée, sur l'union suivie)

Pour les startups suivies qui **ne tombent pas** dans le flux, fais une **recherche web
ciblée**, mais **uniquement** sur l'**union suivie** (la watchlist), **jamais** sur les
~370 startups du catalogue.

- **Lire l'union suivie depuis le backend** : union **dédupliquée** des startups réellement
  suivies (favoris remontés anonymement, entrées non expirées à 30 j). Voir
  `docs/perso-favoris.md` pour le chemin de lecture (`vantage-content/backend/union.mjs`). Liste plate de
  noms en casse catalogue.
- Pour chaque startup, fournis au modèle **les titres déjà en stock** afin qu'il ne
  renvoie que des développements **nouveaux et distincts** (pas de re-publication).

### Règles éditoriales de la routine

- **Noms précis** dans chaque `title` — **société, montant, investisseur en lead**. Jamais
  de description vague (« lève un tour » → « lève 260 M$ en Series B menée par Lightspeed
  et General Catalyst »). Sociétés, montants, investisseurs, dates et URLs **réels et
  vérifiés**, rien d'inventé.
- **Dédoublonnage — « une affaire = un article »** : si le web renvoie plusieurs articles
  sur **la même affaire**, n'en garde **qu'un** (au sein du run *et* vis-à-vis du stock).
- **Ne renvoyer que du neuf** : uniquement des développements **absents** des items déjà
  stockés pour la startup.

### Rétention (fusion déterministe, garantie par la routine)

Après l'étape LLM, la routine fusionne par startup, de façon **déterministe** :

- ajoute les nouveaux items ;
- retire tout item dont `publishedAt` a **plus de 30 jours** (fenêtre glissante) ;
- **trie par `publishedAt` décroissant** et **ne garde que les 3 plus récents**.

→ En une phrase : **≤ 3 articles/startup, chacun ≤ 30 j, une affaire = un article.** Un
article quitte les Favoris **uniquement** s'il a > 30 j **ou** s'il sort du top 3 sous la
poussée d'articles plus récents. L'app ne fait **aucun** de ces calculs.

---

## Le code d'accès quotidien — `access.json` (paliers Favoris)

L'onglet Favoris a **deux paliers** : *restreint* (**1** startup) par défaut, *étendu*
(**6** startups) une fois débloqué. Le déblocage se fait en saisissant le **code du jour**,
que Pierre distribue à la demande (LinkedIn). Le déblocage est **permanent** sur l'appareil.

**Ce n'est pas de la sécurité forte, c'est de la friction.** Un client natif ne garde pas
de secret : le hash du jour est extractible. La **rotation quotidienne** ne sert qu'à
plafonner la durée de vie d'un code partagé (~24 h), pour que chacun redemande le sien.

### Contrat de données (`access.json`, à côté de `edition.json`)

```jsonc
{
  "date": "2026-07-10",         // ISO AAAA-MM-JJ — jour de validité (affichage/fraîcheur)
  "algo": "sha256",             // seul algo compris par l'app
  "salt": "c08ab6d76831811363", // sel aléatoire du jour, publié
  "hash": "dd0355…e01e",        // sha256(salt + ":" + canonical(code)) — 64 hex
  "hint": "…"                   // indice public FACULTATIF — ne révèle JAMAIS le code
}
```

- **On publie uniquement le hash salé, jamais le code en clair.** Le type et le contrôle
  runtime sont dans `src/content/accessTypes.ts` (`isAccessManifest`).
- **`canonical(code)`** = `trim` + minuscules + espaces internes compactés. Il **doit rester
  identique** à `canonicalCode()` dans `src/content/accessTypes.ts`, sinon un code correct
  ne validera pas.
- L'app vérifie **hors-ligne** : elle recalcule `sha256(salt + ":" + canonical(saisie))` et
  compare au `hash`. Aucun appel réseau à la validation, aucun backend d'auth.

### Procédure du matin (en plus des deux fichiers d'édition)

1. **Choisir la passphrase du jour** — lisible et transmissible à la main : 2–3 mots ASCII
   minuscules + un nombre, séparés par des tirets, **sans caractères ambigus** (pas de
   `o/0`, `l/1/I`). Ex. `quorum-heron-73`. **Différente chaque jour.**
2. **Tirer un sel aléatoire** :
   ```bash
   node -e 'console.log(require("crypto").randomBytes(9).toString("hex"))'
   ```
3. **Calculer le hash** (même canonicalisation que l'app) :
   ```bash
   node -e 'const{createHash}=require("crypto");const c=s=>s.trim().toLowerCase().replace(/\s+/g," ");console.log(createHash("sha256").update(process.argv[1]+":"+c(process.argv[2])).digest("hex"))' "<sel>" "<passphrase>"
   ```
4. **Écrire `access.json`** avec `{ date, algo:"sha256", salt, hash, hint? }` — **jamais** le
   code en clair, jamais dans le `hint`.
5. **Transmettre le code en clair à Pierre hors du dépôt** (résumé de run / canal privé), pour
   qu'il le donne sur demande. **Ne committer que `access.json`.**

> **Cap backend en phase :** le palier étendu autorise **6** favoris. Les règles Firestore
> (`vantage-content/backend/firestore.rules`) et `EXTENDED_LIMIT` (`src/state/favorites.tsx`) plafonnent à 6 —
> les garder synchronisés, sinon une remontée de 6 favoris est rejetée et l'appareil disparaît
> de l'union.

---

## Pourquoi une mémoire séparée ?

L'app n'a pas besoin de connaître l'historique des mots (elle n'affiche que celui du
jour). C'est **la génération** qui en a besoin, pour ne pas se répéter. On garde donc
cette mémoire dans son propre fichier, à côté de `edition.json`, plutôt que de la mêler
au contenu affiché.

## Thèmes et langues (app ≥ onglet Réglages)

L'app lit une édition par **thème** et par **langue** :

| Fichier | Contenu |
|---|---|
| `edition.json` | MedTech, français (historique) |
| `edition.en.json` | MedTech, anglais (même édition, traduite) |
| `edition-biotech.json` | Biotech, français |
| `edition-biotech.en.json` | Biotech, anglais |

Même schéma `Edition` pour tous. Les traductions `.en.json` existent aussi pour
`words.json` et `startup-news.json`. Un fichier absent n'est pas bloquant : l'app retombe
sur la version française (et sur l'aperçu MedTech si l'édition Biotech n'existe pas).
La règle « noms précis » s'applique à l'identique en anglais.
