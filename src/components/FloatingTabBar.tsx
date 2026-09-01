/**
 * Floating frosted "pill" tab bar — the design's 1c treatment.
 *
 * A rounded, blurred ivory panel that hovers above the scrolling content, with the
 * active tab drawn as an accent (pétrole) pill. Rendered via expo-router's Tabs
 * `tabBar` slot so it fully replaces the default bar.
 *
 * Animations : la pilule pétrole grandit et se teinte quand l'onglet devient actif
 * (au lieu d'apparaître d'un coup), l'onglet s'enfonce sous le doigt, et l'icône de
 * l'onglet actif fait un léger « pop ». Un retour haptique de sélection accompagne
 * chaque changement d'onglet — jamais quand on retape l'onglet déjà ouvert.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, border } from '../theme';
import { fonts } from '../fonts';
import { duration, easing } from '../lib/motion';
import { hapticTap } from '../lib/haptics';
import { TabIcon, TabIconName } from './TabIcon';

const TABS: Record<string, { label: string; icon: TabIconName }> = {
  index: { label: 'Journal', icon: 'journal' },
  favoris: { label: 'Favoris', icon: 'favoris' },
  'mot-du-jour': { label: 'Mot du jour', icon: 'motdujour' },
};

const INACTIVE = '#a49b8c';

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  // Float above the home indicator; ~matches the design's 28px offset on notched
  // devices while keeping a safe minimum on older ones.
  const bottom = Math.max(insets.bottom, 16);

  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <BlurView intensity={24} tint="light" style={styles.pill}>
        <View style={styles.pillTint}>
          {state.routes.map((route, index) => {
            const def = TABS[route.name];
            if (!def) return null;
            const focused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                // Sélection : une seule impulsion, au moment du vrai changement d'onglet.
                hapticTap();
                navigation.navigate(route.name);
              }
            };

            return <Tab key={route.key} def={def} focused={focused} onPress={onPress} />;
          })}
        </View>
      </BlurView>
    </View>
  );
}

/**
 * Un onglet : pilule d'activation animée + enfoncement au toucher.
 *
 * `active` (0 → 1) pilote à la fois l'opacité et l'échelle du fond pétrole ; `press`
 * pilote l'enfoncement. Les deux tournent en driver natif.
 */
function Tab({
  def,
  focused,
  onPress,
}: {
  def: { label: string; icon: TabIconName };
  focused: boolean;
  onPress: () => void;
}) {
  const active = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(active, {
      toValue: focused ? 1 : 0,
      duration: focused ? 260 : 180,
      easing: easing.out,
      useNativeDriver: true,
    }).start();
  }, [focused, active]);

  const to = (toValue: number, ms: number) =>
    Animated.timing(press, { toValue, duration: ms, easing: easing.inOut, useNativeDriver: true }).start();

  return (
    <Animated.View style={[styles.tabWrap, { transform: [{ scale: press }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => to(0.92, duration.press)}
        onPressOut={() => to(1, duration.release)}
        accessibilityRole="button"
        accessibilityState={focused ? { selected: true } : {}}
        accessibilityLabel={def.label}
        style={styles.tab}
      >
        {/* fond pétrole : grandit depuis 0.8 et se révèle */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tabFill,
            {
              opacity: active,
              transform: [
                { scale: active.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.icon,
            {
              transform: [
                { scale: active.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
              ],
            },
          ]}
        >
          <TabIcon name={def.icon} color={focused ? colors.paper : INACTIVE} />
        </Animated.View>
        <Text style={[styles.label, { color: focused ? colors.paper : INACTIVE }]} numberOfLines={1}>
          {def.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 18,
    right: 18,
  },
  pill: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: border.light,
    // soft drop shadow (0 12px 34px rgba(24,22,20,0.22))
    shadowColor: '#181614',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 17,
    elevation: 12,
  },
  pillTint: {
    flexDirection: 'row',
    backgroundColor: 'rgba(249,239,227,0.72)',
    padding: 8,
  },
  tabWrap: { flex: 1 },
  tab: {
    alignItems: 'center',
    gap: 3,
    paddingVertical: 7,
    borderRadius: 16,
    overflow: 'hidden',
  },
  tabFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    backgroundColor: colors.accent,
  },
  icon: {
    width: 23,
    height: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.archivoSemi,
    fontSize: 9,
    letterSpacing: 0.18,
  },
});
