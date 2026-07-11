/**
 * Glossaire — a searchable, full-screen browser of every past "mot du jour".
 *
 * Opened from the Mot du jour tab. Two states in one modal: a searchable LIST of all
 * terms (newest first), and a DETAIL that reuses <WordView> so a past term reads
 * exactly like today's. Today's term is merged in from the live edition so it shows
 * immediately, even before the generation task appends it to words.json.
 */
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGlossary } from '@/content/GlossaryProvider';
import { useEdition } from '@/content/EditionProvider';
import type { GlossaryWord } from '@/content/types';
import { WordView } from './WordView';
import { colors, border, glass } from '@/theme';
import { fonts } from '@/fonts';

/** Lowercase + fold French accents so "reglementaire" matches "Réglementaire".
 *  (Avoids String.normalize, whose ICU support is uneven on Hermes.) */
function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/[àâä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[îï]/g, 'i')
    .replace(/[ôö]/g, 'o')
    .replace(/[ûüù]/g, 'u')
    .replace(/ç/g, 'c');
}

export function GlossaireModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { words } = useGlossary();
  const { edition } = useEdition();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<GlossaryWord | null>(null);

  // Merge today's term from the live edition at the top if words.json doesn't have it yet.
  const all = useMemo<GlossaryWord[]>(() => {
    const today: GlossaryWord = { ...edition.word, date: '', dateLong: edition.dateLong };
    const has = words.some((w) => fold(w.term) === fold(today.term));
    return has ? words : [today, ...words];
  }, [words, edition]);

  const results = useMemo<GlossaryWord[]>(() => {
    const q = fold(query.trim());
    if (!q) return all;
    return all.filter((w) =>
      fold(`${w.term} ${w.full} ${w.fr} ${w.field} ${w.definition}`).includes(q)
    );
  }, [all, query]);

  // Reset transient state each time the modal closes, so it reopens clean.
  const close = () => {
    setSelected(null);
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={selected ? () => setSelected(null) : close}>
      <View style={styles.root}>
        {/* HEADER */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          {selected ? (
            <Pressable onPress={() => setSelected(null)} hitSlop={10} accessibilityRole="button">
              <Text style={styles.headerAction}>‹ Glossaire</Text>
            </Pressable>
          ) : (
            <Text style={styles.eyebrow}>Lexique VC santé</Text>
          )}
          <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fermer">
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        {selected ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.detailScroll}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.detailDate}>{selected.dateLong}</Text>
            <WordView word={selected} />
          </ScrollView>
        ) : (
          <>
            <Text style={styles.title}>Glossaire</Text>
            <View style={styles.searchWrap}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Rechercher un terme…"
                placeholderTextColor={colors.ink50}
                style={styles.search}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
                returnKeyType="search"
              />
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.listScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {results.length === 0 ? (
                <Text style={styles.empty}>Aucun terme ne correspond à « {query.trim()} ».</Text>
              ) : (
                results.map((w, i) => (
                  <Pressable
                    key={w.term + i}
                    onPress={() => setSelected(w)}
                    style={styles.row}
                    accessibilityRole="button"
                  >
                    <View style={styles.rowTop}>
                      <Text style={styles.rowTerm}>{w.term}</Text>
                      <Text style={styles.rowDate}>{w.dateLong}</Text>
                    </View>
                    <Text style={styles.rowFull}>{w.full}</Text>
                    <Text style={styles.rowFr}>{w.fr}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  headerAction: { fontFamily: fonts.archivoBold, fontSize: 13, color: colors.accent, letterSpacing: 0.2 },
  close: { fontFamily: fonts.archivoBold, fontSize: 16, color: colors.ink60 },

  title: {
    fontFamily: fonts.serifBold,
    fontSize: 30,
    color: colors.ink,
    letterSpacing: -0.15,
    paddingHorizontal: 20,
    marginBottom: 12,
  },

  searchWrap: { paddingHorizontal: 20, marginBottom: 8 },
  search: {
    borderWidth: 1,
    borderColor: border.firm,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: glass.cardFill,
  },

  listScroll: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 132 },
  row: {
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: border.light,
  },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  rowTerm: { fontFamily: fonts.serifBold, fontSize: 18, color: colors.ink, flexShrink: 1, letterSpacing: -0.2 },
  rowDate: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.ink50,
  },
  rowFull: { fontFamily: fonts.serifSemi, fontSize: 13.5, color: colors.ink80, marginTop: 3 },
  rowFr: { fontFamily: fonts.serifItalic, fontSize: 12.5, color: colors.ink60, marginTop: 1 },
  empty: {
    fontFamily: fonts.serifItalic,
    fontSize: 14,
    color: colors.ink60,
    paddingTop: 24,
    textAlign: 'center',
  },

  detailScroll: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 132 },
  detailDate: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.ink60,
    marginBottom: 12,
  },
});
