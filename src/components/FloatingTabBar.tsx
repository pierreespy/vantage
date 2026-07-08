/**
 * Floating frosted "pill" tab bar — the design's 1c treatment.
 *
 * A rounded, blurred ivory panel that hovers above the scrolling content, with the
 * active tab drawn as an accent (pétrole) pill. Rendered via expo-router's Tabs
 * `tabBar` slot so it fully replaces the default bar.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, border } from '../theme';
import { fonts } from '../fonts';
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
                navigation.navigate(route.name);
              }
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel={def.label}
                style={[styles.tab, focused && styles.tabActive]}
              >
                <View style={styles.icon}>
                  <TabIcon name={def.icon} color={focused ? colors.paper : INACTIVE} />
                </View>
                <Text
                  style={[styles.label, { color: focused ? colors.paper : INACTIVE }]}
                  numberOfLines={1}
                >
                  {def.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
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
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  tabActive: {
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
