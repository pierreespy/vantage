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
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { useFavorites, type CustomStartup } from '@/state/favorites';
import { useEdition } from '@/content/EditionProvider';
import { colors, border, glass } from '@/theme';
import { fonts } from '@/fonts';

const openLink = (url: string) => WebBrowser.openBrowserAsync(url).catch(() => {});

export default function FavorisScreen() {
  const insets = useSafeAreaInsets();
  const { followed, isFollowed, toggle, customStartups, addCustomStartup } = useFavorites();
  const { stageOf } = useEdition();

  const [sector, setSector] = useState<string>('Toutes');
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Every followed startup gets a card, in the order it was added. Ones we have data
  // for show their sector/news; the stage badge is filled from seeded data or, if
  // absent, from what the journal has reported for that company (dynamic stage).
  const cards = useMemo<Startup[]>(() => {
    return followed
      .map((name) => {
        const base = startupByName(name) ?? { name, sector: '', news: [] };
        return { ...base, stage: base.stage ?? stageOf(name) };
      })
      .filter((s) => sector === 'Toutes' || s.sector === sector);
  }, [followed, sector, stageOf]);

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
        customStartups={customStartups}
        addCustomStartup={addCustomStartup}
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
          {startup.sector ? <Text style={styles.sector}>{startup.sector}</Text> : null}
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
  customStartups,
  addCustomStartup,
}: {
  visible: boolean;
  onClose: () => void;
  query: string;
  onQuery: (v: string) => void;
  isFollowed: (name: string) => boolean;
  toggle: (name: string) => void;
  customStartups: CustomStartup[];
  addCustomStartup: (name: string) => void;
}) {
  const trimmed = query.trim();
  const q = trimmed.toLowerCase();

  // Searchable set = built-in catalog + the user's manually-added startups.
  const allStartups = useMemo(() => {
    const byKey = new Map<string, { name: string; sector: string }>();
    for (const c of catalog) byKey.set(c.name.toLowerCase(), { name: c.name, sector: c.sector });
    for (const c of customStartups)
      if (!byKey.has(c.name.toLowerCase())) byKey.set(c.name.toLowerCase(), { name: c.name, sector: c.sector });
    return Array.from(byKey.values());
  }, [customStartups]);

  const matches = useMemo(() => {
    const base = q
      ? allStartups.filter(
          (c) => c.name.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q)
        )
      : allStartups;
    return [...base].sort((a, b) => a.name.localeCompare(b.name));
  }, [q, allStartups]);
  const results = matches.slice(0, 25);

  const listLabel = q ? 'Résultats' : 'Suggestions';
  // Let the user add a startup they typed that isn't in the catalog — gated by a
  // confirmation so they verify the spelling first (avoids garbage entries).
  const exactExists = allStartups.some((c) => c.name.toLowerCase() === q);
  const canAddCustom = trimmed.length > 0 && !exactExists;

  const confirmAdd = () => {
    Alert.alert(
      'Vérifier le nom',
      `« ${trimmed} » sera ajoutée à vos favoris et au catalogue de l'app.\n\nVérifiez bien l'orthographe : le nom est enregistré tel quel.`,
      [
        { text: 'Corriger', style: 'cancel' },
        { text: 'Confirmer', onPress: () => addCustomStartup(trimmed) },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.scrim}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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

          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 300 }}>
            {results.length === 0 && q.length > 0 ? (
              <Text style={styles.noResults}>
                Aucune startup du catalogue ne correspond à « {query} ».
              </Text>
            ) : null}

            {results.map((c) => {
              const on = isFollowed(c.name);
              return (
                <View key={c.name} style={styles.candRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.candName}>{c.name}</Text>
                    {c.sector ? <Text style={styles.candSector}>{c.sector}</Text> : null}
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

            {/* Manual add — for a real startup not yet in the catalogue. */}
            {canAddCustom ? (
              <View style={styles.addCustomRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.candName}>Ajouter « {trimmed} »</Text>
                  <Text style={styles.addCustomHint}>
                    Absente du catalogue — je confirme qu’elle existe
                  </Text>
                </View>
                <Pressable
                  onPress={confirmAdd}
                  style={[styles.followBtn, styles.followBtnOff]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.followText, { color: colors.paper }]}>Vérifier</Text>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
  addCustomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: border.firm,
    backgroundColor: 'rgba(11,79,108,0.04)',
  },
  addCustomHint: {
    fontFamily: fonts.serifItalic,
    fontSize: 12,
    color: colors.ink60,
    marginTop: 2,
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
