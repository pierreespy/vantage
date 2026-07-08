/**
 * Daily content provider.
 *
 * On launch (and on pull-to-refresh) it fetches the day's edition JSON from
 * config.contentUrl. Resolution order, so the app ALWAYS shows something:
 *   1. live   — freshly fetched from the URL (also cached for next time)
 *   2. cache  — last successfully fetched edition (works offline)
 *   3. sample — the edition bundled inside the app
 *
 * Exposed app-wide so every screen reads the same edition.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from '@/config';
import { sampleEdition } from './sampleEdition';
import { isEdition, type Edition } from './types';

const CACHE_KEY = 'vantage.edition.v1';

export type EditionSource = 'sample' | 'cache' | 'live';

type EditionContextValue = {
  edition: Edition;
  /** Where the current edition came from. */
  source: EditionSource;
  /** True while a fetch is in flight. */
  loading: boolean;
  /** Re-fetch the live edition (used by pull-to-refresh). */
  refresh: () => Promise<void>;
};

const EditionContext = createContext<EditionContextValue | null>(null);

export function EditionProvider({ children }: { children: React.ReactNode }) {
  const [edition, setEdition] = useState<Edition>(sampleEdition);
  const [source, setSource] = useState<EditionSource>('sample');
  const [loading, setLoading] = useState(false);

  // Warm up from cache immediately, so a cold offline start shows the last edition.
  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (isEdition(parsed)) {
          setEdition(parsed);
          setSource((s) => (s === 'sample' ? 'cache' : s));
        }
      })
      .catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(config.contentUrl, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!isEdition(data)) throw new Error('Malformed edition');
      setEdition(data);
      setSource('live');
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data)).catch(() => {});
    } catch {
      // Keep whatever we already have (cache or sample) — never blank the screen.
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch once on mount.
  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<EditionContextValue>(
    () => ({ edition, source, loading, refresh }),
    [edition, source, loading, refresh]
  );

  return <EditionContext.Provider value={value}>{children}</EditionContext.Provider>;
}

export function useEdition(): EditionContextValue {
  const ctx = useContext(EditionContext);
  if (!ctx) throw new Error('useEdition must be used within an EditionProvider');
  return ctx;
}
