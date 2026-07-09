// Vantage — CCR (Claude Code Remote) publisher.
//
// Mode B entrypoint: deterministic bookend #2. Takes the NEW items a Claude Code
// session found via native web search, merges them into the published
// startup-news.json under the SAME retention contract as Mode A (reuses
// merge.mjs), and pushes to the vantage-content repo. No Anthropic API key needed.
//
// Usage:
//   node ccr-publish.mjs <candidates.json>
//
// candidates.json shape (the session writes this):
//   { "<Startup>": [ { title, source, url, publishedAt, date }, ... ], ... }
//
// Env:
//   CONTENT_REPO         "owner/repo", e.g. pierreespy/vantage-content
//   CONTENT_REPO_TOKEN   PAT with push access to CONTENT_REPO
//   CONTENT_NEWS_PATH    path of the news file in the repo (default startup-news.json)
//   CONTENT_BRANCH       branch to push (default main)
//   DRY_RUN              "1" to skip commit/push and print the resulting JSON

import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { simpleGit } from 'simple-git';

import { mergeStartupNews } from './merge.mjs';

const NEWS_PATH = process.env.CONTENT_NEWS_PATH || 'startup-news.json';
const BRANCH = process.env.CONTENT_BRANCH || 'main';
const DRY_RUN = process.env.DRY_RUN === '1';

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`missing required env var ${name}`);
  return v;
}

/** Load and validate the session's candidates file (startup -> new items). */
async function loadCandidates(path) {
  if (!path) throw new Error('usage: node ccr-publish.mjs <candidates.json>');
  let parsed;
  try {
    parsed = JSON.parse(await readFile(path, 'utf8'));
  } catch (err) {
    throw new Error(`could not read/parse candidates file "${path}": ${err.message}`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('candidates JSON must be an object mapping startup name -> item[]');
  }
  return parsed;
}

/** Clone vantage-content into a temp dir and return { git, filePath, data }. */
async function checkoutContent() {
  const repo = requireEnv('CONTENT_REPO'); // owner/repo
  const token = requireEnv('CONTENT_REPO_TOKEN');
  const url = `https://x-access-token:${token}@github.com/${repo}.git`;

  const dir = await mkdtemp(join(tmpdir(), 'vantage-content-'));
  const git = simpleGit();
  await git.clone(url, dir, ['--depth', '1', '--branch', BRANCH]);
  const repoGit = simpleGit(dir);
  await repoGit.addConfig('user.name', 'vantage-news-bot');
  await repoGit.addConfig('user.email', 'bot@vantage.local');

  const filePath = join(dir, NEWS_PATH);
  let data = { generatedAt: '', news: {} };
  if (existsSync(filePath)) {
    try {
      data = JSON.parse(await readFile(filePath, 'utf8'));
      if (!data.news || typeof data.news !== 'object') data.news = {};
    } catch {
      data = { generatedAt: '', news: {} };
    }
  }
  return { git: repoGit, filePath, data };
}

async function main() {
  const now = Date.now();
  const todayIso = new Date(now).toISOString().slice(0, 10);

  const candidates = await loadCandidates(process.argv[2]);
  const { git, filePath, data } = await checkoutContent();

  // Merge over the union of startups present in EITHER the existing file or the
  // candidates, so retention (30-day window / top-3) is re-applied to stored
  // startups even when the session found nothing new for them.
  const names = new Set([...Object.keys(data.news), ...Object.keys(candidates)]);

  const nextNews = {};
  for (const name of names) {
    const existing = Array.isArray(data.news[name]) ? data.news[name] : [];
    const incoming = Array.isArray(candidates[name]) ? candidates[name] : [];
    const merged = mergeStartupNews(existing, incoming, { now, windowDays: 30, maxPerStartup: 3 });
    console.error(`  ${name}: stored=${existing.length} new=${incoming.length} -> kept=${merged.length}`);
    // Absent from the map (no empty arrays) when nothing survives.
    if (merged.length) nextNews[name] = merged;
  }

  const output = { generatedAt: todayIso, news: nextNews };
  await writeFile(filePath, JSON.stringify(output, null, 2) + '\n', 'utf8');

  const status = await git.status();
  if (status.isClean()) {
    console.error('startup-news.json unchanged — nothing to commit.');
    return;
  }
  if (DRY_RUN) {
    console.error('DRY_RUN=1 — wrote file but skipping commit/push.');
    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
    return;
  }

  await git.add(NEWS_PATH);
  await git.commit(`chore(news): refresh startup-news.json (${todayIso})`);
  await git.push('origin', BRANCH);
  console.error(`pushed startup-news.json to ${process.env.CONTENT_REPO}@${BRANCH}`);
}

main().catch((err) => {
  console.error('ccr-publish failed:', err);
  process.exit(1);
});
