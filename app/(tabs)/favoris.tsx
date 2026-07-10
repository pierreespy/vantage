/**
 * Favoris tab — native.
 *
 * One card per followed startup (star + name, sector, stage badge, remove ✕) with its
 * recent clickable news. A "+" opens the "Ajouter un favori" sheet: a live-search field
 * over the startup catalog with a Suivre / Suivi ✓ toggle. Sector chips filter the list.
 *
 * Tiers: a new install is "restricted" (1 favorite). Entering the day's access code —
 * obtained from the owner on LinkedIn — unlocks the "extended" tier (up to 6) for good.
 * Favorites are the shared, persisted state; the tier lives there too.
 */
import React, { useEffect, useMemo, useState } from 'react';
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
import {
  useFavorites,
  EXTENDED_LIMIT,
  type CustomStartup,
  type Tier,
} from '@/state/favorites';
import { useFavoritesSync } from '@/state/favoritesSync';
import { useEdition } from '@/content/EditionProvider';
import { useStartupNews } from '@/content/NewsProvider';
import { useAccess } from '@/content/AccessProvider';
import { config } from '@/config';
import { colors, border, glass } from '@/theme';
import { fonts } from '@/fonts';

const openLink = (url: string) => WebBrowser.openBrowserAsync(url).catch(() => {});

/** The message shown when an add is blocked by the cap — tier-aware. */
function limitReachedMessage(tier: Tier, limit: number): string {
  if (tier === 'restricted') {
    return `La version restreinte n’autorise qu’un seul favori. Débloquez la version étendue pour en suivre jusqu’à ${EXTENDED_LIMIT}.`;
  }
  return `Vous pouvez suivre au maximum ${limit} startups. Retirez-en une pour en ajouter une autre.`;
}

export default function FavorisScreen() {
  const insets = useSafeAreaInsets();
  const { followed, isFollowed, toggle, customStartups, addCustomStartup, limit, tier, unlockExtended } =
    useFavorites();
  const { consent, reset } = useFavoritesSync();
  const { stageOf } = useEdition();
  const access = useAccess();

  // Reset the anonymous reporting: blank the shared doc, wipe local favorites + consent.
  const confirmReset = () => {
    Alert.alert(
      'Réinitialiser la personnalisation',
      'Vos favoris et votre consentement au partage anonyme seront effacés sur cet appareil, et la liste transmise sera vidée. Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Réinitialiser', style: 'destructive', onPress: () => void reset() },
      ]
    );
  };

  const [sector, setSector] = useState<string>('Toutes');
  const [addOpen, setAddOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
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
            <Text style={styles.eyebrow}>
              {followed.length}/{limit} startups suivies
            </Text>
            <Text style={styles.h1}>Favoris</Text>
          </View>
          {consent === 'granted' ? (
            <Pressable
              onPress={confirmReset}
              style={styles.resetBtn}
              accessibilityRole="button"
              accessibilityLabel="Réinitialiser la personnalisation"
            >
              <Text style={styles.resetText}>Réinitialiser</Text>
            </Pressable>
          ) : null}
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

      {/* TIER BANNER — only while restricted; the door to the extended tier. */}
      {tier === 'restricted' ? (
        <Pressable
          onPress={() => setUnlockOpen(true)}
          style={styles.tierBanner}
          accessibilityRole="button"
          accessibilityLabel="Débloquer la version étendue"
        >
          <Text style={styles.tierLock}>🔒</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.tierTitle}>Version restreinte — 1 favori</Text>
            <Text style={styles.tierSub}>
              Débloquer la version étendue (jusqu’à {EXTENDED_LIMIT})
            </Text>
          </View>
          <Text style={styles.tierChevron}>›</Text>
        </Pressable>
      ) : null}

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
        limit={limit}
        tier={tier}
      />

      {/* UNLOCK SHEET */}
      <UnlockSheet
        visible={unlockOpen}
        onClose={() => setUnlockOpen(false)}
        verify={access.verify}
        ready={access.ready}
        hint={access.hint}
        onUnlocked={unlockExtended}
      />
    </View>
  );
}

