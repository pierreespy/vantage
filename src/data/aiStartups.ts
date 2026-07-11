/**
 * AI-first startups — drives the "IA" badge in the Journal and on Favoris cards.
 *
 * Curated set of HealthTech/Biotech companies whose core product is genuinely AI/ML-driven
 * (AI drug discovery, medical-imaging AI, clinical-documentation copilots…). Names must
 * match the catalog / edition casing (the lookup is case-insensitive anyway). Kept
 * deliberately conservative — a false "IA" badge is worse than a missing one — and meant
 * to grow over time.
 *
 * The journal can also flag AI companies per-edition via the `ai` field on lead/deal/brèves
 * (see types.ts + EditionProvider), which is accumulated on top of this list.
 */
export const aiStartups: string[] = [
  'Aqemia',
  'Bioptimus',
  'Owkin',
  'Insilico Medicine',
  'Qure.ai',
  'Iambic Therapeutics',
  'Abridge',
  'Hippocratic AI',
  'TandemAI',
  'Basecamp Research',
  'Raidium',
  'Primaa',
  'deepc',
  'Altis Labs',
  'Nym Health',
  'Us2.ai',
];

const AI_SET = new Set(aiStartups.map((n) => n.toLowerCase()));

/** True if this startup is a known AI-first company (exact-name, case-insensitive). */
export function isAiStartup(name: string): boolean {
  return AI_SET.has(name.trim().toLowerCase());
}
