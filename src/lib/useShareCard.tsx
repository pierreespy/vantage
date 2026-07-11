/**
 * Share-card capture + share.
 *
 * Renders a <ShareCard> OFF-SCREEN at full 1080px, snapshots it to a PNG with
 * react-native-view-shot, and hands the file to the native share sheet (expo-sharing)
 * — so the user picks LinkedIn / Messages / Mail themselves. Nothing is generated ahead
 * of time: the card is built on demand from data already in memory, then torn down.
 *
 * Kept as a provider so the off-screen host lives once at the root and any screen can
 * call `shareCard(data)`. Best-effort: a capture/share failure never throws to the UI.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { ShareCard, CARD_SIZE, type ShareCardData } from '@/components/ShareCard';

type ShareContextValue = {
  /** Build the card for `data`, snapshot it, and open the native share sheet. */
  shareCard: (data: ShareCardData) => Promise<void>;
  /** True while a capture/share is in flight (disable the trigger to avoid double-taps). */
  sharing: boolean;
};

const ShareContext = createContext<ShareContextValue | null>(null);

/** Resolve after two frames, so the off-screen card is laid out before we snapshot it. */
function nextFrames(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
}

export function ShareProvider({ children }: { children: React.ReactNode }) {
  const hostRef = useRef<View>(null);
  const [card, setCard] = useState<ShareCardData | null>(null);
  const busy = useRef(false);
  const [sharing, setSharing] = useState(false);

  const shareCard = useCallback(async (data: ShareCardData) => {
    if (busy.current) return;
    busy.current = true;
    setSharing(true);
    setCard(data);
    try {
      await nextFrames();
      const uri = await captureRef(hostRef, {
        format: 'png',
        quality: 1,
        width: CARD_SIZE,
        height: CARD_SIZE,
        result: 'tmpfile',
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          UTI: 'public.png',
          dialogTitle: 'Partager',
        });
      }
    } catch {
      // Capture/share unavailable — silently no-op; the app keeps working.
    } finally {
      setCard(null);
      busy.current = false;
      setSharing(false);
    }
  }, []);

  return (
    <ShareContext.Provider value={{ shareCard, sharing }}>
      {children}
      {/* Off-screen render target: laid out at full 1080px but never visible. */}
      <View style={styles.offscreen} pointerEvents="none" collapsable={false}>
        <View ref={hostRef} collapsable={false}>
          {card ? <ShareCard data={card} /> : null}
        </View>
      </View>
    </ShareContext.Provider>
  );
}

export function useShareCard(): ShareContextValue {
  const ctx = useContext(ShareContext);
  if (!ctx) throw new Error('useShareCard must be used within a ShareProvider');
  return ctx;
}

const styles = StyleSheet.create({
  // Positioned far off-screen so it's laid out (capturable) but invisible.
  offscreen: { position: 'absolute', left: -(CARD_SIZE + 200), top: 0, opacity: 0 },
});
