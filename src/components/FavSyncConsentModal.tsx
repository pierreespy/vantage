/**
 * First-launch consent for anonymous favorites reporting.
 *
 * Shown once (until the user decides), overlaying the app. Explains plainly, in the
 * FT/Bloomberg editorial voice, that favorites are sent anonymously — a random id, no
 * account, no personal data — so the app can fetch news about them, with 30-day
 * retention and a reset available anytime. Buttons: « Activer » / « Plus tard ».
 *
 * The choice is persisted by FavoritesSyncProvider; declining keeps favorites purely
 * on-device and the user can enable it later.
 */
import { useSettings } from '@/state/settings';
import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFavoritesSync } from '@/state/favoritesSync';
import { colors, border, glass } from '@/theme';
import { fonts } from '@/fonts';
import { hapticSuccess } from '@/lib/haptics';
import { FadeInView } from '@/components/FadeInView';
import { PressableScale } from '@/components/PressableScale';

export function FavSyncConsentModal() {
  const { t } = useSettings();
  const insets = useSafeAreaInsets();
  const { consent, consentResolved, grant, decline } = useFavoritesSync();

  // Only surface once the persisted choice is known and still undecided.
  const visible = consentResolved && consent === 'unset';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={decline}>
      <View style={styles.scrim}>
        {/* La carte monte depuis le bas en même temps que le voile apparaît. */}
        <FadeInView delay={40} distance={22} style={[styles.card, { marginBottom: insets.bottom + 24 }]}>
          <Text style={styles.eyebrow}>{t.favSync.eyebrow}</Text>
          <Text style={styles.title}>{t.favSync.title}</Text>

          <Text style={styles.body}>
            {t.favSync.body1a}
            <Text style={styles.em}>{t.favSync.body1em}</Text>
            {t.favSync.body1b}
          </Text>
          <Text style={styles.body}>
            {t.favSync.body2}
          </Text>

          <View style={styles.actions}>
            <PressableScale
              onPress={decline}
              style={[styles.btn, styles.btnGhost]}
              activeScale={0.95}
              accessibilityRole="button"
            >
              <Text style={[styles.btnText, styles.btnGhostText]}>{t.common.later}</Text>
            </PressableScale>
            <PressableScale
              onPress={() => {
                // Consentement donné : même signal « c'est fait » que partout ailleurs.
                hapticSuccess();
                grant();
              }}
              style={[styles.btn, styles.btnSolid]}
              activeScale={0.95}
              haptic={false}
              accessibilityRole="button"
            >
              <Text style={[styles.btnText, styles.btnSolidText]}>{t.common.enable}</Text>
            </PressableScale>
          </View>
        </FadeInView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: glass.scrim,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.paper,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: border.firm,
    padding: 22,
  },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.accent,
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  body: {
    fontFamily: fonts.serif,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.ink80,
    marginBottom: 12,
  },
  em: { fontFamily: fonts.serifBold, color: colors.ink },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  btn: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 100,
    borderWidth: 1,
  },
  btnGhost: { borderColor: border.firm, backgroundColor: 'transparent' },
  btnSolid: { borderColor: colors.accent, backgroundColor: colors.accent },
  btnText: {
    fontFamily: fonts.archivoBold,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  btnGhostText: { color: colors.ink60 },
  btnSolidText: { color: colors.paper },
});
