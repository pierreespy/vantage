/**
 * Mot du jour tab — native.
 *
 * Full-screen explainer of the day's bio/med term, rendered by <WordView> (shared
 * with the Glossaire detail). A "Glossaire" button in the header opens the searchable
 * archive of every past term.
 *
 * Le bouton Glossaire s'enfonce au toucher et vibre légèrement à l'ouverture ; le
 * contenu du mot monte en fondu (voir <WordView>).
 */
import { useSettings } from '@/state/settings';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEdition } from '@/content/EditionProvider';
import { WordView } from '@/components/WordView';
import { GlossaireModal } from '@/components/GlossaireModal';
import { ShareButton } from '@/components/ShareButton';
import { PressableScale } from '@/components/PressableScale';
import { useShareCard } from '@/lib/useShareCard';
import { wordCardData } from '@/lib/shareData';
import { colors, border, glass } from '@/theme';
import { fonts } from '@/fonts';

export default function MotDuJourScreen() {
  const insets = useSafeAreaInsets();
  const { edition } = useEdition();
  const { word } = edition;
  const { t } = useSettings();
  const { shareCard, sharing } = useShareCard();
  const [glossaryOpen, setGlossaryOpen] = useState(false);

  return (
    <View style={styles.root}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.date}>{edition.dateLong}</Text>
            <Text style={styles.h1}>{t.word.title}</Text>
          </View>
          <ShareButton
            onPress={() => shareCard(wordCardData(word, edition.dateLong, t))}
            disabled={sharing}
          />
          <PressableScale
            onPress={() => setGlossaryOpen(true)}
            style={styles.glossaryBtn}
            activeScale={0.93}
            accessibilityRole="button"
            accessibilityLabel={t.word.openGlossary}
            hitSlop={8}
          >
            <Text style={styles.glossaryBtnText}>{t.word.glossary}</Text>
          </PressableScale>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <WordView word={word} />
      </ScrollView>

      <GlossaireModal visible={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },

  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  date: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.ink60,
    marginBottom: 3,
  },
  h1: { fontFamily: fonts.serifBold, fontSize: 30, color: colors.ink, letterSpacing: -0.15 },

  glossaryBtn: {
    borderWidth: 1,
    borderColor: border.accentStrong,
    backgroundColor: glass.accentFill,
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 2,
  },
  glossaryBtnText: {
    fontFamily: fonts.archivoBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.accent,
  },

  scroll: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 132 },
});
