/**
 * Sélecteur MedTech / Biotech — pilule segmentée compacte (en-tête du Journal,
 * Réglages). Change le thème de veille, donc l'édition chargée par EditionProvider.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSettings } from '../state/settings';
import { THEMES } from '../i18n/strings';
import { PressableScale } from './PressableScale';
import { hapticTap } from '../lib/haptics';
import { colors, border, glass } from '../theme';
import { fonts } from '../fonts';

export function ThemeSwitch({ stretch = false }: { stretch?: boolean }) {
  const { theme, setTheme } = useSettings();
  return (
    <View style={[styles.wrap, stretch && styles.stretch]}>
      {THEMES.map(({ code, label }) => {
        const active = code === theme;
        return (
          <PressableScale
            key={code}
            haptic={false}
            onPress={() => {
              if (active) return;
              hapticTap();
              setTheme(code);
            }}
            style={[styles.item, stretch && { flex: 1 }, active && styles.itemActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignSelf: 'center',
    padding: 3,
    gap: 3,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: border.accentStrong,
    backgroundColor: glass.accentFillFaint,
  },
  stretch: { alignSelf: 'stretch' },
  item: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 100, alignItems: 'center' },
  itemActive: { backgroundColor: colors.accent },
  text: {
    fontFamily: fonts.archivoBold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  textActive: { color: colors.paper },
});
