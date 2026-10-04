/**
 * Scrolling ticker (marquee) — the design's continuously-looping band of the day's
 * MedTech moves. Each chip is an ink pill: COMPANY · value · symbol, the symbol telling
 * the kind of move (see TICKER_KINDS): ↑ levée, ⇄ M&A, ✓ réglementaire, ◆ avancée tech /
 * clinique, ✦ naissance. The row is duplicated and translated so the loop is seamless.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import type { TickerItem, TickerKind } from '@/content/types';
import { colors } from '@/theme';
import { fonts } from '@/fonts';

const PX_PER_SECOND = 34; // gentle, readable scroll speed

/** Symbol + colors per kind: `chip` on the ink pill, `legend` on paper. Display order. */
export const TICKER_KINDS: Record<
  TickerKind,
  { symbol: string; label: string; chip: string; legend: string }
> = {
  tech: { symbol: '◆', label: 'Avancée', chip: colors.tickerTech, legend: colors.claret },
  reg: { symbol: '✓', label: 'Réglementaire', chip: colors.tickerReg, legend: colors.accent },
  new: { symbol: '✦', label: 'Naissance', chip: colors.tickerNew, legend: colors.ink },
  lev: { symbol: '↑', label: 'Levée', chip: colors.tickerLev, legend: colors.levGreen },
  mna: { symbol: '⇄', label: 'M&A', chip: colors.tickerMna, legend: colors.mnaAmber },
};

/** Unknown kinds (a newer edition than the app) render as a levée rather than crash. */
export const tickerKind = (kind: string) => TICKER_KINDS[kind as TickerKind] ?? TICKER_KINDS.lev;

function Chip({ item }: { item: TickerItem }) {
  const k = tickerKind(item.kind);
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{item.company} </Text>
      <Text style={styles.chipAmount}>{item.amount} </Text>
      <Text style={[styles.chipDelta, { color: k.chip }]}>{k.symbol}</Text>
    </View>
  );
}

export function Ticker({ items }: { items: TickerItem[] }) {
  const translate = useRef(new Animated.Value(0)).current;
  const [setWidth, setSetWidth] = useState(0);

  useEffect(() => {
    if (setWidth <= 0) return;
    translate.setValue(0);
    const duration = (setWidth / PX_PER_SECOND) * 1000;
    const anim = Animated.loop(
      Animated.timing(translate, {
        toValue: -setWidth,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [setWidth, translate]);

  return (
    <View style={styles.viewport}>
      <Animated.View style={[styles.track, { transform: [{ translateX: translate }] }]}>
        {/* first set — measured to drive the loop distance */}
        <View
          style={styles.set}
          onLayout={(e) => setSetWidth(e.nativeEvent.layout.width)}
        >
          {items.map((it, i) => (
            <Chip key={`a${i}`} item={it} />
          ))}
        </View>
        {/* duplicate set — fills the gap as the first scrolls away */}
        <View style={styles.set}>
          {items.map((it, i) => (
            <Chip key={`b${i}`} item={it} />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: { overflow: 'hidden' },
  track: { flexDirection: 'row' },
  set: { flexDirection: 'row' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.ink,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    marginRight: 8,
  },
  chipText: { fontFamily: fonts.mono, fontSize: 11, color: colors.paper },
  chipAmount: { fontFamily: fonts.monoSemi, fontSize: 11, color: colors.paper },
  chipDelta: { fontFamily: fonts.mono, fontSize: 11 },
});
