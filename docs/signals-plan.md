# Extension « Signaux faibles » + rééquilibrage MedTech — plan (Voie B)

Plan validé pour élargir Vantage Chronicle au-delà de *funding / M&A* : capter des
**signaux faibles** en amont (réglementaire, clinique, IP, dirigeants, partenariats) et
**rééquilibrer le MedTech** (au moins à parité avec la biotech). Détection **exacte des
changements** (Voie B) et **0 € d'infra**.

Statut : plan figé, exécution par phases. Ce fichier est le référentiel de suivi.

## Décisions actées

- **Voie B** — vrai pipeline avec **état stocké + diffing** (détection exacte des
  changements), pas seulement un balayage ponctuel.
- **0 €** — que du gratuit : API publiques + RSS + état en git. Aucune source payante
  (STAT, MedTech Insight, enrichissement RH exclus). Pas de Firebase Functions (impose
  Blaze) — l'état vit en JSON dans le dépôt, les jobs tournent en **GitHub Actions**.
- **Où vivent les signaux** : **Journal court maintenu** (1 une + 1 deal + ≤3 brèves
  Europe + ≤3 brèves Intl, curé) **+ Favoris** (signaux par startup suivie) **+ nouvelle
  vue « Signaux »** filtrable (secteur / type / force).
- **Dirigeants** : **wires officiels uniquement** (BusinessWire / PR Newswire via RSS).
  Pas de LinkedIn (CGU), pas de saisie manuelle.

## Architecture — deux moteurs, 0 € d'infra

- **Moteur déterministe** (nouveau) : scripts Node lancés par une **GitHub Action
  planifiée** dans `vantage-content`. Interrogent les **API publiques**, comparent au
  dernier état stocké (**diffing**), écrivent `signals.json`. État en git (comme
  `recent-words.json` / `recent-articles.json`).
- **Moteur éditorial** (existant) : la routine Claude quotidienne garde la presse/wires
  (recherche web), rédige le **Journal court**, et fusionne les signaux pertinents dans les
  Favoris.

### État & diffing (le cœur de la Voie B)
Dossier `signal-state/` (git) : « ce qu'on savait déjà » par entité —
essais (`NCT id → dernier statut`), FDA (`company → 510(k)/PMA vus`), brevets/publis
(`company → ids vus`). À chaque run : récupérer l'actuel → **comparer** → n'émettre un
`Signal` que si **nouveau ou changé** → mettre à jour l'état + rétention.

### Périmètre interrogé
- **Union suivie** (favoris, via `backend/union.mjs`) → signaux profonds par startup.
- **Catalogue app** (`src/data/favoris.ts`) → couverture plus large.
- ⚠️ **Risque n°1 : matching de noms** (noms FDA/sponsors d'essais/déposants ≠ noms propres
  de l'app) → sous-tâche dédiée : couche de normalisation / alias.

## Sources — faisabilité & géographie

| Source | Accès | Géo | Signal | Phase |
|---|---|---|---|---|
| **openFDA** (510(k), PMA, De Novo, Breakthrough Device) | API gratuite | **US** (capte les jalons US des boîtes EU) | réglementaire medtech | 1 |
| **ClinicalTrials.gov v2** | API gratuite (`lastUpdatePostDate`) | Mondial (dont EU) | changement de statut d'essai | 1 |
| **EMA** (désignations orphelines / EPAR) | données grattables | **EU** | réglementaire biotech | 1 |
| **PubMed E-utilities** | API gratuite (clé = quota+) | Mondial | publication | 2 |
| **bioRxiv / medRxiv** | API gratuite | Mondial | preprint | 2 |
| **Espacenet (OEB) / USPTO** | API gratuite (OAuth/quotas) | **EU** + US | brevet | 2 |
| **Wires** (BusinessWire, PR Newswire) | RSS | Mondial | nominations, CE annoncé, partenariats | 3 |
| **Presse** (MedTech Dive, MassDevice, Fierce, Endpoints, MobiHealthNews…) | RSS / recherche web | Mixte | tout, dont **marquage CE** | continu (éditorial) |
| **EUDAMED** (CE structuré) | immature, pas d'API fiable | EU | réglementaire CE | 🔴 quand mûr (~2026-27) |
| **LinkedIn** | interdit (CGU) | — | — | ❌ exclu |

> **Marquage CE** : pas d'API gratuite fiable (EUDAMED immature). Capté via **presse +
> wires** (les boîtes le PR toujours) tant qu'EUDAMED n'est pas obligatoire.

## Modèle de données

`signals.json` (sibling de `edition.json` / `startup-news.json`), consommé par l'app :

```jsonc
{
  "generatedAt": "AAAA-MM-JJ",
  "signals": [
    {
      "company": "Nom exact",
      "sector": "medtech",            // biotech | medtech | digital_health
      "type": "regulatory_milestone", // enum ci-dessous
      "strength": 4,                  // 1..5 (barème ci-dessous)
      "title": "…", "summary": "…",
      "source": "openFDA", "url": "https://…",
      "date": "12 juil. 2026",        // libellé FR
      "publishedAt": "2026-07-12"     // ISO — tri / rétention
    }
  ]
}
```

`type` ∈ `leadership_hire | regulatory_milestone | clinical_update | reimbursement |
patent_filing | publication_preprint | conference_abstract | early_partnership |
funding_round | acquisition`.

Touche app : `src/content/signalTypes.ts` (type + validation), un `SignalsProvider`
(fetch + cache + graine), rendu badges **secteur / type / force**, nouvelle vue « Signaux ».

## Barème de force

| Force | Signaux |
|---|---|
| **5** | Levée late-stage bouclée · M&A · clearance FDA **obtenue** · remboursement (CPT III / NTAP) |
| **4** | Breakthrough Device/Therapy · endpoint primaire atteint · Series A/B bouclée |
| **3** | Soumission FDA/IND · nomination CEO/CSO · co-développement grand groupe |
| **2** | Dépôt de brevet · preprint/publi · pilote hospitalier · advisor stratégique |
| **1** | Abstract de congrès · signal isolé non confirmé |

## Phases

- **Phase 0 — Fondations (app + éditorial)** : type `Signal` + validation, `SignalsProvider`,
  rendu badges (secteur/type/force), **vue « Signaux »** + signaux dans **Favoris**, Journal
  court réconcilié, **rééquilibrage medtech** dans la routine éditoriale. *Valeur immédiate,
  zéro pipeline.*
- **Phase 1 — Pipeline (cœur B)** : GitHub Action cron + scripts Node + `signal-state/` +
  diffing, sur **openFDA** + **ClinicalTrials.gov** + **EMA (orphelines)** + couche de
  **matching de noms**.
- **Phase 2 — Science / IP** : PubMed + bioRxiv/medRxiv + Espacenet/USPTO.
- **Phase 3 — Dirigeants & vue dédiée** : wires RSS (BusinessWire…), polish de la vue.
- **Continu** : presse via recherche web (éditorial), durcissement dédup/rétention.

## Risques

1. **Matching de noms** entre sources et catalogue app (couche d'alias nécessaire).
2. **Couverture réglementaire EU faible** en API (CE/EUDAMED) → dépendance presse/wires.
3. **Volume** : garder le Journal court ; le gros du volume va en vue « Signaux » / Favoris.
