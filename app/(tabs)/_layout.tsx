/**
 * Tab navigator — 3 tabs (Journal · Favoris · Mot du jour) with the floating
 * pill tab bar. Phase-2 tabs (deal-tracker, etc.) slot in by adding a screen here.
 */
import React from 'react';
import { Tabs } from 'expo-router/js-tabs';
import { colors } from '@/theme';
import { FloatingTabBar } from '@/components/FloatingTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Journal' }} />
      <Tabs.Screen name="favoris" options={{ title: 'Favoris' }} />
      <Tabs.Screen name="mot-du-jour" options={{ title: 'Mot du jour' }} />
    </Tabs>
  );
}
