/**
 * Lazy, crash-proof Firebase init (Expo Go compatible).
 *
 * This is the ONLY server touchpoint in an otherwise on-device app: it exists so
 * the morning generation knows which startups are actually followed (see
 * docs/perso-favoris.md). Everything here is:
 *   - LAZY   — nothing initializes until a getter is first called, so a cold start
 *              that never reports never pays the cost.
 *   - GUARDED — every init path is wrapped in try/catch and degrades to `null`.
 *              Favorites must keep working locally; a Firebase failure (offline,
 *              blocked, misconfigured) must NEVER crash the app or blank a screen.
 *
 * RN-persistence gotcha (firebase v12): `getReactNativePersistence` is NOT exported
 * by the `firebase/auth` wrapper (it resolves to the browser build). It lives on the
 * underlying `@firebase/auth` package under its `react-native` export condition
 * (which both Metro and this project's tsconfig `customConditions` honour). We import
 * ALL auth from `@firebase/auth` so a single auth build loads (no dual-package hazard)
 * and `getReactNativePersistence` is available for `expo export` to bundle.
 *
 * App Check: intentionally NOT wired here. reCAPTCHA is a web construct and the
 * native App Attest / DeviceCheck providers need a custom native build (not Expo Go).
 * App Check enforcement is deferred to that native build; until then the write path
 * relies on anonymous auth + the Firestore rules (doc id == uid, tight payload).
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { initializeAuth, getAuth, type Auth } from '@firebase/auth';
// `getReactNativePersistence` ships in @firebase/auth's `react-native` entry — which
// Metro resolves at runtime — but it is absent from the package's public TypeScript
// surface (TS matches the top-level `types` condition first). Import it separately and
// silence the type-only gap; at runtime it is a real function in the RN build.
// @ts-expect-error -- present at runtime via @firebase/auth's react-native export
import { getReactNativePersistence } from '@firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseConfig } from './config';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let initTried = false;

/** Initialize once, swallowing any failure. Idempotent and safe to call often. */
function ensureInit(): void {
  if (initTried) return;
  initTried = true;
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);

    // AsyncStorage persistence keeps the anonymous uid stable across launches, so a
    // given install maps to exactly one `follows/<uid>` document.
    try {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch {
      // Already initialized (e.g. Fast Refresh) — reuse the existing instance.
      auth = getAuth(app);
    }

    db = getFirestore(app);
  } catch {
    // Any failure → no-op mode. Favorites stay fully functional on-device.
    app = null;
    auth = null;
    db = null;
  }
}

/** The Auth instance, or null if Firebase could not initialize. */
export function getFirebaseAuth(): Auth | null {
  ensureInit();
  return auth;
}

/** The Firestore instance, or null if Firebase could not initialize. */
export function getFirebaseDb(): Firestore | null {
  ensureInit();
  return db;
}
