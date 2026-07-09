/**
 * Favoris data — the startup catalog and the seeded followed set.
 *
 * The 4 seeded favorites carry rich data (stage + recent news). The broader pool
 * can be searched and followed from the "Ajouter un favori" sheet; those entries
 * have no news yet (the morning generation task fills them in).
 */
import { startupCatalog } from './startups';

export type NewsItem = {
  title: string;
  source: string;
  /** Human display label (absolute FR date, e.g. "8 juil. 2026"). */
  date: string;
  url: string;
  /** ISO AAAA-MM-JJ machine date. Set by the news routine for the 30-day sliding
   *  window + ordering; absent on legacy seeded items. */
  publishedAt?: string;
};
export type Startup = { name: string; sector: string; stage?: string; news: NewsItem[] };

/** Sector filter chips shown in the Favoris header. */
export const favSectors = ['Toutes', 'Oncologie', 'MedTech', 'Digital Health', 'Diagnostics'] as const;

/** Startups initially marked as favorites. New users start with none — each person
 *  picks up to FAVORITES_LIMIT (see src/state/favorites.tsx) from the catalog. */
export const initialFollowed: string[] = [];

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
        url: 'https://sifted.eu',
      },
      {
        title: 'Recrutement d’un CMO issu de Servier Oncologie',
        source: 'Endpoints',
        date: 'Il y a 4 j',
        url: 'https://endpts.com',
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
        url: 'https://tech.eu',
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
        url: 'https://www.eu-startups.com',
      },
      {
        title: 'Feu vert de Swissmedic pour son essai pivot',
        source: 'Swissmedic',
        date: 'Il y a 6 j',
        url: 'https://www.swissmedic.ch',
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
        url: 'https://sifted.eu',
      },
    ],
  },
];

/** Broader searchable pool: the real startup catalog (no news yet). */
const pool: Startup[] = startupCatalog.map((s) => ({
  name: s.name,
  sector: s.sector,
  news: [],
}));

/** Full catalog, de-duplicated by name (seeded data wins over the pool). */
export const catalog: Startup[] = (() => {
  const byName = new Map<string, Startup>();
  for (const s of pool) byName.set(s.name.toLowerCase(), s);
  for (const s of seeded) byName.set(s.name.toLowerCase(), s); // seeded overrides pool (e.g. Owkin)
  return Array.from(byName.values());
})();

/** Look up a startup by name. */
export function startupByName(name: string): Startup | undefined {
  return catalog.find((s) => s.name === name);
}
