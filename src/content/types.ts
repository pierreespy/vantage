/**
 * The daily "Edition" — one day's worth of content for the app.
 *
 * This is the DATA CONTRACT: every morning, the generation task (Claude) produces
 * a JSON object shaped exactly like `Edition`, and the app renders it. The layout
 * never changes — only this data does. See README ("Le contenu quotidien").
 *
 * Design note: presentation-only values (colors, the ↑/⇄ symbols) are intentionally
 * NOT in the data — the UI derives them — so the daily JSON stays about content.
 */

import type { SignalType, SignalStrength } from './signalTypes';
import type { Pillar } from './pillars';

/** A ticker chip — the day's notable MedTech moves, not only money:
 *  "lev" (levée), "mna" (M&A), "reg" (marquage CE / FDA / remboursement),
 *  "tech" (avancée tech ou clinique : 1er patient, résultats d'essai…),
 *  "new" (naissance d'une startup / spin-off). `amount` is the chip's short value:
 *  "€24M" for money, "CE", "FDA", "1er patient", "Spin-off"… otherwise. */
export type TickerKind = 'lev' | 'mna' | 'reg' | 'tech' | 'new';
export type TickerItem = {
  company: string;
  amount: string;
  kind: TickerKind;
};

/** The front-page lead article. */
export type Lead = {
  kicker: string;
  title: string;
  deck: string;
  /** Company name — links the ★ favorite toggle. */
  company: string;
  /** Funding stage of this deal (e.g. "Series B", "Seed") — feeds the Favoris badge. */
  stage?: string;
  /** Sector (Biotech / MedTech / Digital Health / Diagnostics / Oncologie…). Not shown
   *  directly — the kicker already carries it — but recorded on the auto-discovered
   *  directory entry so a discovered lead startup keeps its type. */
  sector?: string;
  /** True when the company's core product is AI-driven — drives the "IA" badge. */
  ai?: boolean;
  /** Weak-signal metadata: what kind of signal this is and how strong (1-5). Lets the
   *  front page lead on an EARLY signal (regulatory, clinical…), not only funding/M&A. */
  signalType?: SignalType;
  strength?: SignalStrength;
  /** Editorial pillar (see pillars.ts) — derived from signalType when absent. */
  pillar?: Pillar;
  /** Source article, opened in the system browser. */
  url: string;
};

/** "L'avancée du jour" — the day's technological/clinical/regulatory step forward,
 *  decrypted (first patient implanted, CE mark, pivotal results, a new startup…). The
 *  non-financial counterpart of the deal card. */
export type Milestone = {
  company: string;
  /** Short label of the step reached, shown as a badge: "Premier patient implanté",
   *  "Marquage CE", "Résultats pivots", "Spin-off"… */
  milestone: string;
  title: string;
  /** What happened, concretely (techno, indication, figures). */
  summary: string;
  /** Why it matters — for the field, the patients, the company's trajectory. */
  why?: string;
  place?: string;
  sector?: string;
  /** Funding stage, when known — feeds the Favoris badge. */
  stage?: string;
  ai?: boolean;
  signalType?: SignalType;
  url: string;
};

/** The "deal du jour" card. */
export type Deal = {
  company: string;
  amount: string;
  round: string;
  thesis: string;
  /** Sector (Biotech / MedTech / Digital Health…) — recorded on the auto-discovered
   *  directory entry so a discovered deal startup keeps its type. */
  sector?: string;
  /** True when the company's core product is AI-driven — drives the "IA" badge. */
  ai?: boolean;
  url: string;
};

/** A short news item (Europe / International). */
export type Bref = {
  company: string;
  place: string;
  sector: string;
  /** Funding stage (e.g. "Series A", "Seed") — feeds the Favoris badge. */
  stage?: string;
  /** True when the company's core product is AI-driven — drives the "IA" badge. */
  ai?: boolean;
  /** Weak-signal metadata: the kind of signal (regulatory, clinical, patent, hire,
   *  partnership… as well as funding/M&A) and its strength (1-5). Drives the type badge
   *  and lets early signals be surfaced/ordered ahead of "too late" funding news. */
  signalType?: SignalType;
  strength?: SignalStrength;
  /** Editorial pillar the Journal files it under (see pillars.ts). Derived from
   *  signalType when absent. */
  pillar?: Pillar;
  title: string;
  summary: string;
  url: string;
};

/** One anatomy brick of the day's term. */
export type WordPart = { label: string; role: string };
/** One mechanism step. */
export type WordStep = { n: string; h: string; t: string };
/** One startup currently using this technology/process. */
export type WordStartup = {
  name: string;
  /** One short line: what they do with it. */
  use: string;
  /** Optional HQ city/country, shown as a small tag. */
  place?: string;
};

/** One source backing the term's explanation (article, regulator page, paper…). */
export type WordSource = {
  /** Publisher / outlet, e.g. "FDA", "Nature Medicine", "Les Echos". */
  publisher: string;
  /** Title of the page or article. */
  title: string;
  /** Direct link to the page. */
  url: string;
};

/** The "Mot du jour" term explainer. */
export type Word = {
  term: string;
  full: string;
  fr: string;
  field: string;
  definition: string;
  parts: WordPart[];
  how: WordStep[];
  why: string;
  /** Real startups/companies currently using the term's tech or process. */
  startups: WordStartup[];
  /** Sources the explanation is built on — shown so the reader can check nothing is invented. */
  sources?: WordSource[];
};

