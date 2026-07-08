/**
 * Font registration + semantic aliases.
 *
 * The design uses three families:
 *   - Source Serif 4  → titles & body (the editorial voice)
 *   - Archivo         → labels, tab labels, buttons (uppercase UI)
 *   - IBM Plex Mono   → data, kickers, dates, amounts
 */
import { useFonts } from 'expo-font';

// Require only the specific weights we use (importing from each package's root
// would bundle every weight — ~7MB of unused .ttf).

/** Semantic names → registered family strings used across the app. */
export const fonts = {
  serif: 'SourceSerif4_400Regular',
  serifSemi: 'SourceSerif4_600SemiBold',
  serifBold: 'SourceSerif4_700Bold',
  serifItalic: 'SourceSerif4_400Regular_Italic',

  archivo: 'Archivo_400Regular',
  archivoMed: 'Archivo_500Medium',
  archivoSemi: 'Archivo_600SemiBold',
  archivoBold: 'Archivo_700Bold',

  mono: 'IBMPlexMono_400Regular',
  monoMed: 'IBMPlexMono_500Medium',
  monoSemi: 'IBMPlexMono_600SemiBold',
} as const;

/** Loads the weights we use. Returns `[loaded, error]`. */
export function useAppFonts() {
  return useFonts({
    SourceSerif4_400Regular: require('@expo-google-fonts/source-serif-4/400Regular/SourceSerif4_400Regular.ttf'),
    SourceSerif4_600SemiBold: require('@expo-google-fonts/source-serif-4/600SemiBold/SourceSerif4_600SemiBold.ttf'),
    SourceSerif4_700Bold: require('@expo-google-fonts/source-serif-4/700Bold/SourceSerif4_700Bold.ttf'),
    SourceSerif4_400Regular_Italic: require('@expo-google-fonts/source-serif-4/400Regular_Italic/SourceSerif4_400Regular_Italic.ttf'),
    Archivo_400Regular: require('@expo-google-fonts/archivo/400Regular/Archivo_400Regular.ttf'),
    Archivo_500Medium: require('@expo-google-fonts/archivo/500Medium/Archivo_500Medium.ttf'),
    Archivo_600SemiBold: require('@expo-google-fonts/archivo/600SemiBold/Archivo_600SemiBold.ttf'),
    Archivo_700Bold: require('@expo-google-fonts/archivo/700Bold/Archivo_700Bold.ttf'),
    IBMPlexMono_400Regular: require('@expo-google-fonts/ibm-plex-mono/400Regular/IBMPlexMono_400Regular.ttf'),
    IBMPlexMono_500Medium: require('@expo-google-fonts/ibm-plex-mono/500Medium/IBMPlexMono_500Medium.ttf'),
    IBMPlexMono_600SemiBold: require('@expo-google-fonts/ibm-plex-mono/600SemiBold/IBMPlexMono_600SemiBold.ttf'),
  });
}
