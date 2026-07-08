/**
 * Shared favorites + user-catalog state.
 *
 * Holds:
 *  - `followed`: the set of favorited startup names (persisted);
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

export type CustomStartup = { name: string; sector: string };

type FavoritesContextValue = {
  /** Followed startup names, in the order they were added (seeded first). */
  followed: string[];
  isFollowed: (name: string) => boolean;
  toggle: (name: string) => void;
  /** Startups the user added manually (persisted), merged into the catalog. */
  customStartups: CustomStartup[];
  /** Add a user-typed startup to the catalog AND follow it. No-op if blank/duplicate. */
  addCustomStartup: (name: string) => void;
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
          if (Array.isArray(parsed)) setFollowed(parsed.filter((v) => typeof v === 'string'));
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

  const toggle = useCallback((name: string) => {
    setFollowed((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  }, []);

  const isFollowed = useCallback((name: string) => followed.includes(name), [followed]);

  const addCustomStartup = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    setCustomStartups((prev) =>
      prev.some((c) => c.name.toLowerCase() === key) ? prev : [...prev, { name: trimmed, sector: '' }]
    );
    setFollowed((prev) =>
      prev.some((n) => n.toLowerCase() === key) ? prev : [...prev, trimmed]
    );
  }, []);

  const value = useMemo<FavoritesContextValue>(
    () => ({ followed, isFollowed, toggle, customStartups, addCustomStartup, hydrated }),
    [followed, isFollowed, toggle, customStartups, addCustomStartup, hydrated]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within a FavoritesProvider');
  return ctx;
}
