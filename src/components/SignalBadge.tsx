/**
 * SignalBadge — a small tag telling WHAT KIND of signal a news item is
 * (Réglementaire, Clinique, Brevet, Partenariat, Dirigeant… as well as Levée / M&A).
 *
 * The whole point of the app is to catch EARLY signals — by the time a fundraise or an
 * M&A is out, it's "too late". So early signals get the pétrole accent to stand out;
 * funding/M&A (the late signals) are muted. Used inline in the Journal and Favoris flows.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SIGNAL_TYPE_LABELS, isEarlySignal, type SignalType } from '@/content/signalTypes';
import { colors, border, glass } from '@/theme';
import { fonts } from '@/fonts';

export function SignalBadge({ type }: { type: SignalType }) {
  const early = isEarlySignal(type);
  return (
    <View style={[styles.badge, early ? styles.early : styles.late]}>
      <Text style={[styles.text, early ? styles.earlyText : styles.lateText]}>
        {SIGNAL_TYPE_LABELS[type]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
  },
  // early signals (regulatory, clinical, patent…) — pétrole accent, they pop
  early: { backgroundColor: glass.accentFill, borderColor: border.accentStrong },
  earlyText: { color: colors.accent },
  // funding / M&A — muted, they're the "too late" signals
  late: { backgroundColor: 'transparent', borderColor: border.medium },
  lateText: { color: colors.ink50 },
  text: {
    fontFamily: fonts.archivoBold,
    fontSize: 9,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
});
