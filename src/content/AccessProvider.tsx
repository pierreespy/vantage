/**
 * Daily access-code provider — a faithful twin of NewsProvider/EditionProvider.
 *
 * On launch (and on pull-to-refresh) it fetches the day's access manifest from
 * config.accessUrl. Resolution order, so a code can always be checked once online and
 * the app never crashes offline:
 *   1. live   — freshly fetched from the URL (also cached for next time)
 *   2. cache  — last successfully fetched manifest (works offline)
 *   3. sample — the bundled manifest (public demo code only)
 *
 * It exposes `verify(input)` — a pure, offline check of a typed code against the
 * current manifest's salted hash. It NEVER holds or transmits the plaintext code.
 * The extended-tier entitlement itself lives in FavoritesProvider (persisted); this
 * provider is only the "is this today's code?" oracle. See docs/perso-favoris.md.
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
import { isAccessManifest, verifyCode, type AccessManifest } from './accessTypes';
import { sampleAccess } from './sampleAccess';

const CACHE_KEY = 'vantage.access.v1';

export type AccessSource = 'sample' | 'cache' | 'live';

type AccessContextValue = {
  /** True if `input` is the current day's code (offline, no network). */
  verify: (input: string) => boolean;
  /** Optional public hint for the unlock screen. */
  hint?: string;
  /** ISO date the current manifest is for. */
  date: string;
  /** Where the current manifest came from. */
  source: AccessSource;
  /** True while a fetch is in flight. */
  loading: boolean;
  /** True once a live/cached manifest has been obtained (i.e. not just the bundled
   *  demo). The real code can only be verified against a live/cached manifest. */
  ready: boolean;
  /** Re-fetch the live manifest. */
  refresh: () => Promise<void>;
};

const AccessContext = createContext<AccessContextValue | null>(null);

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const [manifest, setManifest] = useState<AccessManifest>(sampleAccess);
  const [source, setSource] = useState<AccessSource>('sample');
  const [loading, setLoading] = useState(false);

  // Warm up from cache immediately, so a returning user can unlock offline against the
  // last fetched code (rare, but keeps the twin's offline-first behaviour).
  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (isAccessManifest(parsed)) {
          setManifest(parsed);
          setSource((s) => (s === 'sample' ? 'cache' : s));
        }
      })
      .catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(config.accessUrl, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const parsed = await res.json();
      if (!isAccessManifest(parsed)) throw new Error('Malformed access manifest');
      setManifest(parsed);
      setSource('live');
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(parsed)).catch(() => {});
    } catch {
      // Keep whatever we already have (cache or sample) — never break the screen.
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch once on mount.
  useEffect(() => {
    refresh();
  }, [refresh]);

  const verify = useCallback((input: string) => verifyCode(manifest, input), [manifest]);

  const value = useMemo<AccessContextValue>(
    () => ({
      verify,
      hint: manifest.hint,
      date: manifest.date,
      source,
      loading,
      ready: source !== 'sample',
      refresh,
    }),
    [verify, manifest.hint, manifest.date, source, loading, refresh]
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess(): AccessContextValue {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error('useAccess must be used within an AccessProvider');
  return ctx;
}