function FavoriteCard({ startup }: { startup: Startup }) {
  const { newsFor } = useStartupNews();
  const { toggle } = useFavorites();
  // Live per-startup news takes precedence; fall back to any seeded news for that
  // startup so a followed catalog entry still shows something until live news exists.
  const live = newsFor(startup.name);
  const news = live.length > 0 ? live : startup.news;

  const confirmRemove = () => {
    Alert.alert('Retirer ce favori', `« ${startup.name} » sera retirée de vos favoris.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Retirer', style: 'destructive', onPress: () => toggle(startup.name) },
    ]);
  };

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
        <Pressable
          onPress={confirmRemove}
          style={styles.removeBtn}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Retirer ${startup.name} des favoris`}
        >
          <Text style={styles.removeGlyph}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.newsWrap}>
        {news.length === 0 ? (
          <Text style={styles.noNews}>Pas encore d’actualité suivie.</Text>
        ) : (
          news.map((n, i) => (
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

function UnlockSheet({
  visible,
  onClose,
  verify,
  ready,
  hint,
  onUnlocked,
}: {
  visible: boolean;
  onClose: () => void;
  verify: (input: string) => boolean;
  ready: boolean;
  hint?: string;
  onUnlocked: () => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset the field each time the sheet opens.
  useEffect(() => {
    if (visible) {
      setCode('');
      setError(null);
    }
  }, [visible]);

  const submit = () => {
    // Never grant the tier against the bundled demo manifest: require a live/cached
    // (real) code of the day. Keeps the public demo code from unlocking offline.
    if (!ready) {
      setError('Code indisponible hors-ligne. Connectez-vous à Internet puis réessayez.');
      return;
    }
    if (verify(code)) {
      onUnlocked();
      onClose();
      Alert.alert(
        'Version étendue débloquée',
        `Vous pouvez maintenant suivre jusqu’à ${EXTENDED_LIMIT} startups.`
      );
      return;
    }
    setError('Code incorrect ou expiré. Le code change chaque jour — redemandez-le si besoin.');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.scrim}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />
        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Version étendue</Text>
            <Pressable onPress={onClose} accessibilityRole="button">
              <Text style={styles.sheetClose}>Fermer</Text>
            </Pressable>
          </View>

          <Text style={styles.unlockCopy}>
            La version étendue permet de suivre jusqu’à {EXTENDED_LIMIT} startups. Elle se
            débloque avec le <Text style={styles.unlockStrong}>code du jour</Text>, qui change
            chaque matin.
          </Text>

          <Pressable
            onPress={() => openLink(config.contactLinkedInUrl)}
            style={styles.linkedinBtn}
            accessibilityRole="link"
          >
            <Text style={styles.linkedinText}>Obtenir le code du jour sur LinkedIn</Text>
          </Pressable>

          <Text style={styles.listLabel}>Code du jour</Text>
          <View style={[styles.searchBox, error ? styles.searchBoxError : null]}>
            <TextInput
              value={code}
              onChangeText={(v) => {
                setCode(v);
                if (error) setError(null);
              }}
              placeholder="ex. mot-mot-nombre"
              placeholderTextColor={colors.ink50}
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
              autoFocus
              onSubmitEditing={submit}
              returnKeyType="done"
            />
          </View>

          {error ? <Text style={styles.unlockError}>{error}</Text> : null}
          {!error && hint ? <Text style={styles.unlockHint}>{hint}</Text> : null}

          <Pressable
            onPress={submit}
            disabled={code.trim().length === 0}
            style={[styles.unlockBtn, code.trim().length === 0 && styles.unlockBtnDisabled]}
            accessibilityRole="button"
          >
            <Text style={styles.unlockBtnText}>Débloquer</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  limit,
  tier,
}: {
  visible: boolean;
  onClose: () => void;
  query: string;
  onQuery: (v: string) => void;
  isFollowed: (name: string) => boolean;
  toggle: (name: string) => boolean;
  customStartups: CustomStartup[];
  addCustomStartup: (name: string) => boolean;
  limit: number;
  tier: Tier;
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
        {
          text: 'Confirmer',
          onPress: () => {
            if (!addCustomStartup(trimmed)) {
              Alert.alert('Limite atteinte', limitReachedMessage(tier, limit));
            }
          },
        },
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
                    onPress={() => {
                      if (!toggle(c.name)) {
                        Alert.alert('Limite atteinte', limitReachedMessage(tier, limit));
                      }
                    }}
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
  resetBtn: {
    alignSelf: 'flex-end',
    marginRight: 12,
    marginBottom: 6,
  },
  resetText: {
    fontFamily: fonts.archivoSemi,
    fontSize: 10.5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.ink50,
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

  // tier banner
  tierBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.firm,
    backgroundColor: glass.accentTint,
  },
  tierLock: { fontSize: 15 },
  tierTitle: {
    fontFamily: fonts.archivoBold,
    fontSize: 12.5,
    color: colors.ink,
    letterSpacing: 0.2,
  },
  tierSub: {
    fontFamily: fonts.archivoSemi,
    fontSize: 11,
    color: colors.accent,
    marginTop: 2,
  },
  tierChevron: {
    fontFamily: fonts.archivo,
    fontSize: 22,
    color: colors.accent,
    marginTop: -2,
  },

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
  removeBtn: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeGlyph: {
    fontFamily: fonts.archivo,
    fontSize: 15,
    lineHeight: 18,
    color: colors.ink50,
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
  searchBoxError: { borderColor: colors.claret },
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

  // unlock sheet
  unlockCopy: {
    fontFamily: fonts.serif,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.ink80,
    marginBottom: 14,
  },
  unlockStrong: { fontFamily: fonts.serifBold, color: colors.ink },
  linkedinBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 100,
    backgroundColor: colors.accent,
    marginBottom: 18,
  },
  linkedinText: {
    fontFamily: fonts.archivoBold,
    fontSize: 12,
    letterSpacing: 0.3,
    color: colors.paper,
  },
  unlockError: {
    fontFamily: fonts.archivoSemi,
    fontSize: 12,
    color: colors.claret,
    marginTop: 8,
  },
  unlockHint: {
    fontFamily: fonts.serifItalic,
    fontSize: 12.5,
    color: colors.ink50,
    marginTop: 8,
  },
  unlockBtn: {
    marginTop: 18,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: colors.ink,
    alignItems: 'center',
  },
  unlockBtnDisabled: { opacity: 0.4 },
  unlockBtnText: {
    fontFamily: fonts.archivoBold,
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.paper,
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
