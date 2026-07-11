/**
 * Morning push notifications — the app-side "opt-in + register" half.
 *
 * Why: Vantage is a daily-content app; the single biggest retention lever is a
 * punchy morning notification about the day's lead story (la une). The teaser text
 * is written by the generation task (`Edition.pushTeaser`) and sent at 07:30 by a
 * job in vantage-content. This provider only handles the CLIENT half: asking
 * permission at the right moment, and registering the device's Expo push token so
 * the sender knows where to deliver.
 *
 * Design (mirrors src/state/favoritesSync.tsx on purpose):
 *   - PERMISSION IS ASKED AFTER THE FIRST READ, never cold on launch. `noteRead()`
 *     is called when the user opens their first article; only then does the in-app
 *     primer surface. On iOS a permission refusal is near-permanent, so we prime
 *     with our own on-brand modal first and only trigger the OS dialog on « Activer ».
 *   - CONSENT is persisted ('unset' | 'granted' | 'declined'). Declining keeps the
 *     app silent; the user can still enable notifications later from iOS Settings.
 *   - IDENTITY reuses the Firebase anonymous uid (same as favorites reporting): the
 *     token doc id == uid, so an install can only ever write its own row. No account,
 *     no PII. Everything is best-effort and never throws — a failure just means no
 *     push, the app keeps working.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from '@firebase/auth';
import { getFirebaseAuth, getFirebaseDb } from '@/firebase/app';

const CONSENT_KEY = 'vantage.notifConsent.v1';
const HAS_READ_KEY = 'vantage.notifHasRead.v1';

/** unset = not decided yet, granted = registered, declined = off (re-enable via iOS). */
export type NotifConsent = 'unset' | 'granted' | 'declined';

type NotificationsContextValue = {
  consent: NotifConsent;
  /** True once the persisted consent has been read back. */
  consentResolved: boolean;
  /** Whether the in-app primer should be shown now (undecided + has read). */
  primerVisible: boolean;
  /** Signal that the user just read something — arms the "ask after first read" flow. */
  noteRead: () => void;
  /** Opt in: trigger the OS permission dialog and register the push token.
   *  Returns true only if permission was granted and a token was obtained. */
  grant: () => Promise<boolean>;
  /** Opt out: no push; the user can still enable it later from iOS Settings. */
  decline: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

// Foreground behaviour: if a push lands while the app is open, still show the banner.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

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

/** Request permission (if needed) and return the Expo push token, or null. */
async function registerForPush(): Promise<string | null> {
  // Simulators / web can't receive a real push token.
  if (!Device.isDevice) return null;
  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return token.data;
  } catch {
    return null;
  }
}

/** Write `pushTokens/<uid> = { token, platform, updatedAt }`. Never throws. */
async function writeToken(token: string): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  const uid = await currentUid();
  if (!uid) return;
  try {
    await setDoc(doc(db, 'pushTokens', uid), {
      token,
      platform: Platform.OS,
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Offline / rules — the app keeps working; we just won't get a morning push.
  }
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<NotifConsent>('unset');
  const [consentResolved, setConsentResolved] = useState(false);
  const [hasRead, setHasRead] = useState(false);

  // Load persisted consent + whether a read already happened on a previous session
  // (so a returning reader is offered notifications at launch, not only mid-session).
  useEffect(() => {
    let active = true;
    Promise.all([
      AsyncStorage.getItem(CONSENT_KEY),
      AsyncStorage.getItem(HAS_READ_KEY),
    ])
      .then(([rawConsent, rawRead]) => {
        if (!active) return;
        if (rawConsent === 'granted' || rawConsent === 'declined') setConsent(rawConsent);
        if (rawRead === '1') setHasRead(true);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setConsentResolved(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const noteRead = useCallback(() => {
    setHasRead((prev) => {
      if (!prev) AsyncStorage.setItem(HAS_READ_KEY, '1').catch(() => {});
      return true;
    });
  }, []);

  const grant = useCallback(async () => {
    const token = await registerForPush();
    if (!token) {
      // Permission refused (or no device token) — record as declined so the primer
      // doesn't reappear. The user can still flip it on later from iOS Settings.
      setConsent('declined');
      AsyncStorage.setItem(CONSENT_KEY, 'declined').catch(() => {});
      return false;
    }
    await writeToken(token);
    setConsent('granted');
    AsyncStorage.setItem(CONSENT_KEY, 'granted').catch(() => {});
    return true;
  }, []);

  const decline = useCallback(() => {
    setConsent('declined');
    AsyncStorage.setItem(CONSENT_KEY, 'declined').catch(() => {});
  }, []);

  // Re-register the token on later launches once already granted, so it stays fresh
  // (Expo push tokens can rotate). Best-effort, silent.
  useEffect(() => {
    if (consent !== 'granted') return;
    let active = true;
    registerForPush().then((token) => {
      if (active && token) writeToken(token);
    });
    return () => {
      active = false;
    };
  }, [consent]);

  const primerVisible = consentResolved && consent === 'unset' && hasRead;

  const value = useMemo<NotificationsContextValue>(
    () => ({ consent, consentResolved, primerVisible, noteRead, grant, decline }),
    [consent, consentResolved, primerVisible, noteRead, grant, decline]
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationsProvider');
  return ctx;
}
