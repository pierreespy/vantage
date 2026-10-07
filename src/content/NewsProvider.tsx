/**
 * Per-startup news provider — a faithful twin of EditionProvider.
 *
 * On launch (and on pull-to-refresh) it fetches the shared per-startup news JSON
 * from config.newsUrl. Resolution order, so the app NEVER blanks:
 *   1. live  — freshly fetched from the URL (also cached for next time)
 *   2. cache — last successfully fetched news (works offline)
 *   3. empty — no news at all (before the file exists / first cold start)
 *
 * The Favoris screen filters this shared file down to the user's on-device
 * favorites via `newsFor(name)` — exact startup-name lookup. See docs/perso-favoris.md.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSettings } from '@/state/settings';
import { fetchLocalized, localizedKey } from './localized';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from '@/config';
import { isStartupNews, type NewsItem, type StartupNews } from './newsTypes';

const CACHE_KEY = 'vantage.startupNews.v1';

export type NewsSource = 'empty' | 'cache' | 'live';

const EMPTY_NEWS: StartupNews = { generatedAt: '', news: {} };

type NewsContextValue = {
  /** Recent news for a startup by exact name (empty array if none). */
  newsFor: (name: string) => NewsItem[];
  /** Where the current news came from. */
  source: NewsSource;
  /** True while a fetch is in flight. */
  loading: boolean;
  /** Re-fetch the live news (used by pull-to-refresh). */
  refresh: () => Promise<void>;
};

const NewsContext = createContext<NewsContextValue | null>(null);

export function NewsProvider({ children }: { children: React.ReactNode }) {
  const { language } = useSettings();
  const [data, setData] = useState<StartupNews>(EMPTY_NEWS);
  const [source, setSource] = useState<NewsSource>('empty');
  const [loading, setLoading] = useState(false);

  // Warm up from cache immediately, so a cold offline start shows the last news.
  useEffect(() => {
    AsyncStorage.getItem(localizedKey(CACHE_KEY, language))
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (isStartupNews(parsed)) {
          setData(parsed);
          setSource((s) => (s === 'empty' ? 'cache' : s));
        }
      })
      .catch(() => {});
  }, [language]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: parsed } = await fetchLocalized(config.newsUrl, language, (d) =>
        isStartupNews(d) ? d : null
      );
      setData(parsed);
      setSource('live');
      AsyncStorage.setItem(localizedKey(CACHE_KEY, language), JSON.stringify(parsed)).catch(() => {});
    } catch {
      // Keep whatever we already have (cache or empty) — never blank the screen.
    } finally {
      setLoading(false);
    }
  }, [language]);

  // Fetch once on mount.
  useEffect(() => {
    refresh();
  }, [refresh]);

  const newsFor = useCallback((name: string) => data.news[name] ?? [], [data]);

  const value = useMemo<NewsContextValue>(
    () => ({ newsFor, source, loading, refresh }),
    [newsFor, source, loading, refresh]
  );

  return <NewsContext.Provider value={value}>{children}</NewsContext.Provider>;
}

export function useStartupNews(): NewsContextValue {
  const ctx = useContext(NewsContext);
  if (!ctx) throw new Error('useStartupNews must be used within a NewsProvider');
  return ctx;
}
