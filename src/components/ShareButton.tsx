/**
 * ShareButton — the trigger that builds and shares a card.
 *
 * Two looks: a labelled accent pill (Deal / Mot du jour) and an icon-only button
 * (compact, for brève rows). Uses the iOS-style "share" glyph. Disabled while a
 * capture is in flight to avoid double-taps.
 *
 * Le bouton s'enfonce au toucher et émet une vibration légère (PressableScale) — la
 * capture puis la feuille de partage iOS mettent un instant à s'ouvrir, ce retour
 * immédiat évite l'impression que le tap n'a pas été pris.
 */
import { useSettings } from '@/state/settings';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { PressableScale } from '@/components/PressableScale';
import { colors, border, glass } from '@/theme';
import { fonts } from '@/fonts';

function ShareGlyph({ size = 18, color = colors.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill="none" stroke={color} strokeWidth={40} strokeLinecap="round" strokeLinejoin="round">
      {/* corbeille ouverte en haut-droite */}
      <Path d="M170 150 H35 V480 H445 V380" />
      {/* flèche courbe qui sort vers la droite */}
      <Path d="M330 120 L330 40 L500 172 L330 305 L330 225 C270 270 230 320 180 360 C158 348 148 322 150 300 C210 240 250 175 330 120 Z" />
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
  const { t } = useSettings();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      activeScale={0.9}
      accessibilityRole="button"
      accessibilityLabel={label ? t.common.shareLabel(label) : t.common.share}
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
    </PressableScale>
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
