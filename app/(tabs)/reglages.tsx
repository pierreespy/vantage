/**
 * Réglages tab — langue de l'interface, rappel du matin, haptique, confidentialité.
 *
 * Pilote les providers existants (SettingsProvider, NotificationsProvider,
 * FavoritesSyncProvider) sans dupliquer leur état.
 */
import React from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useSettings } from '@/state/settings';
import { useNotifications } from '@/state/notifications';
import { useFavoritesSync } from '@/state/favoritesSync';
import { LANGUAGES } from '@/i18n/strings';
import { PressableScale } from '@/components/PressableScale';
import { ThemeSwitch } from '@/components/ThemeSwitch';
import { hapticTap, hapticWarning } from '@/lib/haptics';
import { colors, border, glass } from '@/theme';
import { fonts } from '@/fonts';

export default function ReglagesScreen() {
  const insets = useSafeAreaInsets();
  const { t, language, setLanguage, haptics, setHaptics } = useSettings();
  const notif = useNotifications();
  const sync = useFavoritesSync();
  const s = t.settings;

  const confirmReset = () => {
    hapticWarning();
    Alert.alert(s.resetConfirmTitle, s.resetConfirmBody, [
      { text: s.cancel, style: 'cancel' },
      { text: s.confirm, style: 'destructive', onPress: () => void sync.reset() },
    ]);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.h1}>{s.title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Section title={s.sectionTheme} hint={s.themeHint}>
          <ThemeSwitch stretch />
        </Section>

        <Section title={s.sectionLanguage} hint={s.languageHint}>
          <View style={styles.segment}>
            {LANGUAGES.map(({ code, label }) => {
              const active = code === language;
              return (
                <PressableScale
                  key={code}
                  onPress={() => {
                    if (active) return;
                    hapticTap();
                    setLanguage(code);
                  }}
                  style={[styles.segmentItem, active && styles.segmentItemActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
                </PressableScale>
              );
            })}
          </View>
        </Section>

        <Section title={s.sectionNotifications}>
          <ToggleRow
            label={s.morningReminder}
            hint={notif.consent === 'declined' ? `${s.morningReminderHint} ${s.notifDeniedHint}` : s.morningReminderHint}
            value={notif.consent === 'granted'}
            onChange={(on) => (on ? void notif.grant() : notif.decline())}
          />
        </Section>

        <Section title={s.sectionExperience}>
          <ToggleRow label={s.haptics} hint={s.hapticsHint} value={haptics} onChange={setHaptics} />
        </Section>

        <Section title={s.sectionPrivacy}>
          <ToggleRow
            label={s.favSync}
            hint={s.favSyncHint}
            value={sync.consent === 'granted'}
            onChange={(on) => (on ? sync.grant() : sync.decline())}
          />
          <PressableScale onPress={confirmReset} style={styles.dangerBtn} accessibilityRole="button">
            <Text style={styles.dangerText}>{s.resetFavorites}</Text>
          </PressableScale>
        </Section>

        <Section title={s.sectionAbout}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{s.version}</Text>
            <Text style={styles.mono}>{Constants.expoConfig?.version ?? '—'}</Text>
          </View>
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.kicker}>{title}</Text>
      <View style={styles.card}>{children}</View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          hapticTap();
          onChange(v);
        }}
        trackColor={{ true: colors.accent, false: border.firm }}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  h1: { fontFamily: fonts.serifBold, fontSize: 30, color: colors.ink, letterSpacing: -0.15 },
  scroll: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 132 },

  section: { marginBottom: 22 },
  kicker: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.claret,
    marginBottom: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: border.light,
    backgroundColor: glass.cardFill,
    borderRadius: 14,
    padding: 14,
    gap: 14,
  },
  hint: { fontFamily: fonts.serifItalic, fontSize: 13, color: colors.ink60, marginTop: 6 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowLabel: { fontFamily: fonts.serifSemi, fontSize: 16, color: colors.ink },
  rowHint: { fontFamily: fonts.serif, fontSize: 13, color: colors.ink60, marginTop: 2 },
  mono: { marginLeft: 'auto', fontFamily: fonts.mono, fontSize: 13, color: colors.ink60 },

  segment: { flexDirection: 'row', gap: 8 },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: border.accentStrong,
    backgroundColor: glass.accentFillFaint,
  },
  segmentItemActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  segmentText: {
    fontFamily: fonts.archivoBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  segmentTextActive: { color: colors.paper },

  dangerBtn: { paddingVertical: 4 },
  dangerText: { fontFamily: fonts.archivoBold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.claret },
});
