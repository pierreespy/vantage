# CCR routine playbook — Vantage favorites news (Mode B, no API key)

This is the **exact, self-contained** script a fresh scheduled **Claude Code Remote**
session follows each run. In this mode the session itself does the web research with
its **own native web search** — there is **no** paid Anthropic API key and no
`research.mjs`. Two deterministic Node bookends do the non-research work:
`ccr-union.mjs` (read who to research) and `ccr-publish.mjs` (merge with retention +
push).

> Retention contract, unchanged from Mode A and enforced by `merge.mjs`:
> **≤ 3 articles per startup, each ≤ 30 days old, une affaire = un article.**

## Required env / secrets

Provide these to the session's shell (all are secrets except where noted):

| Name | What |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service-account key as a **JSON string** (the whole file's contents, not a path). |
| `CONTENT_REPO` | `owner/repo` of the content repo, e.g. `pierreespy/vantage-content`. |
| `CONTENT_REPO_TOKEN` | PAT with **Contents: read/write** on `CONTENT_REPO` (clone + push). |
| `CONTENT_NEWS_PATH` | *(optional)* path of the news file in the repo. Default: `startup-news.json` at repo root. |

## Step 0 — install deps

```bash
cd backend/routine
npm ci
```

## Step 1 — read the union (who to research)

```bash
node ccr-union.mjs > union.json    # logs go to stderr; only JSON hits stdout
```

`union.json` is `{"startups":["Abivax","Owkin",...]}`. This is the list of startups
**actually followed** (deduped, non-expired). `ccr-union.mjs` also purges expired
follow docs on the server (best-effort). If the list is empty, there is nothing to
do — stop here.

## Step 2 — fetch what is ALREADY stored

Download the currently published file so you know each startup's existing
titles/urls and never re-report them:

```bash
curl -fsSL https://pierreespy.github.io/vantage-content/startup-news.json > current.json || echo '{"generatedAt":"","news":{}}' > current.json
```

`current.json` is `{ "generatedAt": "...", "news": { "<Startup>": NewsItem[] } }`.
For each startup, its already-stored items live at `.news["<Startup>"]` (may be
absent). Treat the `title` + `url` of those items as **already covered**.

## Step 3 — research each startup with native web search

For **each** startup name in `union.json.startups`:

1. Use your **native web search** to find genuinely **new, distinct** developments
   from roughly the **last 30 days** — funding rounds, clinical read-outs,
   regulatory milestones, major partnerships, key hires, M&A.
2. **Exclude anything already covered** by that startup's stored items in
   `current.json` (match on the underlying event, not just the exact url).
3. **Une affaire = un article:** if several outlets cover the **same** event,
   keep **one** item (the most reliable source), not one per article.
4. **Precise names, never vague:** every title must carry concrete facts — the
   **company**, the **amount** (chiffré), the **lead investor** / partner /
   regulator / molecule. Reject "raises a large round"; write
   "Owkin lève 30 M€ menée par Fidelity".
5. Never invent a url, source, or date. If unsure, drop the item.

Build each item as:

```jsonc
{
  "title": "Owkin étend son partenariat oncologie avec Sanofi (+30 M€)",
  "source": "Tech.eu",
  "url": "https://tech.eu/2026/07/owkin-sanofi",
  "publishedAt": "2026-07-08",   // ISO AAAA-MM-JJ (used for the 30-day window + sort)
  "date": "8 juil. 2026"         // FR absolute display label derived from publishedAt
}
```

Accumulate everything into a single **`candidates.json`** mapping each startup to
its list of NEW items:

```jsonc
{
  "Owkin": [ { "title": "...", "source": "...", "url": "...", "publishedAt": "2026-07-08", "date": "8 juil. 2026" } ],
  "Abivax": [ /* ... */ ]
}
```

**Resilience:** if a startup yields nothing new, simply **omit it** from
`candidates.json` (or give it `[]`). Never fabricate filler. `ccr-publish.mjs` still
re-applies retention to already-stored startups, so omitting a startup does not lose
its existing (in-window) news.

## Step 4 — merge with retention + publish

```bash
node ccr-publish.mjs candidates.json
```

This clones `CONTENT_REPO`, and for every startup in (existing ∪ candidates) runs
`mergeStartupNews(existing, incoming, { windowDays: 30, maxPerStartup: 3 })`:
dedupe by url, drop items > 30 days old, keep the 3 newest. Startups that end up
empty are **dropped** (no empty arrays). It sets `generatedAt` to today, writes the
file, and commits + pushes. A clean tree short-circuits with "nothing to commit".

Dry-run locally (writes + prints the result, no push):

```bash
DRY_RUN=1 node ccr-publish.mjs candidates.json
```

## One-run summary

```bash
cd backend/routine && npm ci
node ccr-union.mjs > union.json
curl -fsSL https://pierreespy.github.io/vantage-content/startup-news.json > current.json || echo '{"news":{}}' > current.json
# ... native web research per startup -> candidates.json ...
node ccr-publish.mjs candidates.json
```
