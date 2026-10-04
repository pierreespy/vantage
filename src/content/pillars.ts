/**
 * Editorial pillars ("rubriques") of the MedTech watch.
 *
 * Vantage Chronicle covers the European MedTech universe as a whole — finance is ONE
 * arm among others. Every brève belongs to one pillar, and the Journal groups the
 * European brèves by pillar, in the order below (innovation first, money last):
 *
 *  - `innovation`  — Tech & clinique : premières mondiales, premier patient implanté,
 *                    résultats d'essai, publication, brevet, partenariat industriel.
 *  - `marche`      — Réglementaire & marché : marquage CE / MDR, FDA, remboursement
 *                    (HAS, PECAN, DiGA), premières ventes, déploiement hospitalier.
 *  - `naissances`  — Nouvelles pousses : créations, spin-offs de labo, lauréats i-Lab /
 *                    EIC, entrées en incubateur.
 *  - `financement` — Financement : levées, M&A, IPO.
 *
 * A brève may carry its `pillar` explicitly; otherwise it is derived from its
 * `signalType`, and a brève with neither (legacy editions, funding-only) falls back to
 * `financement`.
 */
import type { SignalType } from './signalTypes';

export type Pillar = 'innovation' | 'marche' | 'naissances' | 'financement';

/** Display order in the Journal. */
export const PILLARS: readonly Pillar[] = ['innovation', 'marche', 'naissances', 'financement'];

/** Section headers in the Journal. */
export const PILLAR_LABELS: Record<Pillar, string> = {
  innovation: 'Tech & clinique',
  marche: 'Réglementaire & marché',
  naissances: 'Nouvelles pousses',
  financement: 'Financement',
};

const SIGNAL_PILLAR: Record<SignalType, Pillar> = {
  clinical_update: 'innovation',
  publication_preprint: 'innovation',
  conference_abstract: 'innovation',
  patent_filing: 'innovation',
  early_partnership: 'innovation',
  regulatory_milestone: 'marche',
  reimbursement: 'marche',
  leadership_hire: 'marche',
  company_incorporation: 'naissances',
  grant_award: 'naissances',
  funding_round: 'financement',
  acquisition: 'financement',
};

const PILLAR_SET = new Set<string>(PILLARS);

export function isPillar(value: unknown): value is Pillar {
  return typeof value === 'string' && PILLAR_SET.has(value);
}

/** The pillar an item belongs to: explicit `pillar`, else derived from `signalType`. */
export function pillarOf(item: { pillar?: unknown; signalType?: SignalType }): Pillar {
  if (isPillar(item.pillar)) return item.pillar;
  if (item.signalType && SIGNAL_PILLAR[item.signalType]) return SIGNAL_PILLAR[item.signalType];
  return 'financement';
}

/** Groups items by pillar, in display order, dropping empty pillars. Keeps input order
 *  inside each group. */
export function groupByPillar<T extends { pillar?: unknown; signalType?: SignalType }>(
  items: T[]
): { pillar: Pillar; items: T[] }[] {
  const buckets = new Map<Pillar, T[]>();
  for (const it of items) {
    const p = pillarOf(it);
    const list = buckets.get(p);
    if (list) list.push(it);
    else buckets.set(p, [it]);
  }
  return PILLARS.filter((p) => buckets.has(p)).map((p) => ({ pillar: p, items: buckets.get(p)! }));
}
