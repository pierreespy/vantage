/**
 * Favoris data — the startup catalog and the seeded followed set.
 *
 * The 4 seeded favorites carry rich data (stage + recent news). The broader pool
 * can be searched and followed from the "Ajouter un favori" sheet; those entries
 * have no news yet (the morning generation task fills them in).
 */

export type NewsItem = { title: string; source: string; date: string; url: string };
export type Startup = { name: string; sector: string; stage?: string; news: NewsItem[] };

/** Sector filter chips shown in the Favoris header. */
export const favSectors = ['Toutes', 'Oncologie', 'MedTech', 'Digital Health', 'Diagnostics'] as const;

/** Startups initially marked as favorites. */
export const initialFollowed = ['Alderaan Bio', 'Owkin', 'Vitrogen', 'Flow Neuroscience'];

/** The 4 seeded favorites, with stage + news. */
const seeded: Startup[] = [
  {
    name: 'Alderaan Bio',
    sector: 'Oncologie',
    stage: 'Series B',
    news: [
      {
        title: 'Alderaan Bio lève 120 M€ en Series B',
        source: 'Sifted',
        date: 'Aujourd’hui',
        url: 'https://sifted.eu/articles/alderaan-bio-series-b-oncologie',
      },
      {
        title: 'Recrutement d’un CMO issu de Servier Oncologie',
        source: 'Endpoints',
        date: 'Il y a 4 j',
        url: 'https://endpts.com/alderaan-bio-cmo-hire',
      },
    ],
  },
  {
    name: 'Owkin',
    sector: 'Digital Health',
    stage: 'Growth',
    news: [
      {
        title: 'Owkin étend son partenariat avec Sanofi (+30 M€)',
        source: 'Tech.eu',
        date: 'Hier',
        url: 'https://tech.eu/2026/07/owkin-sanofi-partnership',
      },
    ],
  },
  {
    name: 'Vitrogen',
    sector: 'MedTech',
    stage: 'Series A',
    news: [
      {
        title: 'Vitrogen boucle 24 M€ en Series A',
        source: 'EU-Startups',
        date: 'Il y a 2 j',
        url: 'https://www.eu-startups.com/2026/07/vitrogen-series-a',
      },
      {
        title: 'Feu vert de Swissmedic pour son essai pivot',
        source: 'Swissmedic',
        date: 'Il y a 6 j',
        url: 'https://www.swissmedic.ch/vitrogen-pivotal',
      },
    ],
  },
  {
    name: 'Flow Neuroscience',
    sector: 'Digital Health',
    stage: 'Series B',
    news: [
      {
        title: 'Flow Neuroscience étend sa Series B à 18 M€',
        source: 'Sifted',
        date: 'Il y a 3 j',
        url: 'https://sifted.eu/articles/flow-neuroscience-series-b-extension',
      },
    ],
  },
];

/** Broader pool searchable from the "+" sheet (no news yet). */
const pool: Startup[] = [
  { name: 'Aboleris Pharma', sector: 'Immuno-inflammation', news: [] },
  { name: 'Amolyt Pharma', sector: 'Biotech', news: [] },
  { name: 'Abridge', sector: 'Digital Health', news: [] },
  { name: 'Bioptimus', sector: 'Digital Health', news: [] },
  { name: 'CardioWave', sector: 'MedTech', news: [] },
  { name: 'Chroma Medicine', sector: 'Biotech plateforme', news: [] },
  { name: 'Cure51', sector: 'Oncologie', news: [] },
  { name: 'DNA Script', sector: 'Biotech plateforme', news: [] },
  { name: 'Gleamer', sector: 'Digital Health', news: [] },
  { name: 'Helix DX', sector: 'Diagnostics', news: [] },
  { name: 'Volta Medical', sector: 'MedTech', news: [] },
];

/** Full catalog, de-duplicated by name (seeded data wins over the pool). */
export const catalog: Startup[] = (() => {
  const byName = new Map<string, Startup>();
  for (const s of pool) byName.set(s.name, s);
  for (const s of seeded) byName.set(s.name, s); // seeded overrides pool (e.g. Owkin)
  return Array.from(byName.values());
})();

/** Look up a startup by name. */
export function startupByName(name: string): Startup | undefined {
  return catalog.find((s) => s.name === name);
}
