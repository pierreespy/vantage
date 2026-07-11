/**
 * Scrolling ticker (marquee) — the design's continuously-looping band of the day's
 * fundraises & M&A. Each chip is an ink pill: COMPANY · amount · ↑ (levée, green) or
 * ⇄ (M&A, amber). The row is duplicated and translated so the loop is seamless.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import type { TickerItem } from '@/content/types';
import { colors } from '@/theme';
import { fonts } from '@/fonts';

const PX_PER_SECOND = 34; // gentle, readable scroll speed

function Chip({ item }: { item: TickerItem }) {
  const isLev = item.kind === 'lev';
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{item.company} </Text>
      <Text style={styles.chipAmount}>{item.amount} </Text>
      <Text style={[styles.chipDelta, { color: isLev ? colors.tickerLev : colors.tickerMna }]}>
        {isLev ? '↑' : '⇄'}
      </Text>
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
