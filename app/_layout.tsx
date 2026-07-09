/**
 * Root layout — loads fonts, sets up providers, and hosts the tab navigator.
 */
import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppFonts } from '@/fonts';
import { colors } from '@/theme';
import { FavoritesProvider } from '@/state/favorites';
import { FavoritesSyncProvider } from '@/state/favoritesSync';
import { FavSyncConsentModal } from '@/components/FavSyncConsentModal';
import { EditionProvider } from '@/content/EditionProvider';
import { NewsProvider } from '@/content/NewsProvider';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();

  // Keep the (paper) ground visible while the editorial fonts load, so the app
  // never flashes a system-font frame.
  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  }

  return (
    <SafeAreaProvider>
      <EditionProvider>
        <NewsProvider>
          <FavoritesProvider>
            <FavoritesSyncProvider>
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
                <Stack.Screen name="(tabs)" />
              </Stack>
              <FavSyncConsentModal />
            </FavoritesSyncProvider>
          </FavoritesProvider>
        </NewsProvider>
      </EditionProvider>
    </SafeAreaProvider>
  );
}
