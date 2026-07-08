/**
 * Favoris tab — native.
 *
 * One card per followed startup (star + name, sector, stage badge) with its recent
 * clickable news. A "+" opens the "Ajouter un favori" sheet: a live-search field
 * over the startup catalog with a Suivre / Suivi ✓ toggle. Sector chips filter the
 * list. Favorites are the shared, persisted state.
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
import * as WebBrowser from 'expo-web-browser';
import { catalog, favSectors, startupByName, type Startup } from '@/data/favoris';
import { useFavorites } from '@/state/favorites';
import { colors, border, glass } from '@/theme';
import { fonts } from '@/fonts';

const openLink = (url: string) => WebBrowser.openBrowserAsync(url).catch(() => {});

export default function FavorisScreen() {
  const insets = useSafeAreaInsets();
  const { followed, isFollowed, toggle } = useFavorites();

  const [sector, setSector] = useState<string>('Toutes');
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Followed startups we have data for, in the order they were added, filtered by sector.
  const cards = useMemo<Startup[]>(() => {
    return followed
      .map(startupByName)
      .filter((s): s is Startup => !!s)
      .filter((s) => sector === 'Toutes' || s.sector === sector);
  }, [followed, sector]);

  return (
    <View style={styles.root}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>{followed.length} startups suivies</Text>
            <Text style={styles.h1}>Favoris</Text>
          </View>
          <Pressable
            onPress={() => {
              setQuery('');
              setAddOpen(true);
            }}
            style={styles.addBtn}
            accessibilityRole="button"
            accessibilityLabel="Ajouter un favori"
          >
            <Text style={styles.addPlus}>+</Text>
          </Pressable>
        </View>

        {/* sector filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {favSectors.map((s) => {
            const on = s === sector;
            return (
              <Pressable
                key={s}
                onPress={() => setSector(s)}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{s}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* LIST */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {cards.length === 0 ? (
          <Text style={styles.emptyList}>
            Aucun favori dans « {sector} ». Touchez ＋ pour en ajouter.
          </Text>
        ) : (
          cards.map((f) => <FavoriteCard key={f.name} startup={f} />)
        )}
      </ScrollView>

      {/* ADD SHEET */}
      <AddFavoriteSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        query={query}
        onQuery={setQuery}
        isFollowed={isFollowed}
        toggle={toggle}
      />
    </View>
  );
}

function FavoriteCard({ startup }: { startup: Startup }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.star}>★</Text>
            <Text style={styles.name}>{startup.name}</Text>
          </View>
          <Text style={styles.sector}>{startup.sector}</Text>
        </View>
        {startup.stage ? (
          <View style={styles.stageBadge}>
            <Text style={styles.stageText}>{startup.stage}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.newsWrap}>
        {startup.news.length === 0 ? (
          <Text style={styles.noNews}>Pas encore d’actualité suivie.</Text>
        ) : (
          startup.news.map((n, i) => (
            <Pressable
              key={n.url + i}
              onPress={() => openLink(n.url)}
              style={styles.newsItem}
              accessibilityRole="link"
            >
              <Text style={styles.newsTitle}>{n.title}</Text>
              <Text style={styles.newsMeta}>
                {n.source} · {n.date}
              </Text>
            </Pressable>
          ))
        )}
      </View>
    </View>
  );
}

