/**
 * Favoris tab — native. Implements the "Vantage Favoris restreint" Claude Design.
 *
 * One card per followed startup (star + name, sector + stage badge, remove ✕) with its
 * recent clickable news. A "+" opens the "Ajouter un favori" sheet. Sector chips filter.
 *
 * Tiers: a new install is "restricted" (1 favorite). The header banner + a locked
 * "upsell" card (stacked ghost slots showing the favorites still to unlock) both open the
 * unlock sheet; entering the day's code — obtained from the owner on LinkedIn — unlocks
 * the "extended" tier (up to 6) for good. Favorites are the shared, persisted state.
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

/** Small vector padlock, tinted, drawn to match the design (no emoji). */
function LockIcon({ color, size = 1 }: { color: string; size?: number }) {
  return (
    <View style={{ width: 14 * size, height: 16 * size }}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 2.5 * size,
          width: 9 * size,
          height: 8 * size,
          borderWidth: 2 * size,
          borderColor: color,
          borderBottomWidth: 0,
          borderTopLeftRadius: 5 * size,
          borderTopRightRadius: 5 * size,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: 14 * size,
          height: 10 * size,
          backgroundColor: color,
          borderRadius: 2 * size,
        }}
      />
    </View>
  );
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

  // How many more startups the extended tier would unlock (drives the upsell card).
  const remaining = Math.max(0, EXTENDED_LIMIT - followed.length);

  return (
    <View style={styles.root}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Text style={styles.eyebrow}>
          {followed.length} / {limit} startup{limit > 1 ? 's' : ''} suivie{limit > 1 ? 's' : ''}
        </Text>
        <View style={styles.titleRow}>
          <Text style={styles.h1}>Favoris</Text>
          <View style={styles.titleActions}>
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
          <LockIcon color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.tierTitle}>Version restreinte — {limit} favori</Text>
            <Text style={styles.tierSub}>Débloquer la version étendue (jusqu’à {EXTENDED_LIMIT})</Text>
            <View style={styles.progressRow}>
              {Array.from({ length: EXTENDED_LIMIT }).map((_, i) => (
                <View key={i} style={[styles.seg, i < followed.length && styles.segOn]} />
              ))}
            </View>
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

        {tier === 'restricted' && remaining > 0 ? (
          <UpsellLocked remaining={remaining} onPress={() => setUnlockOpen(true)} />
        ) : null}
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
        <View style={styles.nameRow}>
          <Text style={styles.star}>★</Text>
          <Text style={styles.name}>{startup.name}</Text>
        </View>
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

      {startup.sector || startup.stage ? (
        <View style={styles.metaRow}>
          {startup.sector ? <Text style={styles.sector}>{startup.sector}</Text> : null}
          {startup.stage ? (
            <View style={styles.stageBadge}>
              <Text style={styles.stageText}>{startup.stage}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.cardDivider} />

      {news.length === 0 ? (
        <Text style={styles.noNews}>Pas encore d’actualité suivie.</Text>
      ) : (
        news.map((n, i) => (
          <Pressable
            key={n.url + i}
            onPress={() => openLink(n.url)}
            style={[styles.newsItem, i > 0 && styles.newsItemDivided]}
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
  );
}

/** The locked "upsell" card: what the extended tier would unlock, with stacked ghost
 *  slots peeking out below. Tapping it opens the unlock sheet. Restricted tier only. */
function UpsellLocked({ remaining, onPress }: { remaining: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.upsellWrap}
      accessibilityRole="button"
      accessibilityLabel={`Débloquer ${remaining} favoris supplémentaires avec la version étendue`}
    >
      <View style={styles.upsellMain}>
        <View style={styles.upsellIcon}>
          <LockIcon color={colors.paper} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.upsellTitle}>
            Encore {remaining} favori{remaining > 1 ? 's' : ''} à suivre
          </Text>
          <Text style={styles.upsellSub}>Avec la version étendue</Text>
        </View>
        <View style={styles.upsellBadge}>
          <Text style={styles.upsellBadgeText}>+{remaining}</Text>
        </View>
      </View>
      <View style={styles.ghost1} />
      <View style={styles.ghost2} />
    </Pressable>
  );
}

function UnlockSheet({
  visible,
  onClose,
  verify,
  ready,
  onUnlocked,
}: {
  visible: boolean;
  onClose: () => void;
  verify: (input: string) => boolean;
  ready: boolean;
  onUnlocked: () => void;
}) {
  const insets = useSafeAreaInsets();
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
    setError('Code incorrect.');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.scrim}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />
        <View style={[styles.sheet, { paddingBottom: 28 + insets.bottom }]}>
          <View style={styles.grabber} />

          <Text style={styles.unlockTitle}>Version étendue</Text>
          <Text style={styles.unlockCopy}>
            La version étendue permet de suivre jusqu’à {EXTENDED_LIMIT} startups. Pour des
            raisons d’architecture, elle n’est pas ouverte à tous : elle se débloque avec un
            code que je pourrais vous transmettre sur LinkedIn.
          </Text>

          <Pressable
            onPress={() => openLink(config.contactLinkedInUrl)}
            style={styles.linkedinBtn}
            accessibilityRole="link"
          >
            <View style={styles.linkedinBadge}>
              <Text style={styles.linkedinBadgeText}>in</Text>
            </View>
            <Text style={styles.linkedinText}>Me contacter sur LinkedIn</Text>
          </Pressable>

          <Text style={styles.codeLabel}>Code</Text>
          <TextInput
            value={code}
            onChangeText={(v) => {
              setCode(v);
              if (error) setError(null);
            }}
            placeholder="ex. mot-mot-nombre"
            placeholderTextColor={colors.ink40}
            style={[styles.codeInput, error ? styles.codeInputError : null]}
            autoCorrect={false}
            autoCapitalize="none"
            autoFocus
            onSubmitEditing={submit}
            returnKeyType="done"
          />

          {error ? (
            <View style={styles.errRow}>
              <View style={styles.errDot}>
                <Text style={styles.errDotText}>!</Text>
              </View>
              <Text style={styles.errText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={code.trim().length === 0}
            style={[styles.unlockBtn, code.trim().length === 0 && styles.unlockBtnDisabled]}
            accessibilityRole="button"
          >
            <Text style={styles.unlockBtnText}>DÉBLOQUER</Text>
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
  header: { paddingHorizontal: 22, paddingBottom: 2 },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.ink60,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  titleActions: { flexDirection: 'row', alignItems: 'center' },
  h1: {
    fontFamily: fonts.serifBold,
    fontSize: 42,
    lineHeight: 42,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  resetBtn: { marginRight: 14, marginBottom: 8 },
  resetText: {
    fontFamily: fonts.archivoSemi,
    fontSize: 10.5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.ink50,
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
  chips: { gap: 8, marginTop: 18, paddingRight: 22 },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: border.firm,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: {
    fontFamily: fonts.archivoSemi,
    fontSize: 12.5,
    color: colors.ink70,
  },
  chipTextOn: { color: colors.paper },

  // tier banner
  tierBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 22,
    marginTop: 16,
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: border.accent,
    backgroundColor: glass.accentTint,
  },
  tierTitle: {
    fontFamily: fonts.serifSemi,
    fontSize: 14,
    color: colors.ink,
  },
  tierSub: {
    fontFamily: fonts.archivoSemi,
    fontSize: 12,
    color: colors.accent,
    marginTop: 2,
  },
  progressRow: { flexDirection: 'row', gap: 3, marginTop: 9 },
  seg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: border.accentStrong },
  segOn: { backgroundColor: colors.accent },
  tierChevron: {
    fontFamily: fonts.serifBold,
    fontSize: 22,
    color: colors.accent,
    alignSelf: 'flex-start',
  },

  // list
  list: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 128 },
  emptyList: {
    fontFamily: fonts.serifItalic,
    fontSize: 14.5,
    color: colors.ink50,
    marginTop: 8,
    lineHeight: 22,
  },

  // card
  card: {
    borderWidth: 1,
    borderColor: border.faint,
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 15,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  star: { color: colors.accent, fontSize: 15, lineHeight: 20 },
  name: {
    fontFamily: fonts.serifBold,
    fontSize: 20,
    color: colors.ink,
    lineHeight: 21,
    flexShrink: 1,
  },
  removeBtn: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  removeGlyph: {
    fontFamily: fonts.archivo,
    fontSize: 15,
    lineHeight: 18,
    color: colors.ink40,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 9 },
  sector: {
    fontFamily: fonts.archivoBold,
    fontSize: 10,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  stageBadge: {
    backgroundColor: colors.ink,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 3,
  },
  stageText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.paper,
  },
  cardDivider: { height: 1, backgroundColor: border.faint, marginVertical: 14 },
  noNews: {
    fontFamily: fonts.serifItalic,
    fontSize: 12.5,
    color: colors.ink50,
  },
  newsItem: { paddingVertical: 2 },
  newsItemDivided: {
    borderTopWidth: 1,
    borderTopColor: border.faint,
    marginTop: 10,
    paddingTop: 11,
  },
  newsTitle: {
    fontFamily: fonts.serifSemi,
    fontSize: 14.5,
    lineHeight: 19,
    color: colors.ink,
  },
  newsMeta: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.ink50,
    marginTop: 6,
  },

  // upsell (locked)
  upsellWrap: { marginTop: 2 },
  upsellMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: border.accentStrong,
    backgroundColor: glass.accentFill,
  },
  upsellIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upsellTitle: {
    fontFamily: fonts.serifBold,
    fontSize: 16,
    color: colors.ink,
    lineHeight: 18,
  },
  upsellSub: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.accent,
    marginTop: 4,
  },
  upsellBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 6,
  },
  upsellBadgeText: {
    fontFamily: fonts.archivoBold,
    fontSize: 15,
    color: colors.paper,
  },
  ghost1: {
    height: 10,
    marginTop: -1,
    marginHorizontal: 12,
    backgroundColor: glass.accentTint,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: border.accent,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  ghost2: {
    height: 8,
    marginTop: -1,
    marginHorizontal: 24,
    backgroundColor: glass.accentFillFaint,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: border.accentFaint,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },

  // sheets (shared)
  scrim: { flex: 1, backgroundColor: glass.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  grabber: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: border.firm,
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 20,
  },

  // unlock sheet
  unlockTitle: {
    fontFamily: fonts.serifBold,
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  unlockCopy: {
    fontFamily: fonts.archivo,
    fontSize: 14,
    lineHeight: 22,
    color: colors.ink70,
    marginTop: 12,
  },
  linkedinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: colors.accent,
    borderRadius: 100,
    paddingVertical: 15,
    marginTop: 20,
  },
  linkedinBadge: {
    width: 18,
    height: 18,
    borderRadius: 3,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkedinBadgeText: {
    fontFamily: fonts.archivoBold,
    fontSize: 11,
    color: colors.accent,
  },
  linkedinText: {
    fontFamily: fonts.archivoSemi,
    fontSize: 14,
    color: colors.paper,
  },
  codeLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.ink60,
    marginTop: 22,
  },
  codeInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: border.bold,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontFamily: fonts.archivo,
    fontSize: 15,
    color: colors.ink,
    marginTop: 8,
  },
  codeInputError: { borderColor: colors.claret },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 9 },
  errDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.claret,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errDotText: {
    fontFamily: fonts.archivoBold,
    fontSize: 11,
    color: colors.paper,
    lineHeight: 13,
  },
  errText: {
    fontFamily: fonts.archivoMed,
    fontSize: 12.5,
    color: colors.claret,
  },
  unlockBtn: {
    backgroundColor: colors.ink,
    borderRadius: 8,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 14,
  },
  unlockBtnDisabled: { opacity: 0.4 },
  unlockBtnText: {
    fontFamily: fonts.archivoBold,
    fontSize: 14,
    letterSpacing: 1.4,
    color: colors.paper,
  },

  // add sheet
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
    backgroundColor: glass.accentTint,
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
