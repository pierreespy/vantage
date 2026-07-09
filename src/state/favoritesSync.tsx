/**
 * Anonymous favorites reporting — the app-side "write half".
 *
 * Why: the morning generation researches only the startups that are actually
 * followed (the union), never the ~370-startup catalog. Favorites live on-device
 * (see src/state/favorites.tsx); this provider reports them anonymously so the
 * generation has a watchlist. Full contract: docs/perso-favoris.md + backend/README.md.
 *
 * Privacy shape (matches backend/firestore.rules EXACTLY):
 *   - identity is a Firebase anonymous uid (a random per-install id) — no account,
 *     no Sign in with Apple, no IDFA/IDFV, no PII.
 *   - we write `follows/<uid>` with ONLY { startups, updatedAt: serverTimestamp() }.
 *     Doc id == uid, so a client can physically only write its own row.
 *   - `startups` is already capped at 5 by FavoritesProvider.
 *
 * Consent gate: NOTHING is ever written unless the user explicitly opted in
 * (persisted in AsyncStorage). Decline → favorites stay purely local; can opt in
 * later. Reset → wipe local favorites + consent and blank the remote doc.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from '@firebase/auth';
import { getFirebaseAuth, getFirebaseDb } from '@/firebase/app';
import { useFavorites } from './favorites';

const CONSENT_KEY = 'vantage.favSyncConsent.v1';
const DEBOUNCE_MS = 1000;

/** unset = not decided yet (first launch), granted = reporting on, declined = off. */
export type SyncConsent = 'unset' | 'granted' | 'declined';

type FavoritesSyncContextValue = {
  /** Current consent choice. */
  consent: SyncConsent;
  /** True once the persisted consent has been read back. */
  consentResolved: boolean;
  /** Opt in — enables anonymous reporting from now on. */
  grant: () => void;
  /** Opt out — favorites stay purely on-device. */
  decline: () => void;
  /** Wipe local favorites + consent and blank the remote doc (if signed in). */
  reset: () => Promise<void>;
};

const FavoritesSyncContext = createContext<FavoritesSyncContextValue | null>(null);

/** Ensure an anonymous session and return its uid, or null on any failure. */
async function currentUid(): Promise<string | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;
  try {
    if (auth.currentUser) return auth.currentUser.uid;
    const cred = await signInAnonymously(auth);
    return cred.user.uid;
  } catch {
    return null;
  }
}

/** Write `follows/<uid> = { startups, updatedAt }`. Best-effort; never throws. */
async function writeFollow(startups: string[]): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  const uid = await currentUid();
  if (!uid) return;
  try {
    await setDoc(doc(db, 'follows', uid), {
      startups,
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Offline / rules / App Check — favorites keep working locally regardless.
  }
}

export function FavoritesSyncProvider({ children }: { children: React.ReactNode }) {
  const { followed, hydrated, clear } = useFavorites();

  const [consent, setConsent] = useState<SyncConsent>('unset');
  const [consentResolved, setConsentResolved] = useState(false);

  // Whether a non-empty set has already been reported in this app session. Gates the
  // "clear the remote doc when you remove your last favorite" case: we only write `[]`
  // if there was something to clear, so granting-with-zero-favorites never touches the
  // network (no session, no doc) — see docs/privacy-policy.md.
  const hasReportedNonEmpty = useRef(false);

  // Load the persisted consent choice once.
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(CONSENT_KEY)
      .then((raw) => {
        if (!active) return;
        if (raw === 'granted' || raw === 'declined') setConsent(raw);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setConsentResolved(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const grant = useCallback(() => {
    setConsent('granted');
    AsyncStorage.setItem(CONSENT_KEY, 'granted').catch(() => {});
  }, []);

  const decline = useCallback(() => {
    setConsent('declined');
    AsyncStorage.setItem(CONSENT_KEY, 'declined').catch(() => {});
  }, []);

  const reset = useCallback(async () => {
    // Blank the remote doc first if we already have a session, so the union drops
    // this install immediately (rules DENY delete — we overwrite with an empty list).
    const auth = getFirebaseAuth();
    if (auth?.currentUser) await writeFollow([]);
    hasReportedNonEmpty.current = false;
    clear();
    setConsent('unset');
    AsyncStorage.removeItem(CONSENT_KEY).catch(() => {});
  }, [clear]);

  // Report on every followed change, debounced — but ONLY with consent and once the
  // on-device favorites have hydrated (so we never overwrite the real set with the
  // seeded/empty pre-hydration state).
  useEffect(() => {
    if (consent !== 'granted' || !hydrated) return;
    // Privacy: no collection until the user follows at least one startup. Granting with
    // an empty set creates NO anonymous session and NO doc. The only time we write `[]`
    // here is to clear the server after the user removes their last favorite — i.e. only
    // once a non-empty set was already reported this session.
    if (followed.length === 0 && !hasReportedNonEmpty.current) return;
    const t = setTimeout(() => {
      if (followed.length > 0) hasReportedNonEmpty.current = true;
      writeFollow(followed);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [followed, consent, hydrated]);

  const value = useMemo<FavoritesSyncContextValue>(
    () => ({ consent, consentResolved, grant, decline, reset }),
    [consent, consentResolved, grant, decline, reset]
  );

  return (
    <FavoritesSyncContext.Provider value={value}>{children}</FavoritesSyncContext.Provider>
  );
}

export function useFavoritesSync(): FavoritesSyncContextValue {
  const ctx = useContext(FavoritesSyncContext);
  if (!ctx) throw new Error('useFavoritesSync must be used within a FavoritesSyncProvider');
  return ctx;
}
