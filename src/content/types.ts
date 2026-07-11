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

/** A ticker chip: a fundraise ("lev") or an M&A ("mna"). */
export type TickerItem = {
  company: string;
  amount: string;
  kind: 'lev' | 'mna';
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
  /** Source article, opened in the system browser. */
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
};

/** Everything the app shows for a given day. */
export type Edition = {
  /** Human date shown in headers, e.g. "8 juil. 2026". */
  dateLong: string;
  ticker: TickerItem[];
  lead: Lead;
  deal: Deal;
  brefsEurope: Bref[];
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
    !!e.deal &&
    !!e.word
  );
}
