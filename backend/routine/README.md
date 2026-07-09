# Vantage — favorites news routine

Server-side cron that maintains **`startup-news.json`** in the `vantage-content`
repo. It is the machinery behind the Favoris tab: the app filters this one shared,
per-startup file down to each user's on-device favorites.

Authoritative contract: [`docs/perso-favoris.md`](../../docs/perso-favoris.md).
This directory is **not** part of the Expo app — it has its **own** `package.json`
and `node_modules`, and its deps (`@anthropic-ai/sdk`, `firebase-admin`,
`simple-git`) must **never** be added to the app's root `package.json` (that would
bloat the iOS bundle).

## How it works

`run.mjs` orchestrates, once per run:

1. **Union** — reads the deduped set of *actually followed* startups from Firestore
   via [`../union.mjs`](../union.mjs) (`readUnion(db, now)`), never the ~370-startup
   catalog. Expired follows (>30 days) are already excluded by that query.
2. **Checkout** — shallow-clones `vantage-content` with a token and reads the
   current `startup-news.json` (empty scaffold if absent).
3. **Research** — [`research.mjs`](./research.mjs): for each startup, Claude
   (`claude-opus-4-8`, adaptive thinking, `web_search_20260209`, structured output
   via `output_config.format`) returns **new, distinct** developments. The model is
   handed the startup's already-stored titles + urls so it (a) skips what we already
   have and (b) collapses many articles about the same event into one ("une affaire
   = un article"). Precise-names rule enforced (company, amount, lead investor).
4. **Merge (retention)** — [`merge.mjs`](./merge.mjs), a pure deterministic
   function: dedupe by url, drop items >30 days old (sliding window), keep the 3
   newest. This is the *only* place retention is enforced; the app has none.
5. **Publish** — writes `startup-news.json` with `generatedAt = today`, commits and
   pushes to `vantage-content`. Startups with no stored **and** no new items stay
   **absent** from the map (never an empty array).

### Dependency injection into `union.mjs`

`union.mjs` lives one directory up and has no `node_modules` of its own, so it does
**not** import `firebase-admin` at module scope. `run.mjs` builds the Firestore
`db` from *this* package's `firebase-admin` (using `FIREBASE_SERVICE_ACCOUNT`) and
passes it to `readUnion(db, now)`. The `node backend/union.mjs` CLI still works — it
imports `firebase-admin` lazily in its own entrypoint block.

## Secrets & variables to create

In the repo hosting this workflow: **Settings → Secrets and variables → Actions**.

| Kind | Name | Value |
|---|---|---|
| Secret | `ANTHROPIC_API_KEY` | Anthropic API key used for research. |
| Secret | `FIREBASE_SERVICE_ACCOUNT` | The **full JSON** of a Firebase service-account key (Project settings → Service accounts → Generate new private key). Paste the file contents verbatim. |
| Secret | `CONTENT_REPO_TOKEN` | A PAT (fine-grained, **Contents: read/write** on `vantage-content`) used to clone + push. |
| Variable | `CONTENT_REPO` | `owner/repo` of the content repo, e.g. `pierreespy/vantage-content`. |

Optional env (defaults in `run.mjs`): `CONTENT_NEWS_PATH` (default
`startup-news.json`), `CONTENT_BRANCH` (default `main`), `DRY_RUN=1` (write but do
not commit/push).

> The service-account JSON is a real secret — never commit it or bundle it in the
> app. The client `GoogleService-Info.plist` is *not* a secret and is unrelated to
> this job.

## Run locally

```bash
cd backend/routine
npm ci

# Unit test the deterministic retention merge:
npm test                 # -> node --test, 6 cases (top-3, 30-day window, url-dedup, empty…)

# Full dry run (needs the 4 secrets in your env; writes but does not push):
DRY_RUN=1 \
ANTHROPIC_API_KEY=... \
FIREBASE_SERVICE_ACCOUNT="$(cat service-account.json)" \
CONTENT_REPO=pierreespy/vantage-content \
CONTENT_REPO_TOKEN=... \
node run.mjs
```

## Cadence caveat — "one morning in two"

The workflow cron is `0 6 */2 * *` (06:00 UTC). `*/2` on the **day-of-month** field
means days 1, 3, 5, … 31 — every other day *within* a month, but the step **resets
at each month boundary**. Consequences:

- A 31-day month runs on the 31st **and** the 1st (two mornings in a row).
- After a 30-day month, the 1st also follows the 29th.

This is harmless: the routine is idempotent (deterministic merge; a clean git tree
= "nothing to commit"), so a back-to-back run just refreshes and usually no-ops. If
strict 48-hour spacing ever matters, switch to a **daily** cron and skip odd days
via an epoch-based check inside `run.mjs`.
