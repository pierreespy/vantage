/**
 * Weak-signal vocabulary — shared enums + labels.
 *
 * Signals are NOT a separate feed or screen: they are woven INTO the existing flows.
 * A Journal brève (`Bref`) and a Favoris news item (`NewsItem`) each carry an optional
 * `signalType` + `strength`, so the same lists surface early signals (regulatory,
 * clinical, patents, hires, partnerships) — not just funding/M&A, which are "too late".
 *
 * This module only defines the shared vocabulary; the fields live on Bref / NewsItem.
 * See docs/signals-plan.md.
 *
 * `grant_award` and `company_incorporation` were added with the MedTech signal
 * pipeline (`backend/signals/` in `vantage-content`): an i-Lab/i-PhD/EIC win and
 * a fresh incorporation are two of the earliest signals that exist, and both are
 * ingested deterministically. They are early signals, so `isEarlySignal` picks
 * them up for free.
 */

/** What kind of event a signal is. Funding/M&A are kept — they're just two types now. */
export type SignalType =
  | 'leadership_hire'
  | 'regulatory_milestone'
  | 'clinical_update'
  | 'reimbursement'
  | 'patent_filing'
  | 'publication_preprint'
  | 'conference_abstract'
  | 'early_partnership'
  | 'grant_award'
  | 'company_incorporation'
  | 'funding_round'
  | 'acquisition';

/** Indicative signal strength, 1 (faint) to 5 (strong). See the rubric in docs/signals-plan.md. */
export type SignalStrength = 1 | 2 | 3 | 4 | 5;

export const SIGNAL_TYPES: readonly SignalType[] = [
  'leadership_hire',
  'regulatory_milestone',
  'clinical_update',
  'reimbursement',
  'patent_filing',
  'publication_preprint',
  'conference_abstract',
  'early_partnership',
  'grant_award',
  'company_incorporation',
  'funding_round',
  'acquisition',
];

/** Short FR labels for the badge. */
export const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  leadership_hire: 'Dirigeant',
  regulatory_milestone: 'Réglementaire',
  clinical_update: 'Clinique',
  reimbursement: 'Remboursement',
  patent_filing: 'Brevet',
  publication_preprint: 'Publication',
  conference_abstract: 'Congrès',
  early_partnership: 'Partenariat',
  grant_award: 'Subvention',
  company_incorporation: 'Création',
  funding_round: 'Levée',
  acquisition: 'M&A',
};

/** Funding/M&A are LATE signals ("everyone already sees them"). The rest are the early
 *  signals we want to surface — the app styles them so they stand out. */
const LATE_TYPES = new Set<SignalType>(['funding_round', 'acquisition']);

/** True for the early/weak signals (everything except funding & M&A). */
export function isEarlySignal(type: SignalType): boolean {
  return !LATE_TYPES.has(type);
}

const TYPE_SET = new Set<string>(SIGNAL_TYPES);

/** Runtime guard for a value coming from JSON (edition / news) that should be a SignalType. */
export function isSignalType(value: unknown): value is SignalType {
  return typeof value === 'string' && TYPE_SET.has(value);
}
