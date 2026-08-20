/**
 * MedTech leads — the `medtech-leads.json` DATA CONTRACT.
 *
 * A sibling of the daily Edition (types.ts) and the per-startup news
 * (newsTypes.ts). Produced by the deterministic signal pipeline in the
 * `vantage-content` repo (`backend/signals/`), which ingests public APIs
 * (PubMed / Europe PMC, EPO OPS, ClinicalTrials.gov, innovation grants, the
 * French legal registry), resolves them into entities, and scores them.
 *
 * Two priority rules define the score bands (see `backend/signals/score.mjs`):
 *   - **>= 80 (haute)**  chercheur/auteur + brevet déposé + société créée < 6 mois;
 *   - **>= 50 (moyenne)** nouvel essai ClinicalTrials sans structure commerciale.
 *
 * The high band is EXCLUSIVE to the first pattern: a lead matching no rule is
 * capped at 79 however many signals it carries. Without that ceiling a large
 * incumbent — which files patents, publishes and runs trials continuously —
 * reaches 80 by accumulation alone, which is the opposite of what the pipeline
 * is for. So `priority === 'high'` implies `rules` contains
 * `researcher_patent_newco`.
 *
 * The same objects are served by the pipeline's HTTP endpoint
 * (`GET /api/medtech/leads`), so a client can either fetch the whole published
 * file or query the endpoint and get identical items.
 *
 * This module is the TYPED CONTRACT only — no screen renders leads yet. It exists
 * so the two repos cannot drift silently: a change to the published shape has to
 * change this file too, and `npm run typecheck` says so.
 */

import type { SignalType, SignalStrength } from './signalTypes';

/** Which priority band a lead's score falls into. */
export type LeadPriority = 'high' | 'medium' | 'low';

/** The named rules that guarantee a score floor. */
export type LeadRule = 'researcher_patent_newco' | 'new_trial_no_company';

/** One piece of evidence behind a lead's score — the auditable part. */
export type LeadSignal = {
  signalType: SignalType;
  strength: SignalStrength;
  /** The kind of source record: publication, patent, trial, grant, incorporation. */
  recordKind: 'publication' | 'patent' | 'trial' | 'grant' | 'company_creation';
  /** Connector id: `pubmed`, `europepmc`, `epo`, `clinicaltrials`, `grants`, `pappers`. */
  source: string;
  /** Stable id within that source (PMID, EP publication number, NCT id, SIREN…). */
  sourceId: string;
  title: string;
  url: string;
  /** ISO AAAA-MM-JJ. */
  date: string;
  /** How many points this signal contributed to the score. */
  contribution: number;
  /** True when this run's diffing found it NEW or CHANGED — so the editorial
   *  routine can surface only what it has not already published. */
  isNew: boolean;
};

/** One scored sourcing lead: a researcher, or a company. */
export type MedTechLead = {
  /** Stable entity id, e.g. `person:dupont:1a2b3c4d`. */
  id: string;
  kind: 'person' | 'company';
  name: string;
  /** Other spellings the sources used for the same entity. */
  aliases: string[];
  /** ORCID, when a publication carried one. */
  orcid?: string;
  /** Best-known company for this lead ('' when none is identified yet). */
  company: string;
  companies: string[];
  /** ISO-3166 alpha-2, '' when unknown. */
  country: string;
  countries: string[];
  /** 0-100. */
  score: number;
  priority: LeadPriority;
  /** Which named rules fired. Empty when the score is purely weighted. */
  rules: LeadRule[];
  /** FR explanations of what triggered the score, headline rule first. */
  reasons: string[];
  signals: LeadSignal[];
  signalCount: number;
  newSignalCount: number;
  /** Connector ids that contributed. */
  sources: string[];
  keywords: string[];
  /** ISO AAAA-MM-JJ of the earliest / latest evidence attached. */
  firstEvidence: string;
  latestEvidence: string;
  updatedAt: string;
};

/** The published file: every lead above the pipeline's minimum score. */
export type MedTechLeads = {
  /** ISO AAAA-MM-JJ. */
  generatedAt: string;
  /** Human FR label, e.g. "9 août 2026". */
  generatedAtLong: string;
  counts: {
    total: number;
    high: number;
    medium: number;
    low: number;
    withNewSignal: number;
  };
  /** What each connector contributed this run — a degraded run is visible here. */
  sources: { id: string; label: string; records: number; added: number; changed: number }[];
  /** Connectors that failed this run (empty on a clean run). */
  errors: { source: string; message: string }[];
  leads: MedTechLead[];
};

/** One page of `GET /api/medtech/leads`. */
export type MedTechLeadsPage = {
  generatedAt: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  items: MedTechLead[];
};

/** Minimal runtime check that a lead has the fields a screen would read. */
export function isMedTechLead(value: unknown): value is MedTechLead {
  if (!value || typeof value !== 'object') return false;
  const lead = value as Record<string, unknown>;
  return (
    typeof lead.id === 'string' &&
    typeof lead.name === 'string' &&
    typeof lead.score === 'number' &&
    Array.isArray(lead.signals)
  );
}

/** Minimal runtime check on a fetched `medtech-leads.json`, filtering to the
 *  well-formed entries so a partially-malformed file still yields a usable list. */
export function parseMedTechLeads(value: unknown): MedTechLead[] | null {
  if (!value || typeof value !== 'object') return null;
  const file = value as Record<string, unknown>;
  if (!Array.isArray(file.leads)) return null;
  return file.leads.filter(isMedTechLead);
}
