/**
 * Shared favorites + user-catalog state.
 *
 * Holds:
 *  - `followed`: the set of favorited startup names (persisted). Capped at the
 *    tier's limit — new users start with none and pick their own.
 *  - `customStartups`: startups the user added by hand (persisted) — real startups
 *    not yet in the built-in catalog. They become searchable like any other.
 *  - `tier`: 'restricted' (1 favorite) or 'extended' (6). New installs are restricted;
 *    entering the day's access code unlocks 'extended' PERMANENTLY on this device
 *    (see AccessProvider / docs/perso-favoris.md). On hydration the followed set is
 *    truncated to the current tier's limit — a restricted user carrying favorites from
 *    an older build keeps only the first one.
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
const TIER_KEY = 'vantage.tier.v1';

/** Access tiers. Restricted is the default; extended is unlocked with the day's code. */
export type Tier = 'restricted' | 'extended';

/** Favorites cap per tier. Extended is bounded too, to keep the feed focused and bound
 *  the distinct-startup set the morning generation has to research (and the anonymous
 *  report, whose backend rules cap the list — keep EXTENDED_LIMIT and
 *  backend/firestore.rules in lockstep). */
export const RESTRICTED_LIMIT = 1;
export const EXTENDED_LIMIT = 6;

export function limitForTier(tier: Tier): number {
  return tier === 'extended' ? EXTENDED_LIMIT : RESTRICTED_LIMIT;
}

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
  /** Remove every followed startup (used by the "reset" of anonymous reporting). */
  clear: () => void;
  /** Current access tier. */
  tier: Tier;
  /** Switch to the extended tier (persisted). Called after the day's code is verified.
   *  Does NOT restore favorites truncated while restricted — the user re-adds them. */
  unlockExtended: () => void;
  /** Max followed startups for the current tier. */
  limit: number;
  /** True once the followed set is at the current tier's cap. */
  atLimit: boolean;
  /** True until the persisted data has been read back. */
  hydrated: boolean;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [followed, setFollowed] = useState<string[]>(initialFollowed);
  const [customStartups, setCustomStartups] = useState<CustomStartup[]>([]);
  const [tier, setTier] = useState<Tier>('restricted');
  const [hydrated, setHydrated] = useState(false);

  const limit = limitForTier(tier);

  // Load persisted state once on mount. Resolve the tier first, then trim the followed
  // set to that tier's limit (the "truncate to 1 for restricted" migration).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [rawFollowed, rawCustom, rawTier] = await Promise.all([
          AsyncStorage.getItem(FOLLOWED_KEY),
          AsyncStorage.getItem(CUSTOM_KEY),
          AsyncStorage.getItem(TIER_KEY),
        ]);
        if (!active) return;
        const resolvedTier: Tier = rawTier === 'extended' ? 'extended' : 'restricted';
        setTier(resolvedTier);
        const cap = limitForTier(resolvedTier);
        if (rawFollowed) {
          const parsed = JSON.parse(rawFollowed);
          if (Array.isArray(parsed)) {
            // Trim to the tier's cap — a restricted user with a legacy 5-startup set
            // keeps only the first (the agreed migration; the rest are dropped).
            setFollowed(parsed.filter((v) => typeof v === 'string').slice(0, cap));
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

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(TIER_KEY, tier).catch(() => {});
  }, [tier, hydrated]);

  const toggle = useCallback(
    (name: string): boolean => {
      if (followed.includes(name)) {
        setFollowed((prev) => prev.filter((n) => n !== name));
        return true;
      }
      if (followed.length >= limit) return false;
      // Re-check the cap inside the updater so two near-simultaneous taps can't
      // both pass the guard against a stale `followed` closure and push past the cap.
      setFollowed((prev) =>
        prev.includes(name) || prev.length >= limit ? prev : [...prev, name]
      );
      return true;
    },
    [followed, limit]
  );

  const isFollowed = useCallback((name: string) => followed.includes(name), [followed]);

  const clear = useCallback(() => setFollowed([]), []);

  const unlockExtended = useCallback(() => setTier('extended'), []);

  const addCustomStartup = useCallback(
    (name: string): boolean => {
      const trimmed = name.trim();
      if (!trimmed) return false;
      // Mirror backend/firestore.rules, which bounds each startup string to <= 80 chars.
      // Rejecting here avoids a locally-accepted name whose report the rules would then
      // silently drop — which would quietly remove this install from the union.
      if (trimmed.length > 80) return false;
      const key = trimmed.toLowerCase();
      const already = followed.some((n) => n.toLowerCase() === key);
      if (!already && followed.length >= limit) return false;
      setCustomStartups((prev) =>
        prev.some((c) => c.name.toLowerCase() === key) ? prev : [...prev, { name: trimmed, sector: '' }]
      );
      setFollowed((prev) =>
        prev.some((n) => n.toLowerCase() === key) || prev.length >= limit
          ? prev
          : [...prev, trimmed]
      );
      return true;
    },
    [followed, limit]
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({
      followed,
      isFollowed,
      toggle,
      customStartups,
      addCustomStartup,
      clear,
      tier,
      unlockExtended,
      limit,
      atLimit: followed.length >= limit,
      hydrated,
    }),
    [followed, isFollowed, toggle, customStartups, addCustomStartup, clear, tier, unlockExtended, limit, hydrated]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within a FavoritesProvider');
  return ctx;
}
