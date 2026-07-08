/**
 * Shared favorites state.
 *
 * Holds the set of followed startup names, persisted to AsyncStorage so favorites
 * survive app restarts. Exposed app-wide via context so the Favoris list and the
 * "Ajouter un favori" sheet stay in sync (design: "les deux partagent le même état").
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

const STORAGE_KEY = 'vantage.followed.v1';

type FavoritesContextValue = {
  /** Followed startup names, in the order they were added (seeded first). */
  followed: string[];
  isFollowed: (name: string) => boolean;
  toggle: (name: string) => void;
  /** True until the persisted set has been read back. */
  hydrated: boolean;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [followed, setFollowed] = useState<string[]>(initialFollowed);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted favorites once on mount.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (active && raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setFollowed(parsed.filter((v) => typeof v === 'string'));
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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(followed)).catch(() => {});
  }, [followed, hydrated]);

  const toggle = useCallback((name: string) => {
    setFollowed((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  }, []);

  const isFollowed = useCallback((name: string) => followed.includes(name), [followed]);

  const value = useMemo<FavoritesContextValue>(
    () => ({ followed, isFollowed, toggle, hydrated }),
    [followed, isFollowed, toggle, hydrated]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within a FavoritesProvider');
  return ctx;
}