/** One dated entry in the growing glossary: a past "mot du jour" with its full
 *  explainer plus the day it ran. Served in `words.json`, newest first. */
export type GlossaryWord = Word & {
  /** ISO day it was the mot du jour, e.g. "2026-07-11". */
  date: string;
  /** Human date, e.g. "11 juil. 2026". */
  dateLong: string;
};

/** The published glossary file: every term ever explained, newest first. */
export type Glossary = {
  generatedAt: string;
  words: GlossaryWord[];
};

/** Minimal runtime check that a value is a well-formed Word (the fields screens read). */
export function isWord(value: unknown): value is Word {
  if (!value || typeof value !== 'object') return false;
  const w = value as Record<string, unknown>;
  return (
    typeof w.term === 'string' &&
    typeof w.full === 'string' &&
    typeof w.definition === 'string' &&
    Array.isArray(w.parts) &&
    Array.isArray(w.how)
  );
}

/** Minimal runtime check that a fetched object looks like a Glossary. Filters to the
 *  well-formed, dated entries so a partially-malformed file still yields a usable list. */
export function parseGlossary(value: unknown): GlossaryWord[] | null {
  if (!value || typeof value !== 'object') return null;
  const g = value as Record<string, unknown>;
  if (!Array.isArray(g.words)) return null;
  const out: GlossaryWord[] = [];
  for (const w of g.words) {
    if (isWord(w) && typeof (w as GlossaryWord).dateLong === 'string') {
      out.push(w as GlossaryWord);
    }
  }
  return out;
}

/** Everything the app shows for a given day. */
export type Edition = {
  /** Human date shown in headers, e.g. "8 juil. 2026". */
  dateLong: string;
  ticker: TickerItem[];
  lead: Lead;
  /** "L'avancée du jour" — optional (older editions don't have it). */
  milestone?: Milestone;
  /** "Le deal du jour" — finance is one arm among others: optional, a calm day for
   *  money needs no deal card. */
  deal?: Deal;
  /** European brèves, all pillars — the Journal groups them by pillar. */
  brefsEurope: Bref[];
  /** Outside Europe — only the moves that matter for European MedTech. */
  brefsIntl: Bref[];
  word: Word;
};

/** Company → funding stage map derived from one edition (lead, deal, brefs). */
export function editionStages(e: Edition): Record<string, string> {
  const out: Record<string, string> = {};
  const put = (name?: string, stage?: string) => {
    if (name && stage) out[name] = stage;
  };
  put(e.lead?.company, e.lead?.stage);
  put(e.milestone?.company, e.milestone?.stage);
  put(e.deal?.company, e.deal?.round);
  for (const b of e.brefsEurope ?? []) put(b.company, b.stage);
  for (const b of e.brefsIntl ?? []) put(b.company, b.stage);
  return out;
}

/** Every company mentioned in one edition (lead, deal, brefs), with its sector and
 *  funding stage when known. `sector` is `''` when unknown; `stage` is undefined when
 *  unknown. When the same company appears twice, the non-empty sector/stage wins (they're
 *  filled independently). Feeds the "startups the journal introduced" discovery into the
 *  searchable directory — so a discovered startup records its type AND its round. */
export function editionCompanies(e: Edition): { name: string; sector: string; stage?: string }[] {
  const map = new Map<string, { sector: string; stage?: string }>();
  const put = (name?: string, sector = '', stage?: string) => {
    if (!name) return;
    const prev = map.get(name);
    if (!prev) {
      map.set(name, { sector, stage: stage || undefined });
      return;
    }
    if (!prev.sector && sector) prev.sector = sector;
    if (!prev.stage && stage) prev.stage = stage;
  };
  put(e.lead?.company, e.lead?.sector ?? '', e.lead?.stage);
  put(e.milestone?.company, e.milestone?.sector ?? '', e.milestone?.stage);
  put(e.deal?.company, e.deal?.sector ?? '', e.deal?.round);
  for (const b of e.brefsEurope ?? []) put(b.company, b.sector, b.stage);
  for (const b of e.brefsIntl ?? []) put(b.company, b.sector, b.stage);
  return Array.from(map, ([name, v]) => ({ name, sector: v.sector, stage: v.stage }));
}

/** Companies an edition flags as AI-using (lead, deal, brefs) — the `ai` field set to
 *  true. Accumulated app-wide so the "IA" badge sticks once the journal has flagged a
 *  company, even after it leaves the news. */
export function editionAiCompanies(e: Edition): string[] {
  const out: string[] = [];
  const put = (name?: string, ai?: boolean) => {
    if (name && ai) out.push(name);
  };
  put(e.lead?.company, e.lead?.ai);
  put(e.milestone?.company, e.milestone?.ai);
  put(e.deal?.company, e.deal?.ai);
  for (const b of e.brefsEurope ?? []) put(b.company, b.ai);
  for (const b of e.brefsIntl ?? []) put(b.company, b.ai);
  return out;
}

/** Minimal runtime check that a fetched object looks like an Edition. */
export function isEdition(value: unknown): value is Edition {
  if (!value || typeof value !== 'object') return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.dateLong === 'string' &&
    Array.isArray(e.ticker) &&
    Array.isArray(e.brefsEurope) &&
    Array.isArray(e.brefsIntl) &&
    !!e.lead &&
    !!e.word
  );
}
