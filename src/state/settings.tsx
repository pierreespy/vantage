/**
 * Réglages utilisateur — langue de l'interface, thème de veille (MedTech/Biotech),
 * retours haptiques.
 *
 * Persistés dans AsyncStorage (une clé JSON). Les préférences propres à d'autres
 * domaines (notifications, partage anonyme des favoris) restent dans leurs providers ;
 * l'écran Réglages se contente de les piloter.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setHapticsEnabled } from '@/lib/haptics';
import { Language, STRINGS, Strings, Theme, THEMES } from '@/i18n/strings';

const SETTINGS_KEY = 'vantage.settings.v1';

type Settings = { language: Language; haptics: boolean; theme: Theme };

const DEFAULTS: Settings = { language: 'fr', haptics: true, theme: 'medtech' };

type SettingsContextValue = Settings & {
  /** Chaînes d'interface dans la langue courante. */
  t: Strings;
  setLanguage: (language: Language) => void;
  setHaptics: (enabled: boolean) => void;
  setTheme: (theme: Theme) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<Settings>;
        setSettings({
          language: saved.language && saved.language in STRINGS ? saved.language : DEFAULTS.language,
          haptics: typeof saved.haptics === 'boolean' ? saved.haptics : DEFAULTS.haptics,
          theme: THEMES.some((th) => th.code === saved.theme) ? saved.theme! : DEFAULTS.theme,
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setHapticsEnabled(settings.haptics);
  }, [settings.haptics]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const setLanguage = useCallback((language: Language) => update({ language }), [update]);
  const setHaptics = useCallback((haptics: boolean) => update({ haptics }), [update]);

  const setTheme = useCallback((theme: Theme) => update({ theme }), [update]);

  const value = useMemo<SettingsContextValue>(
    () => ({ ...settings, t: STRINGS[settings.language], setLanguage, setHaptics, setTheme }),
    [settings, setLanguage, setHaptics, setTheme]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
