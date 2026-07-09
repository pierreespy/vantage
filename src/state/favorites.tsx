/**
 * Shared favorites + user-catalog state.
 *
 * Holds:
 *  - `followed`: the set of favorited startup names (persisted). Capped at
 *    `FAVORITES_LIMIT` — new users start with none and pick their own.
 *  - `customStartups`: startups the user added by hand (persisted) — real startups
 *    not yet in the built-in catalog. They become searchable like any other.
 *
 * Exposed app-wide via context so the Favoris list and the "Ajouter un favori"
 * sheet stay in sync.
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
import { initialFollowed } from '../data/favoris';

const FOLLOWED_KEY = 'vantage.followed.v1';
const CUSTOM_KEY = 'vantage.customStartups.v1';

/** Max number of startups a user can follow. Keeps the feed focused and bounds
 *  the distinct-startup set the morning generation has to research. */
export const FAVORITES_LIMIT = 5;

export type CustomStartup = { name: string; sector: string };

type FavoritesContextValue = {
  /** Followed startup names, in the order they were added. */
  followed: string[];
  isFollowed: (name: string) => boolean;
  /** Toggle a startup. Removing always applies. Adding applies only while under
   *  the limit. Returns true if the change was applied, false if blocked by the cap. */
  toggle: (name: string) => boolean;
  /** Startups the user added manually (persisted), merged into the catalog. */
  customStartups: CustomStartup[];
  /** Add a user-typed startup to the catalog AND follow it. Returns false if blank,
   *  a duplicate that would exceed the cap, or blocked by the cap. */
  addCustomStartup: (name: string) => boolean;
  /** Max followed startups (see FAVORITES_LIMIT). */
  limit: number;
  /** True once the followed set is at the cap. */
  atLimit: boolean;
  /** True until the persisted data has been read back. */
  hydrated: boolean;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [followed, setFollowed] = useState<string[]>(initialFollowed);
  const [customStartups, setCustomStartups] = useState<CustomStartup[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted state once on mount.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [rawFollowed, rawCustom] = await Promise.all([
          AsyncStorage.getItem(FOLLOWED_KEY),
          AsyncStorage.getItem(CUSTOM_KEY),
        ]);
        if (!active) return;
        if (rawFollowed) {
          const parsed = JSON.parse(rawFollowed);
          if (Array.isArray(parsed)) {
            // Trim to the cap in case an older build persisted more.
            setFollowed(parsed.filter((v) => typeof v === 'string').slice(0, FAVORITES_LIMIT));
          }
        }
        if (rawCustom) {
          const parsed = JSON.parse(rawCustom);
          if (Array.isArray(parsed)) {
            setCustomStartups(
              parsed
                .filter((c) => c && typeof c.name === 'string')
                .map((c) => ({ name: c.name, sector: typeof c.sector === 'string' ? c.sector : '' }))
            );
          }
        }
      } catch {
        // ignore — fall back to the seeded set
      } finally {
        if (active) setHydrated(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Persist on change (only after hydration, so we don't clobber stored data).
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(FOLLOWED_KEY, JSON.stringify(followed)).catch(() => {});
  }, [followed, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(customStartups)).catch(() => {});
  }, [customStartups, hydrated]);

  const toggle = useCallback(
    (name: string): boolean => {
      if (followed.includes(name)) {
        setFollowed((prev) => prev.filter((n) => n !== name));
        return true;
      }
      if (followed.length >= FAVORITES_LIMIT) return false;
      // Re-check the cap inside the updater so two near-simultaneous taps can't
      // both pass the guard against a stale `followed` closure and push past 5.
      setFollowed((prev) =>
        prev.includes(name) || prev.length >= FAVORITES_LIMIT ? prev : [...prev, name]
      );
      return true;
    },
    [followed]
  );

  const isFollowed = useCallback((name: string) => followed.includes(name), [followed]);

  const addCustomStartup = useCallback(
    (name: string): boolean => {
      const trimmed = name.trim();
      if (!trimmed) return false;
      const key = trimmed.toLowerCase();
      const already = followed.some((n) => n.toLowerCase() === key);
      if (!already && followed.length >= FAVORITES_LIMIT) return false;
      setCustomStartups((prev) =>
        prev.some((c) => c.name.toLowerCase() === key) ? prev : [...prev, { name: trimmed, sector: '' }]
      );
      setFollowed((prev) =>
        prev.some((n) => n.toLowerCase() === key) || prev.length >= FAVORITES_LIMIT
          ? prev
          : [...prev, trimmed]
      );
      return true;
    },
    [followed]
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({
      followed,
      isFollowed,
      toggle,
      customStartups,
      addCustomStartup,
      limit: FAVORITES_LIMIT,
      atLimit: followed.length >= FAVORITES_LIMIT,
      hydrated,
    }),
    [followed, isFollowed, toggle, customStartups, addCustomStartup, hydrated]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within a FavoritesProvider');
  return ctx;
}
