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
import { useSettings } from '@/state/settings';
import type { Strings } from '@/i18n/strings';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Linking,
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
import { hapticError, hapticSuccess, hapticTap, hapticMedium } from '@/lib/haptics';
import { FadeInView } from '@/components/FadeInView';
import { PressableScale } from '@/components/PressableScale';
import { useSheetDrag } from '@/lib/useSheetDrag';
import { SignalBadge } from '@/components/SignalBadge';

const openLink = (url: string) => WebBrowser.openBrowserAsync(url).catch(() => {});

/**
 * Open the "day's code" contact on LinkedIn with the least friction:
 *  - if the LinkedIn app is installed → open it directly on the profile (the user is
 *    already signed in there, so no web login wall);
 *  - otherwise → send them to the App Store to get the app;
 *  - last resort → the web profile in the in-app browser.
 * (Detecting the app requires `linkedin` in ios.infoPlist.LSApplicationQueriesSchemes.)
 */
async function openContactLinkedIn() {
  try {
    if (await Linking.canOpenURL('linkedin://')) {
      await Linking.openURL(config.contactLinkedInApp);
      return;
    }
  } catch {
    // fall through to the App Store / web
  }
  try {
    await Linking.openURL(config.linkedInAppStoreUrl);
  } catch {
    WebBrowser.openBrowserAsync(config.contactLinkedInUrl).catch(() => {});
  }
}

