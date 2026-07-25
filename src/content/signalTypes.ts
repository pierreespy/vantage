/**
 * Weak-signal feed — the `signals.json` DATA CONTRACT.
 *
 * A sibling of the daily Edition (edition.json) and per-startup news (startup-news.json).
 * The generation pipeline (see docs/signals-plan.md) publishes ONE shared file: a flat
 * list of Signal objects. The app filters it two ways — by followed favorite (Favoris
 * tab) and by sector / type / strength (the "Signaux" view). The Journal stays curated
 * and does not read this feed.
 *
 *   { generatedAt: "AAAA-MM-JJ", signals: Signal[] }
 *
 * Beyond funding/M&A, a Signal captures EARLY signals: regulatory milestones, clinical
 * status changes, reimbursement, patents, publications, leadership hires, partnerships.
 */

/** Sector buckets — medtech is first-class here, not an afterthought. */
export type SignalSector = 'biotech' | 'medtech' | 'digital_health';

/** What kind of event the signal is. Funding/M&A are kept — they're just two types now. */
export type SignalType =
  | 'leadership_hire'
  | 'regulatory_milestone'
  | 'clinical_update'
  | 'reimbursement'
  | 'patent_filing'
  | 'publication_preprint'
  | 'conference_abstract'
  | 'early_partnership'
  | 'funding_round'
  | 'acquisition';

/** Indicative signal strength, 1 (faint) to 5 (strong). See the rubric in docs/signals-plan.md. */
export type SignalStrength = 1 | 2 | 3 | 4 | 5;

/** One captured signal. `date` is the FR display label; `publishedAt` (ISO) drives sort/retention. */
export type Signal = {
  /** Company name, exact catalog casing (so the Favoris filter matches). */
  company: string;
  sector: SignalSector;
  type: SignalType;
  strength: SignalStrength;
  title: string;
  summary: string;
  /** Source name (e.g. "openFDA", "ClinicalTrials.gov", "BusinessWire"). */
  source: string;
  url: string;
  /** FR display date, e.g. "12 juil. 2026". */
  date: string;
  /** ISO date AAAA-MM-JJ — sort key and retention window. */
  publishedAt: string;
};

/** The whole weak-signal feed. */
export type SignalsFeed = {
  /** ISO date AAAA-MM-JJ — freshness label. */
  generatedAt: string;
  signals: Signal[];
};

export const SIGNAL_SECTORS: readonly SignalSector[] = ['biotech', 'medtech', 'digital_health'];

export const SIGNAL_TYPES: readonly SignalType[] = [
  'leadership_hire',
  'regulatory_milestone',
  'clinical_update',
  'reimbursement',
  'patent_filing',
  'publication_preprint',
  'conference_abstract',
  'early_partnership',
  'funding_round',
  'acquisition',
];

/** Short FR labels for the badges. */
export const SECTOR_LABELS: Record<SignalSector, string> = {
  biotech: 'Biotech',
  medtech: 'MedTech',
  digital_health: 'Digital Health',
};

export const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  leadership_hire: 'Dirigeant',
  regulatory_milestone: 'Réglementaire',
  clinical_update: 'Clinique',
  reimbursement: 'Remboursement',
  patent_filing: 'Brevet',
  publication_preprint: 'Publication',
  conference_abstract: 'Congrès',
  early_partnership: 'Partenariat',
  funding_round: 'Levée',
  acquisition: 'M&A',
};

const SECTOR_SET = new Set<string>(SIGNAL_SECTORS);
const TYPE_SET = new Set<string>(SIGNAL_TYPES);

/** Minimal runtime check that a fetched object looks like a SignalsFeed. */
export function isSignalsFeed(value: unknown): value is SignalsFeed {
  if (!value || typeof value !== 'object') return false;
  const f = value as Record<string, unknown>;
  if (typeof f.generatedAt !== 'string') return false;
  if (!Array.isArray(f.signals)) return false;
  return f.signals.every((s) => {
    if (!s || typeof s !== 'object') return false;
    const it = s as Record<string, unknown>;
    return (
      typeof it.company === 'string' &&
      typeof it.sector === 'string' &&
      SECTOR_SET.has(it.sector) &&
      typeof it.type === 'string' &&
      TYPE_SET.has(it.type) &&
      typeof it.strength === 'number' &&
      it.strength >= 1 &&
      it.strength <= 5 &&
      typeof it.title === 'string' &&
      typeof it.summary === 'string' &&
      typeof it.source === 'string' &&
      typeof it.url === 'string' &&
      typeof it.date === 'string' &&
      typeof it.publishedAt === 'string'
    );
  });
}
