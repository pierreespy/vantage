# Personnalisation de l'onglet Favoris — contrat & architecture

Document de référence partagé par les 4 agents (`vantage-app`, `vantage-backend`,
`vantage-content`, `vantage-review`). Il fige **le contrat de données** et **la
répartition du travail**. Toute divergence se règle ici d'abord.

## Objectif

Quand un utilisateur suit une startup, l'onglet **Favoris** doit lui montrer des
**nouvelles récentes de cette startup**, en plus des articles du Journal. Le contenu
quotidien alimente donc **deux** cibles : le Journal (comme aujourd'hui) et les Favoris,
personnalisés par utilisateur.

## Principe retenu (option 2)

- **Personnalisation = filtrage local.** Les favoris restent **sur le téléphone**
  (`src/state/favorites.tsx`). L'app télécharge un fichier de news par startup et
  n'affiche que celles des favoris.
- **Contenu mutualisé.** On ne génère **jamais** de contenu « par utilisateur » : on
  génère **par startup**, une fois, partagé par tous ceux qui la suivent.
- **La génération doit connaître les noms à traiter.** Comme les favoris sont on-device,
  l'app **remonte anonymement** l'ensemble des favoris vers un petit backend ; la
  génération lit **l'union** et ne recherche que ces startups (jamais les ~370 du
  catalogue).
- **Fan-in.** Les startups qui tombent dans le balayage HealthTech du matin alimentent
  les Favoris **gratuitement** (sous-produit du Journal). Le reste (longue traîne) fait
  l'objet d'une recherche ciblée **basse fréquence**, uniquement sur l'union suivie.
- **Cap à 5 favoris / utilisateur** — borne le feed et le nombre de startups distinctes à
  rechercher. Les nouveaux utilisateurs démarrent **à zéro**.

## Contrat de données — `startup-news.json`

Publié à côté de `edition.json` (même hébergement que `config.contentUrl`). Réutilise la
forme `NewsItem` déjà présente dans `src/data/favoris.ts`.

```jsonc
{
  "generatedAt": "2026-07-09",            // date ISO AAAA-MM-JJ — affichage de fraîcheur
  "news": {
    // clé = nom EXACT de la startup, tel qu'il apparaît dans le catalogue / les favoris
    "Owkin": [
      {
        "title": "Owkin étend son partenariat avec Sanofi (+30 M€)",
        "source": "Tech.eu",
        "date": "Hier",
        "url": "https://tech.eu"
      }
    ],
    "Abivax": [ /* … */ ]
  }
}
```

- **Clés = noms de startups**, casse identique à celle du catalogue (`src/data/startups.ts`)
  et des favoris. Le review vérifie cette cohérence.
- **`NewsItem` = `{ title, source, date, url }`** — mêmes champs que le type existant.
- Une startup sans news du jour est **absente** du dictionnaire (pas de tableau vide).
- Côté app : le `NewsProvider` fetch/cache/fallback ce fichier (jumeau d'`EditionProvider`)
  et l'écran Favoris fait `news[nomSuivi] ?? []`.

## Contrat de remontée des favoris (backend)

Payload envoyé par l'app (à finaliser par `vantage-backend` selon la plateforme retenue) :

```jsonc
{
  "anonId": "<UUID aléatoire local, jamais IDFA/IDFV>",
  "startups": ["Owkin", "Abivax"],       // <= 5, noms du catalogue
  "updatedAt": "<timestamp serveur>"
}
```

- **Aucune PII**, pas de compte, pas de Sign in with Apple.
- **Sur Firebase, `anonId` = l'identifiant du document** (l'uid d'auth anonyme), pas un
  champ du body : le client écrit `follows/<uid>` avec `{ startups, updatedAt }`. Les
  règles rejettent tout champ supplémentaire (dont un `anonId` en doublon).
- **Expiration 30 j** : une entrée non revue depuis 30 jours sort de l'union.
- **Lecture génération** : union dédupliquée des `startups` des docs non expirés → c'est la
  watchlist que `vantage-content` recherche.
- Endpoint d'écriture **non spammable** (App Check + auth anonyme, ou Worker + secret).

> Plateforme backend, workflow de génération et dépôt de contenu : **en attente de
> décision** (voir les 3 questions au coordinateur). Cette section sera complétée une fois
> tranché.

## Répartition du travail

| Stream | Agent | Tâches |
|---|---|---|
| **App** | `vantage-app` | ✅ cap à 5 + démarrage à zéro · `NewsProvider` · câblage Favoris → news par startup · client de remontée anonyme des favoris · note de confidentialité 1er lancement + bouton reset |
| **Backend** | `vantage-backend` | modèle de données + règles · chemin de lecture de l'union · privacy policy + réponses labels App Store · notes de provisioning (free tier) |
| **Contenu** | `vantage-content` | schéma + exemple `startup-news.json` · fan-in · MAJ `GENERATION.md` / `DAILY_PROMPT.md` |
| **Revue** | `vantage-review` | revue de chaque diff · `typecheck` + `expo export` · cohérence du contrat · conformité App Store |

## Séquencement

1. **Socle app** (cap 5 + zéro) — ✅ fait, sans dépendance.
2. **Décisions** : plateforme backend · workflow de génération · dépôt de contenu.
3. **Parallèle** : `NewsProvider` (app) + schéma `startup-news.json` (contenu) + modèle
   de données (backend) — tous adossés à ce contrat.
4. **Intégration** : câblage Favoris · client de remontée · lecture de l'union par la
   génération.
5. **Revue + vérif** avant commit/push sur `claude/favorites-tab-personalization-ypviw5`.
