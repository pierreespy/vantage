/**
 * Morning notification — a single LOCAL daily reminder, no backend.
 *
 * Why local (not server push): Vantage's edition is a static JSON on GitHub Pages,
 * and we only need a generic "the day's edition is live" nudge at a fixed time — not
 * a headline-specific message. A local notification the device schedules itself needs
 * no push token, no Firestore, no sender job. Simpler, and the app stays server-light.
 *   (Trade-off, on purpose: the text is generic — it can't name today's lead, because
 *    the device doesn't have that content when the reminder is scheduled. Upgrading to
 *    a headline-specific push later would require a token registry + a 07:30 sender.)
 *
 * UX (kept from the opt-in design):
 *   - PERMISSION IS ASKED AFTER THE FIRST READ, never cold on launch. `noteRead()` is
 *     called when the user opens their first article; only then does the in-app primer
 *     surface. On « Activer » we trigger the OS dialog and schedule the 07:30 reminder.
 *   - CONSENT is persisted ('unset' | 'granted' | 'declined'). Declining cancels any
 *     schedule; the user can re-enable from iOS Settings. Everything is best-effort.
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
import * as Notifications from 'expo-notifications';

const CONSENT_KEY = 'vantage.notifConsent.v1';
const HAS_READ_KEY = 'vantage.notifHasRead.v1';

/** The fixed morning slot for the reminder (device local time). */
const NOTIF_HOUR = 7;
const NOTIF_MINUTE = 30;

const NOTIF_TITLE = 'The Vantage Chronicle';
const NOTIF_BODY = 'L’édition du jour est en ligne — la une santé vous attend.';

/** unset = not decided yet, granted = scheduled, declined = off (re-enable via iOS). */
export type NotifConsent = 'unset' | 'granted' | 'declined';

type NotificationsContextValue = {
  consent: NotifConsent;
  /** True once the persisted consent has been read back. */
  consentResolved: boolean;
  /** Whether the in-app primer should be shown now (undecided + has read). */
  primerVisible: boolean;
  /** Signal that the user just read something — arms the "ask after first read" flow. */
  noteRead: () => void;
  /** Opt in: trigger the OS permission dialog and schedule the daily 07:30 reminder.
   *  Returns true only if permission was granted and the reminder was scheduled. */
  grant: () => Promise<boolean>;
  /** Opt out: cancel the reminder; re-enable later from iOS Settings. */
  decline: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

// Foreground behaviour: if the reminder fires while the app is open, still show it.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Request permission (if needed) and (re)schedule the single daily reminder.
 *  Idempotent: clears any prior schedule first so relaunches never stack duplicates.
 *  Returns true only if permission is granted. Never throws. */
async function scheduleDailyReminder(): Promise<boolean> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return false;

    // We only ever schedule this one reminder, so clearing all is safe and keeps the
    // schedule from stacking across launches / re-grants.
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: { title: NOTIF_TITLE, body: NOTIF_BODY },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: NOTIF_HOUR,
        minute: NOTIF_MINUTE,
      },
    });
    return true;
  } catch {
    return false;
  }
}

/** Cancel the reminder. Best-effort, never throws. */
async function cancelReminder(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Nothing scheduled / unsupported — nothing to do.
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
    const ok = await scheduleDailyReminder();
    if (!ok) {
      // Permission refused — record as declined so the primer doesn't reappear. The
      // user can still flip it on later from iOS Settings.
      setConsent('declined');
      AsyncStorage.setItem(CONSENT_KEY, 'declined').catch(() => {});
      return false;
    }
    setConsent('granted');
    AsyncStorage.setItem(CONSENT_KEY, 'granted').catch(() => {});
    return true;
  }, []);

  const decline = useCallback(() => {
    setConsent('declined');
    AsyncStorage.setItem(CONSENT_KEY, 'declined').catch(() => {});
    cancelReminder();
  }, []);

  // Once granted, re-assert the schedule on launch (idempotent) so the reminder
  // survives edge cases like a cleared schedule. Permission is already granted here,
  // so this triggers no dialog.
  useEffect(() => {
    if (consentResolved && consent === 'granted') scheduleDailyReminder();
  }, [consentResolved, consent]);

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