function AddFavoriteSheet({
  visible,
  onClose,
  query,
  onQuery,
  isFollowed,
  toggle,
}: {
  visible: boolean;
  onClose: () => void;
  query: string;
  onQuery: (v: string) => void;
  isFollowed: (name: string) => boolean;
  toggle: (name: string) => void;
}) {
  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    const base = q
      ? catalog.filter(
          (c) => c.name.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q)
        )
      : catalog;
    return base.slice(0, 8);
  }, [q]);

  const listLabel = q ? 'Résultats' : 'Suggestions';
  const noResults = q.length > 0 && results.length === 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.scrim}>
        {/* Tap the dimmed area (behind the sheet) to close. The sheet is a sibling
            View on top, so taps inside it — and TextInput focus — are unaffected. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />
        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Ajouter un favori</Text>
            <Pressable onPress={onClose} accessibilityRole="button">
              <Text style={styles.sheetClose}>Fermer</Text>
            </Pressable>
          </View>

          <View style={styles.searchBox}>
            <Text style={styles.searchGlyph}>⌕</Text>
            <TextInput
              value={query}
              onChangeText={onQuery}
              placeholder="Rechercher une startup…"
              placeholderTextColor={colors.ink50}
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.listLabel}>{listLabel}</Text>

          {noResults ? (
            <Text style={styles.noResults}>
              Aucune startup ne correspond à « {query} ».
            </Text>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 360 }}>
              {results.map((c) => {
                const on = isFollowed(c.name);
                return (
                  <View key={c.name} style={styles.candRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.candName}>{c.name}</Text>
                      <Text style={styles.candSector}>{c.sector}</Text>
                    </View>
                    <Pressable
                      onPress={() => toggle(c.name)}
                      style={[styles.followBtn, on ? styles.followBtnOn : styles.followBtnOff]}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.followText, { color: on ? colors.accent : colors.paper }]}>
                        {on ? 'Suivi ✓' : 'Suivre'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },

  // header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end' },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.ink60,
    marginBottom: 3,
  },
  h1: {
    fontFamily: fonts.serifBold,
    fontSize: 30,
    color: colors.ink,
    letterSpacing: -0.15,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPlus: {
    color: colors.paper,
    fontFamily: fonts.archivo,
    fontSize: 26,
    lineHeight: 30,
    marginTop: -2,
  },
  chips: { gap: 6, marginTop: 12, paddingRight: 20 },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: border.firm,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: {
    fontFamily: fonts.archivoSemi,
    fontSize: 11,
    letterSpacing: 0.2,
    color: colors.ink70,
  },
  chipTextOn: { color: colors.paper },

  // list
  list: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 128 },
  emptyList: {
    fontFamily: fonts.serifItalic,
    fontSize: 14.5,
    color: colors.ink50,
    marginTop: 24,
    lineHeight: 22,
  },

  // card
  card: {
    borderWidth: 1,
    borderColor: border.medium,
    backgroundColor: glass.cardFill,
    padding: 13,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  star: { color: colors.accent, fontSize: 14, lineHeight: 18 },
  name: {
    fontFamily: fonts.serifBold,
    fontSize: 17,
    color: colors.ink,
    lineHeight: 18,
  },
  sector: {
    fontFamily: fonts.archivoSemi,
    fontSize: 10.5,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colors.accent,
    marginTop: 3,
  },
  stageBadge: {
    backgroundColor: colors.ink,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 2,
  },
  stageText: {
    fontFamily: fonts.monoMed,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.paper,
  },
  newsWrap: { borderTopWidth: 1, borderTopColor: 'rgba(34,32,29,0.14)' },
  noNews: {
    fontFamily: fonts.serifItalic,
    fontSize: 12.5,
    color: colors.ink50,
    paddingVertical: 10,
  },
  newsItem: {
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: border.faint,
  },
  newsTitle: {
    fontFamily: fonts.serifSemi,
    fontSize: 13.5,
    lineHeight: 17.5,
    color: colors.ink,
    marginBottom: 3,
  },
  newsMeta: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.ink50,
  },

  // sheet
  scrim: { flex: 1, backgroundColor: glass.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 34,
    maxHeight: '84%',
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: border.firm,
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  sheetHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  sheetTitle: {
    fontFamily: fonts.serifBold,
    fontSize: 23,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  sheetClose: {
    fontFamily: fonts.archivoSemi,
    fontSize: 13,
    color: colors.ink60,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: border.bold,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 16,
    backgroundColor: colors.white,
  },
  searchGlyph: { color: colors.ink50, fontSize: 16 },
  searchInput: {
    flex: 1,
    fontFamily: fonts.serif,
    fontSize: 14.5,
    color: colors.ink,
    padding: 0,
  },
  listLabel: {
    fontFamily: fonts.archivoBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.ink60,
    marginBottom: 6,
  },
  noResults: {
    fontFamily: fonts.serifItalic,
    fontSize: 14,
    color: colors.ink50,
    paddingVertical: 18,
  },
  candRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: border.light,
  },
  candName: {
    fontFamily: fonts.serifBold,
    fontSize: 15.5,
    color: colors.ink,
    lineHeight: 17,
  },
  candSector: {
    fontFamily: fonts.archivoSemi,
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colors.accent,
    marginTop: 2,
  },
  followBtn: {
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  followBtnOn: { backgroundColor: 'transparent' },
  followBtnOff: { backgroundColor: colors.accent },
  followText: {
    fontFamily: fonts.archivoBold,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
