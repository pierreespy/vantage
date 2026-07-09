/**
 * Per-startup news — the `startup-news.json` DATA CONTRACT.
 *
 * A sibling of the daily Edition (see types.ts). The generation task publishes one
 * shared file keyed by EXACT startup name; the app filters it down to the user's
 * on-device favorites. See docs/perso-favoris.md.
 *
 *   { generatedAt: "AAAA-MM-JJ", news: { "<Startup>": NewsItem[] } }
 *
 * A startup with no news of the day is ABSENT from the map (never an empty array).
 */
import type { NewsItem } from '@/data/favoris';

export type { NewsItem };

/** The whole per-startup news file. */
export type StartupNews = {
  /** ISO date AAAA-MM-JJ — used for a freshness label. */
  generatedAt: string;
  /** Startup name (exact, catalog casing) → its recent news items. */
  news: Record<string, NewsItem[]>;
};

/** Minimal runtime check that a fetched object looks like a StartupNews. */
export function isStartupNews(value: unknown): value is StartupNews {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  if (typeof s.generatedAt !== 'string') return false;
  if (!s.news || typeof s.news !== 'object' || Array.isArray(s.news)) return false;
  return Object.values(s.news as Record<string, unknown>).every(
    (items) =>
      Array.isArray(items) &&
      items.every((n) => {
        if (!n || typeof n !== 'object') return false;
        const it = n as Record<string, unknown>;
        return (
          typeof it.title === 'string' &&
          typeof it.source === 'string' &&
          typeof it.date === 'string' &&
          typeof it.url === 'string'
        );
      })
  );
}
