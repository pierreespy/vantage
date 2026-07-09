# CCR routine playbook — Vantage favorites news (Mode B, no API key)

This is the **exact, self-contained** script a fresh scheduled **Claude Code Remote**
session follows each run. In this mode the session itself does the web research with
its **own native web search** — there is **no** paid Anthropic API key and no
`research.mjs`. Publishing goes through the session's **own GitHub connection**
(the `github` MCP tools) — there is **no PAT and no git push** from a script.

Two deterministic Node bookends do the non-research work:
`ccr-union.mjs` (read who to research) and `ccr-merge.mjs` (merge with retention,
purely — no git).

Target content repo (hardcoded): **`pierreespy/vantage-content`**, file
`startup-news.json` at the repo root.

> Retention contract, unchanged from Mode A and enforced by `merge.mjs`:
> **≤ 3 articles per startup, each ≤ 30 days old, une affaire = un article.**

## Required env / secrets

| Name | What |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service-account key as a **JSON string** (the whole file's contents, not a path). Used only to read the union. |

That is the **only** secret. Publishing uses the session's GitHub connection, so
there is **no** `CONTENT_REPO_TOKEN` and **no** `CONTENT_REPO`.

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

## Step 2 — read the CURRENT published file (content + SHA) via GitHub

Use the **GitHub tool** `get_file_contents` on `pierreespy/vantage-content`, path
`startup-news.json`, so you get **both** the current content **and** its blob **SHA**
from one source (you'll need that SHA to publish in Step 4).

- Save the returned content to a local file `current.json`. If the file does not
  exist yet in the repo, use `{"generatedAt":"","news":{}}` as `current.json` and
  treat the SHA as absent (a create, not an update).

`current.json` is `{ "generatedAt": "...", "news": { "<Startup>": NewsItem[] } }`.
For each startup, its already-stored items live at `.news["<Startup>"]` (may be
absent). Treat the `title` + `url` of those items as **already covered**.

## Step 3 — research each startup with native web search

For **each** startup name in `union.json.startups`:

1. Use your **native web search** to find genuinely **new, distinct** developments
   — funding rounds, clinical read-outs, regulatory milestones, major partnerships,
   key hires, M&A.
2. **HARD RULE — 30-day window:** keep an item **only if its `publishedAt` is within
   the last 30 days** of today (i.e. `publishedAt >= today − 30 days`).
   **Discard anything older than 30 days**, no matter how relevant. The retention
   merge (`ccr-merge.mjs`) drops >30-day items anyway, so older articles are wasted
   effort — do not include them.
3. **Exclude anything already covered** by that startup's stored items in
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
`candidates.json` (or give it `[]`). Never fabricate filler. `ccr-merge.mjs` still
re-applies retention to already-stored startups, so omitting a startup does not lose
its existing (in-window) news.

## Step 4 — merge (retention) then publish via GitHub

**Merge** deterministically — no git, no token:

```bash
node ccr-merge.mjs candidates.json current.json merged.json
```

This applies `mergeStartupNews(existing, incoming, { windowDays: 30, maxPerStartup: 3 })`
per startup over (existing ∪ candidates): dedupe by url, drop items > 30 days old,
keep the 3 newest. Startups that end up empty are **dropped** (no empty arrays). It
sets `generatedAt` to today and writes the result to `merged.json`.

**Publish** with the session's GitHub connection — the `create_or_update_file` tool:

- repo: `pierreespy/vantage-content`
- path: `startup-news.json`
- content: the contents of `merged.json`
- sha: the blob SHA you read in Step 2 (omit it if the file did not exist — that
  makes it a create)
- branch: `main`
- message: e.g. `chore(news): refresh startup-news.json (<today>)`

The app picks up the new file on its next fetch.

## One-run summary

```bash
cd backend/routine && npm ci
node ccr-union.mjs > union.json
# GitHub get_file_contents pierreespy/vantage-content startup-news.json -> current.json (+ SHA)
# ... native web research per startup -> candidates.json ...
node ccr-merge.mjs candidates.json current.json merged.json
# GitHub create_or_update_file pierreespy/vantage-content startup-news.json (content=merged.json, sha=<from Step 2>)
```
