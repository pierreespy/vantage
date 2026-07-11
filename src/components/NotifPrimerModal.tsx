/**
 * In-app primer for morning notifications.
 *
 * Shown once, AFTER the user's first read (not cold on launch) — see
 * src/state/notifications.tsx. Explains, in the FT/Bloomberg editorial voice, that
 * the app can send one punchy notification each morning about the day's lead story.
 * « Activer » triggers the OS permission dialog; « Plus tard » keeps the app silent.
 *
 * Priming with our own modal first (rather than firing the iOS dialog cold) protects
 * the opt-in rate: an iOS permission refusal is near-permanent.
 */
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '@/state/notifications';
import { hapticSuccess } from '@/lib/haptics';
import { colors, border, glass } from '@/theme';
import { fonts } from '@/fonts';

export function NotifPrimerModal() {
  const insets = useSafeAreaInsets();
  const { primerVisible, grant, decline } = useNotifications();

  const onActivate = () => {
    // Optimistic « ok » tap; the OS dialog decides the rest.
    hapticSuccess();
    grant();
  };

  return (
    <Modal visible={primerVisible} transparent animationType="fade" onRequestClose={decline}>
      <View style={styles.scrim}>
        <View style={[styles.card, { marginBottom: insets.bottom + 24 }]}>
          <Text style={styles.eyebrow}>Notifications</Text>
          <Text style={styles.title}>La une, chaque matin</Text>

          <Text style={styles.body}>
            Recevez chaque matin à <Text style={styles.em}>7 h 30</Text> l’essentiel de la
            une santé — une seule notification, la meilleure histoire du jour.
          </Text>
          <Text style={styles.body}>
            Une par jour, jamais plus. Vous pouvez la désactiver à tout moment depuis les
            réglages iOS.
          </Text>

          <View style={styles.actions}>
            <Pressable
              onPress={decline}
              style={[styles.btn, styles.btnGhost]}
              accessibilityRole="button"
            >
              <Text style={[styles.btnText, styles.btnGhostText]}>Plus tard</Text>
            </Pressable>
            <Pressable
              onPress={onActivate}
              style={[styles.btn, styles.btnSolid]}
              accessibilityRole="button"
            >
              <Text style={[styles.btnText, styles.btnSolidText]}>Activer</Text>
            </Pressable>
          </View>
        </View>
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