/** The message shown when an add is blocked by the cap — tier-aware. */
function limitReachedMessage(tier: Tier, limit: number, t: Strings): string {
  if (tier === 'restricted') return t.favoris.limitRestricted(EXTENDED_LIMIT);
  return t.favoris.limitExtended(limit);
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
  const { stageOf, discoveredStartups } = useEdition();
  const access = useAccess();
  const { t } = useSettings();
  const f = t.favoris;

  // Reset the anonymous reporting: blank the shared doc, wipe local favorites + consent.
  const confirmReset = () => {
    Alert.alert(
      f.resetTitle,
      f.resetBody,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: f.reset,
          style: 'destructive',
          onPress: () => {
            void reset();
            hapticSuccess();
          },
        },
      ]
    );
  };

  const [sector, setSector] = useState<string>('Toutes');
  const [addOpen, setAddOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Every followed startup gets a card, in the order it was added. Ones we have data
  // for show their sector/news; the stage badge is filled from seeded data or, if
  // absent, from what the journal has reported for that company (dynamic stage). A
  // startup the journal introduced (not in the catalog) borrows its sector from there.
  const cards = useMemo<Startup[]>(() => {
    return followed
      .map((name) => {
        const disc = discoveredStartups.find((d) => d.name === name);
        const base = startupByName(name) ?? { name, sector: disc?.sector ?? '', news: [] };
        return { ...base, stage: base.stage ?? disc?.stage ?? stageOf(name) };
      })
      .filter((s) => sector === 'Toutes' || s.sector === sector);
  }, [followed, sector, stageOf, discoveredStartups]);

  // How many more startups the extended tier would unlock (drives the upsell card).
  const remaining = Math.max(0, EXTENDED_LIMIT - followed.length);

  return (
    <View style={styles.root}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Text style={styles.eyebrow}>
          {f.followedCount(followed.length, limit)}
        </Text>
        <View style={styles.titleRow}>
          <Text style={styles.h1}>{f.title}</Text>
          <View style={styles.titleActions}>
            {consent === 'granted' ? (
              <PressableScale
                onPress={confirmReset}
                style={styles.resetBtn}
                activeScale={0.93}
                accessibilityRole="button"
                accessibilityLabel={f.resetTitle}
              >
                <Text style={styles.resetText}>{f.reset}</Text>
              </PressableScale>
            ) : null}
            <PressableScale
              onPress={() => {
                // Ouverture d'une feuille : impulsion un cran au-dessus d'un simple tap.
                hapticMedium();
                setQuery('');
                setAddOpen(true);
              }}
              style={styles.addBtn}
              activeScale={0.88}
              haptic={false}
              accessibilityRole="button"
              accessibilityLabel={f.add}
            >
              <Text style={styles.addPlus}>+</Text>
            </PressableScale>
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
              <PressableScale
                key={s}
                onPress={() => {
                  if (!on) hapticTap();
                  setSector(s);
                }}
                style={[styles.chip, on && styles.chipOn]}
                activeScale={0.93}
                haptic={false}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{f.sectors[s] ?? s}</Text>
              </PressableScale>
            );
          })}
        </ScrollView>
      </View>

      {/* TIER BANNER — only while restricted; the door to the extended tier. */}
      {tier === 'restricted' ? (
        <PressableScale
          onPress={() => {
            hapticMedium();
            setUnlockOpen(true);
          }}
          style={styles.tierBanner}
          activeScale={0.985}
          haptic={false}
          accessibilityRole="button"
          accessibilityLabel={f.unlockExtended}
        >
          <LockIcon color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.tierTitle}>{f.tierTitle(limit)}</Text>
            <Text style={styles.tierSub}>{f.tierSub(EXTENDED_LIMIT)}</Text>
            <View style={styles.progressRow}>
              {Array.from({ length: EXTENDED_LIMIT }).map((_, i) => (
                <View key={i} style={[styles.seg, i < followed.length && styles.segOn]} />
              ))}
            </View>
          </View>
          <Text style={styles.tierChevron}>›</Text>
        </PressableScale>
      ) : null}

      {/* LIST */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {cards.length === 0 ? (
          <Text style={styles.emptyList}>{f.empty(f.sectors[sector] ?? sector)}</Text>
        ) : (
          cards.map((f, i) => (
            // La cascade rejoue quand le filtre secteur change : la liste se « recompose ».
            <FadeInView key={f.name} index={i} replayKey={sector}>
              <FavoriteCard startup={f} />
            </FadeInView>
          ))
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
  const { usesAI } = useEdition();
  const { toggle } = useFavorites();
  const { t } = useSettings();
  const ai = usesAI(startup.name);
  // Live per-startup news takes precedence; fall back to any seeded news for that
  // startup so a followed catalog entry still shows something until live news exists.
  const live = newsFor(startup.name);
  const news = live.length > 0 ? live : startup.news;

  const confirmRemove = () => {
    Alert.alert(t.favoris.removeTitle, t.favoris.removeBody(startup.name), [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.favoris.remove,
        style: 'destructive',
        onPress: () => {
          toggle(startup.name);
          // Le retrait a bien eu lieu : même signal « c'est fait » que dans le Journal.
          hapticSuccess();
        },
      },
    ]);
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.nameRow}>
          <PressableScale
            onPress={confirmRemove}
            activeScale={0.85}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t.favoris.removeLabel(startup.name)}
          >
            <Text style={styles.star}>★</Text>
          </PressableScale>
          <Text style={styles.name}>{startup.name}</Text>
        </View>
      </View>

      {startup.sector || startup.stage || ai ? (
        <View style={styles.metaRow}>
          {startup.sector ? <Text style={styles.sector}>{t.favoris.sectors[startup.sector] ?? startup.sector}</Text> : null}
          {startup.stage ? (
            <View style={styles.stageBadge}>
              <Text style={styles.stageText}>{startup.stage}</Text>
            </View>
          ) : null}
          {ai ? (
            <View style={[styles.stageBadge, styles.aiBadge]}>
              <Text style={styles.stageText}>{t.common.ai}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.cardDivider} />

      {news.length === 0 ? (
        <Text style={styles.noNews}>{t.favoris.noNews}</Text>
      ) : (
        news.map((n, i) => (
          <PressableScale
            key={n.url + i}
            onPress={() => openLink(n.url)}
            style={[styles.newsItem, i > 0 && styles.newsItemDivided]}
            activeScale={0.985}
            accessibilityRole="link"
          >
            <Text style={styles.newsTitle}>{n.title}</Text>
            <View style={styles.newsMetaRow}>
              {n.signalType ? <SignalBadge type={n.signalType} /> : null}
              <Text style={styles.newsMeta}>
                {n.source} · {n.date}
              </Text>
            </View>
          </PressableScale>
        ))
      )}
    </View>
  );
}

/** The locked "upsell" card: what the extended tier would unlock, with stacked ghost
 *  slots peeking out below. Tapping it opens the unlock sheet. Restricted tier only. */
function UpsellLocked({ remaining, onPress }: { remaining: number; onPress: () => void }) {
  const { t } = useSettings();
  return (
    <PressableScale
      onPress={onPress}
      style={styles.upsellWrap}
      activeScale={0.98}
      haptic={false}
      accessibilityRole="button"
      accessibilityLabel={t.favoris.upsellLabel(remaining)}
    >
      <View style={styles.upsellMain}>
        <View style={styles.upsellIcon}>
          <LockIcon color={colors.paper} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.upsellTitle}>{t.favoris.upsellTitle(remaining)}</Text>
          <Text style={styles.upsellSub}>{t.favoris.upsellSub}</Text>
        </View>
        <View style={styles.upsellBadge}>
          <Text style={styles.upsellBadgeText}>+{remaining}</Text>
        </View>
      </View>
      <View style={styles.ghost1} />
      <View style={styles.ghost2} />
    </PressableScale>
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
  const { translateY, panHandlers } = useSheetDrag(visible, onClose);
  const [code, setCode] = useState('');
  const { t } = useSettings();
  const [error, setError] = useState<string | null>(null);
  // Secousse horizontale du champ quand le code est refusé — le geste « non » d'iOS.
  const shake = useRef(new Animated.Value(0)).current;

  const shakeField = () => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

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
      hapticError();
      shakeField();
      setError(t.favoris.codeOffline);
      return;
    }
    if (verify(code)) {
      hapticSuccess();
      onUnlocked();
      onClose();
      Alert.alert(
        t.favoris.unlockedTitle,
        t.favoris.unlockedBody(EXTENDED_LIMIT)
      );
      return;
    }
    hapticError();
    shakeField();
    setError(t.favoris.codeWrong);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.scrim}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t.common.close} />
        <Animated.View
          style={[styles.sheet, { paddingBottom: 28 + insets.bottom, transform: [{ translateY }] }]}
        >
          <View {...panHandlers} style={styles.grabZone}>
            <View style={styles.grabber} />
          </View>

          <Text style={styles.unlockTitle}>{t.favoris.extendedTitle}</Text>
          <Text style={styles.unlockCopy}>
            {t.favoris.extendedCopy(EXTENDED_LIMIT)}
          </Text>

          <PressableScale
            onPress={openContactLinkedIn}
            style={styles.linkedinBtn}
            activeScale={0.97}
            accessibilityRole="link"
          >
            <View style={styles.linkedinBadge}>
              <Text style={styles.linkedinBadgeText}>in</Text>
            </View>
            <Text style={styles.linkedinText}>{t.favoris.contactLinkedIn}</Text>
          </PressableScale>

          <Text style={styles.codeLabel}>{t.favoris.code}</Text>
          <Animated.View
            style={{
              transform: [
                { translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] }) },
              ],
            }}
          >
            <TextInput
              value={code}
              onChangeText={(v) => {
                setCode(v);
                if (error) setError(null);
              }}
              style={[styles.codeInput, error ? styles.codeInputError : null]}
              autoCorrect={false}
              autoCapitalize="none"
              autoFocus
              onSubmitEditing={submit}
              returnKeyType="done"
            />
          </Animated.View>

          {error ? (
            <View style={styles.errRow}>
              <View style={styles.errDot}>
                <Text style={styles.errDotText}>!</Text>
              </View>
              <Text style={styles.errText}>{error}</Text>
            </View>
          ) : null}

          <PressableScale
            onPress={submit}
            disabled={code.trim().length === 0}
            style={[styles.unlockBtn, code.trim().length === 0 && styles.unlockBtnDisabled]}
            activeScale={0.97}
            haptic={false}
            accessibilityRole="button"
          >
            <Text style={styles.unlockBtnText}>{t.favoris.unlock}</Text>
          </PressableScale>
        </Animated.View>
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
  const { translateY, panHandlers } = useSheetDrag(visible, onClose);
  const { discoveredStartups, usesAI } = useEdition();
  const { t } = useSettings();
  const trimmed = query.trim();
  const q = trimmed.toLowerCase();

  // Searchable set = built-in catalog + startups the journal introduced (discovered) +
  // the user's manually-added startups. First writer wins per name, so the catalog's
  // data is authoritative; discoveries only ever add startups the catalog lacks. Each
  // entry carries its sector and funding stage when known.
  const allStartups = useMemo(() => {
    const byKey = new Map<string, { name: string; sector: string; stage?: string }>();
    const add = (c: { name: string; sector: string; stage?: string }) => {
      const key = c.name.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, { name: c.name, sector: c.sector, stage: c.stage });
    };
    for (const c of catalog) add(c);
    for (const c of discoveredStartups) add(c);
    for (const c of customStartups) add(c);
    return Array.from(byKey.values());
  }, [customStartups, discoveredStartups]);

  const matches = useMemo(() => {
    const base = q
      ? allStartups.filter(
          (c) => c.name.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q)
        )
      : allStartups;
    return [...base].sort((a, b) => a.name.localeCompare(b.name));
  }, [q, allStartups]);
  const results = matches.slice(0, 25);

  const listLabel = q ? t.favoris.results : t.favoris.suggestions;
  // Let the user add a startup they typed that isn't in the catalog — gated by a
  // confirmation so they verify the spelling first (avoids garbage entries).
  const exactExists = allStartups.some((c) => c.name.toLowerCase() === q);
  const canAddCustom = trimmed.length > 0 && !exactExists;

  const confirmAdd = () => {
    Alert.alert(
      t.favoris.checkNameTitle,
      t.favoris.checkNameBody(trimmed),
      [
        { text: t.favoris.fix, style: 'cancel' },
        {
          text: t.favoris.confirm,
          onPress: () => {
            if (!addCustomStartup(trimmed)) {
              hapticError();
              Alert.alert(t.favoris.limitTitle, limitReachedMessage(tier, limit, t));
            } else {
              hapticSuccess();
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
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t.common.close} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View {...panHandlers} style={styles.grabZone}>
            <View style={styles.grabber} />
          </View>

          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>{t.favoris.add}</Text>
            <PressableScale
              onPress={() => {
                hapticTap();
                onClose();
              }}
              haptic={false}
              accessibilityRole="button"
            >
              <Text style={styles.sheetClose}>{t.common.close}</Text>
            </PressableScale>
          </View>

          <View style={styles.searchBox}>
            <Text style={styles.searchGlyph}>⌕</Text>
            <TextInput
              value={query}
              onChangeText={onQuery}
              placeholder={t.favoris.searchStartup}
              placeholderTextColor={colors.ink50}
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.listLabel}>{listLabel}</Text>

          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 300 }}>
            {results.length === 0 && q.length > 0 ? (
              <Text style={styles.noResults}>{t.favoris.noStartup(query)}</Text>
            ) : null}

            {results.map((c, i) => {
              const on = isFollowed(c.name);
              return (
                // La liste se recompose à chaque frappe : la cascade rejoue avec `query`.
                <FadeInView key={c.name} index={i} replayKey={query} distance={8} style={styles.candRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.candName}>{c.name}</Text>
                    {c.sector || c.stage || usesAI(c.name) ? (
                      <View style={styles.candMeta}>
                        {c.sector ? <Text style={styles.candSector}>{t.favoris.sectors[c.sector] ?? c.sector}</Text> : null}
                        {c.stage ? (
                          <View style={styles.candStageBadge}>
                            <Text style={styles.candStageText}>{c.stage}</Text>
                          </View>
                        ) : null}
                        {usesAI(c.name) ? (
                          <View style={[styles.candStageBadge, styles.aiBadge]}>
                            <Text style={styles.candStageText}>{t.common.ai}</Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                  <PressableScale
                    onPress={() => {
                      if (!toggle(c.name)) {
                        hapticError();
                        Alert.alert(t.favoris.limitTitle, limitReachedMessage(tier, limit, t));
                      } else if (!on) {
                        hapticSuccess();
                      }
                    }}
                    style={[styles.followBtn, on ? styles.followBtnOn : styles.followBtnOff]}
                    activeScale={0.92}
                    haptic={false}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.followText, { color: on ? colors.accent : colors.paper }]}>
                      {on ? t.favoris.followed : t.favoris.follow}
                    </Text>
                  </PressableScale>
                </FadeInView>
              );
            })}

            {/* Manual add — for a real startup not yet in the catalogue. */}
            {canAddCustom ? (
              <View style={styles.addCustomRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.candName}>{t.favoris.addCustom(trimmed)}</Text>
                  <Text style={styles.addCustomHint}>{t.favoris.addCustomHint}</Text>
                </View>
                <PressableScale
                  onPress={confirmAdd}
                  style={[styles.followBtn, styles.followBtnOff]}
                  activeScale={0.92}
                  accessibilityRole="button"
                >
                  <Text style={[styles.followText, { color: colors.paper }]}>{t.favoris.verify}</Text>
                </PressableScale>
              </View>
            ) : null}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },

  // header
  header: { paddingHorizontal: 20, paddingBottom: 2 },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.ink60,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  titleActions: { flexDirection: 'row', alignItems: 'center' },
  h1: {
    fontFamily: fonts.serifBold,
    fontSize: 30,
    color: colors.ink,
    letterSpacing: -0.15,
  },
  resetBtn: { marginRight: 12, marginBottom: 6 },
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
  chips: { gap: 8, marginTop: 16, paddingRight: 20 },
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
    marginHorizontal: 20,
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
  list: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 128 },
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
  // "IA" badge — reuses the stage-badge sizing, only swapping in the claret fill so it
  // reads as distinct from the ink stage badge and the accent sector text.
  aiBadge: { backgroundColor: colors.claret },
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
  newsMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  newsMeta: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.ink50,
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
  // Wide touch zone around the grabber so it's easy to grab and drag the sheet down.
  grabZone: { alignSelf: 'stretch', alignItems: 'center', paddingTop: 14, paddingBottom: 18 },
  grabber: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: border.firm,
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
  candMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  candSector: {
    fontFamily: fonts.archivoSemi,
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  candStageBadge: {
    backgroundColor: colors.ink,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
  },
  candStageText: {
    fontFamily: fonts.mono,
    fontSize: 8.5,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.paper,
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
