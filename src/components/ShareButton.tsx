/**
 * ShareButton — the trigger that builds and shares a card.
 *
 * Two looks: a labelled accent pill (Deal / Mot du jour) and an icon-only button
 * (compact, for brève rows). Uses the iOS-style "share" glyph. Disabled while a
 * capture is in flight to avoid double-taps.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, border, glass } from '@/theme';
import { fonts } from '@/fonts';

function ShareGlyph({ size = 18, color = colors.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3v11" />
      <Path d="M8 7l4-4 4 4" />
      <Path d="M6 12H5a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2h-1" />
    </Svg>
  );
}

export function ShareButton({
  onPress,
  label,
  disabled = false,
}: {
  onPress: () => void;
  /** When set, renders a labelled pill; otherwise an icon-only button. */
  label?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label ? `Partager : ${label}` : 'Partager'}
      hitSlop={8}
      style={[label ? styles.pill : styles.icon, disabled && styles.disabled]}
    >
      {label ? (
        <View style={styles.pillInner}>
          <ShareGlyph size={15} />
          <Text style={styles.pillText}>{label}</Text>
        </View>
      ) : (
        <ShareGlyph />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderWidth: 1,
    borderColor: border.accentStrong,
    backgroundColor: glass.accentFill,
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  pillInner: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  pillText: {
    fontFamily: fonts.archivoBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  icon: { padding: 2 },
  disabled: { opacity: 0.4 },
});
