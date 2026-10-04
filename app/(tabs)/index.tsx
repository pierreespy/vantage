/**
 * Journal tab — native "Veille" screen (design 2a): the European MedTech watch.
 *
 * Header 1b épuré (date + VANTAGE CHRONICLE), then the scrolling ticker with its
 * legend (levées, M&A, but also marquages, avancées, naissances), the lead article
 * (★ favorite + clickable title), "L'avancée du jour" (the tech/clinical step forward,
 * decrypted), the "deal du jour" card (finance is one arm among others — both cards are
 * optional), the European brèves grouped by pillar (Tech & clinique, Réglementaire &
 * marché, Nouvelles pousses, Financement — see pillars.ts) and a short "Hors Europe"
 * section. Titles open the source article in the system browser. Pull down to fetch the
 * day's edition.
 *
 * All content comes from the shared daily Edition (useEdition).
 *
 * Animations : chaque bloc (ticker, une, deal, brèves) monte en fondu en cascade à
 * l'ouverture — et rejoue après un pull-to-refresh qui rapporte une nouvelle édition
 * (`replayKey` = date de l'édition). Les ★ font un « pop », les titres s'enfoncent
 * légèrement au toucher. Haptique : `hapticMedium` au déclenchement du refresh,
 * `hapticLight` à l'ouverture d'un article, succès/erreur sur les favoris.
 */
import React, { useCallback } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { useEdition } from '@/content/EditionProvider';
import { useFavorites } from '@/state/favorites';
import { useNotifications } from '@/state/notifications';
import { useShareCard } from '@/lib/useShareCard';
import { leadCardData, milestoneCardData, dealCardData, brefCardData } from '@/lib/shareData';
import { ShareButton } from '@/components/ShareButton';
import { FadeInView } from '@/components/FadeInView';
import { FavoriteStar } from '@/components/FavoriteStar';
import { PressableScale } from '@/components/PressableScale';
import { SignalBadge } from '@/components/SignalBadge';
import type { Bref } from '@/content/types';
import { groupByPillar, PILLAR_LABELS } from '@/content/pillars';
import { Ticker, TICKER_KINDS } from '@/components/Ticker';
import { colors, border } from '@/theme';
import { fonts } from '@/fonts';
import { hapticLight, hapticMedium } from '@/lib/haptics';

const openLink = (url: string) => WebBrowser.openBrowserAsync(url).catch(() => {});

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const { edition, loading, refresh, usesAI } = useEdition();
  const { isFollowed, toggle } = useFavorites();
  const { noteRead } = useNotifications();
  const { shareCard, sharing } = useShareCard();
  const { lead, milestone, deal, ticker, brefsEurope, brefsIntl } = edition;
  const europeByPillar = groupByPillar(brefsEurope);
  // Legend lists only the kinds present in today's ticker, in TICKER_KINDS order.
  const legendKinds = (Object.keys(TICKER_KINDS) as (keyof typeof TICKER_KINDS)[]).filter((k) =>
    ticker.some((t) => t.kind === k)
  );

  const onRefresh = useCallback(() => {
    // Le geste est confirmé dès qu'il part : la requête, elle, peut durer.
    hapticMedium();
    refresh();
  }, [refresh]);

  // Opening an article is the "first read" signal that arms the morning-notification
  // primer (see src/state/notifications.tsx). Every source link routes through here.
  const openArticle = useCallback(
    (url: string) => {
      hapticLight();
      noteRead();
      openLink(url);
    },
    [noteRead]
  );

  // <FavoriteStar> se charge du « pop » (ajout/retrait) ou du tremblement + retour
  // d'erreur quand `toggle` renvoie false (maximum de favoris atteint).
  const onToggleFav = (name: string) => toggle(name);

  // Rejoue la cascade d'apparition quand l'édition change (nouvelle date après refresh).
  const replayKey = edition.dateLong;

  return (
    <View style={styles.root}>
      {/* HEADER 1b épuré */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Text style={styles.date}>{edition.dateLong} · Veille MedTech Europe</Text>
        <Text style={styles.nameplate}>
          VANTAGE <Text style={styles.nameplateAccent}>CHRONICLE</Text>
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* ticker legend */}
        <View style={styles.legend}>
          {legendKinds.map((k) => (
            <View key={k} style={styles.legendItem}>
              <Text style={[styles.legendSym, { color: TICKER_KINDS[k].legend }]}>
                {TICKER_KINDS[k].symbol}
              </Text>
              <Text style={styles.legendText}>{TICKER_KINDS[k].label}</Text>
            </View>
          ))}
        </View>

        {/* ticker */}
        <FadeInView index={0} replayKey={replayKey} style={styles.tickerWrap}>
          <Ticker items={ticker} />
        </FadeInView>

        {/* LEAD */}
        <FadeInView index={1} replayKey={replayKey}>
          <View style={styles.kickerRow}>
            {lead.signalType ? <SignalBadge type={lead.signalType} /> : null}
            <Text style={styles.kicker}>{lead.kicker}</Text>
            {lead.ai || usesAI(lead.company) ? <AiBadge /> : null}
          </View>
          <View style={styles.leadRow}>
            <PressableScale
              style={{ flex: 1 }}
              activeScale={0.985}
              onPress={() => openArticle(lead.url)}
              accessibilityRole="link"
              haptic={false}
            >
              <Text style={styles.leadTitle}>{lead.title}</Text>
            </PressableScale>
            <ShareButton
              onPress={() => shareCard(leadCardData(lead, edition.dateLong))}
              disabled={sharing}
            />
            <FavoriteStar
              followed={isFollowed(lead.company)}
              onToggle={() => onToggleFav(lead.company)}
              style={styles.starBig}
              label="Ajouter aux favoris"
            />
          </View>
          <Text style={styles.deck}>{lead.deck}</Text>
        </FadeInView>

        {/* L'AVANCÉE DU JOUR */}
        {milestone ? (
          <FadeInView index={2} replayKey={replayKey} style={styles.mileCard}>
            <View style={styles.mileBar}>
              <Text style={styles.dealBarText}>L’avancée du jour</Text>
            </View>
            <View style={styles.dealBody}>
              <View style={styles.brefMetaRow}>
                {milestone.signalType ? <SignalBadge type={milestone.signalType} /> : null}
                {milestone.place || milestone.sector ? (
                  <Text style={[styles.brefMeta, { color: colors.accent }]}>
                    {[milestone.place, milestone.sector].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
                {milestone.ai || usesAI(milestone.company) ? <AiBadge /> : null}
              </View>
              <View style={styles.dealHead}>
                <Text style={styles.dealCompany}>{milestone.company}</Text>
                <View style={styles.mileBadge}>
                  <Text style={styles.roundText}>{milestone.milestone}</Text>
                </View>
              </View>
              <View style={styles.brefTitleRow}>
                <PressableScale
                  style={{ flex: 1 }}
                  activeScale={0.985}
                  onPress={() => openArticle(milestone.url)}
                  accessibilityRole="link"
                  haptic={false}
                >
                  <Text style={styles.mileTitle}>{milestone.title}</Text>
                </PressableScale>
                <ShareButton
                  onPress={() => shareCard(milestoneCardData(milestone, edition.dateLong))}
                  disabled={sharing}
                />
                <FavoriteStar
                  followed={isFollowed(milestone.company)}
                  onToggle={() => onToggleFav(milestone.company)}
                  style={styles.starSmall}
                  label="Ajouter aux favoris"
                />
              </View>
              <Text style={styles.dealThesis}>{milestone.summary}</Text>
              {milestone.why ? (
                <View style={styles.mileWhy}>
                  <Text style={styles.mileWhyLabel}>Pourquoi ça compte</Text>
                  <Text style={styles.dealThesis}>{milestone.why}</Text>
                </View>
              ) : null}
            </View>
          </FadeInView>
        ) : null}

        {/* DEAL CARD — le bras financier */}
        {deal ? (
          <FadeInView index={3} replayKey={replayKey} style={styles.dealCard}>
            <View style={styles.dealBar}>
              <Text style={styles.dealBarText}>Financement · le deal du jour</Text>
            </View>
            <View style={styles.dealBody}>
              <View style={styles.dealHead}>
                <PressableScale
                  activeScale={0.97}
                  onPress={() => openArticle(deal.url)}
                  accessibilityRole="link"
                  haptic={false}
                >
                  <Text style={styles.dealCompany}>{deal.company}</Text>
                </PressableScale>
                <Text style={styles.dealAmount}>{deal.amount}</Text>
                <View style={styles.roundBadge}>
                  <Text style={styles.roundText}>{deal.round}</Text>
                </View>
                {deal.ai || usesAI(deal.company) ? <AiBadge /> : null}
              </View>
              <Text style={styles.dealThesis}>{deal.thesis}</Text>
              <View style={styles.dealShareRow}>
                <ShareButton
                  label="Partager"
                  onPress={() => shareCard(dealCardData(deal, edition.dateLong))}
                  disabled={sharing}
                />
              </View>
            </View>
          </FadeInView>
        ) : null}

        {/* EUROPE — une section par rubrique (Tech & clinique → Financement) */}
        {europeByPillar.map(({ pillar, items }, g) => {
          // Cascade rank: after the 4 top blocks, each earlier group = header + its rows.
          const base = 4 + europeByPillar.slice(0, g).reduce((n, x) => n + 1 + x.items.length, 0);
          return (
            <React.Fragment key={pillar}>
              <FadeInView
                index={base}
                replayKey={replayKey}
                style={[styles.sectionHead, g > 0 && { marginTop: 18 }]}
              >
                <Text style={[styles.sectionLabel, { color: colors.claret }]}>
                  Europe · {PILLAR_LABELS[pillar]}
                </Text>
                <View style={styles.ruleStrong} />
              </FadeInView>
              {items.map((b, i) => (
                <BrefRow
                  key={b.url + i}
                  bref={b}
                  index={base + 1 + i}
                  replayKey={replayKey}
                  accent
                  ai={b.ai || usesAI(b.company)}
                  followed={isFollowed(b.company)}
                  onFav={() => onToggleFav(b.company)}
                  onOpen={openArticle}
                  onShare={() => shareCard(brefCardData(b, edition.dateLong))}
                  shareDisabled={sharing}
                />
              ))}
            </React.Fragment>
          );
        })}

        {/* HORS EUROPE */}
        {brefsIntl.length > 0 ? (
          <FadeInView
            index={4 + europeByPillar.length + brefsEurope.length}
            replayKey={replayKey}
            style={[styles.sectionHead, { marginTop: 18 }]}
          >
            <Text style={[styles.sectionLabel, { color: colors.ink60 }]}>Hors Europe</Text>
            <View style={styles.ruleFaint} />
          </FadeInView>
        ) : null}
        {brefsIntl.map((b, i) => (
          <BrefRow
            key={b.url + i}
            bref={b}
            index={5 + europeByPillar.length + brefsEurope.length + i}
            replayKey={replayKey}
            ai={b.ai || usesAI(b.company)}
            followed={isFollowed(b.company)}
            onFav={() => onToggleFav(b.company)}
            onOpen={openArticle}
            onShare={() => shareCard(brefCardData(b, edition.dateLong))}
            shareDisabled={sharing}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function AiBadge() {
  return (
    <View style={styles.aiBadge} accessibilityLabel="Utilise l’IA">
      <Text style={styles.aiText}>IA</Text>
    </View>
  );
}

function BrefRow({
  bref,
  index,
  replayKey,
  accent = false,
  ai = false,
  followed,
  onFav,
  onOpen,
  onShare,
  shareDisabled = false,
}: {
  bref: Bref;
  /** Rang global dans la page — décale l'apparition en cascade. */
  index: number;
  replayKey?: string | number;
  accent?: boolean;
  ai?: boolean;
  followed: boolean;
  /** Bascule le favori ; renvoie `false` si l'action est refusée. */
  onFav: () => boolean;
  onOpen: (url: string) => void;
  onShare: () => void;
  shareDisabled?: boolean;
}) {
  return (
    <FadeInView index={index} replayKey={replayKey} style={styles.bref}>
      <View style={styles.brefMetaRow}>
        {bref.signalType ? <SignalBadge type={bref.signalType} /> : null}
        <Text style={[styles.brefMeta, { color: accent ? colors.accent : colors.ink60 }]}>
          {bref.place} · {bref.sector}
        </Text>
        {ai ? <AiBadge /> : null}
      </View>
      <View style={styles.brefTitleRow}>
        <PressableScale
          style={{ flex: 1 }}
          activeScale={0.985}
          onPress={() => onOpen(bref.url)}
          accessibilityRole="link"
          haptic={false}
        >
          <Text style={styles.brefTitle}>{bref.title}</Text>
        </PressableScale>
        <ShareButton onPress={onShare} disabled={shareDisabled} />
        <FavoriteStar followed={followed} onToggle={onFav} style={styles.starSmall} />
      </View>
      <Text style={styles.brefSummary}>{bref.summary}</Text>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },

  // header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
  },
  date: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.ink60,
    marginBottom: 8,
    textAlign: 'center',
  },
  nameplate: {
    fontFamily: fonts.serifBold,
    fontSize: 32,
    letterSpacing: 0.3,
    color: colors.ink,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  nameplateAccent: { color: colors.accent },

  scroll: { paddingHorizontal: 20, paddingBottom: 132 },

  // legend
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4, alignItems: 'center', paddingTop: 9 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendSym: { fontSize: 12 },
  legendText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.ink60,
  },

  // ticker
  tickerWrap: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: border.soft,
  },

  // lead
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  kicker: {
    fontFamily: fonts.archivoBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  leadRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  leadTitle: {
    fontFamily: fonts.serifBold,
    fontSize: 25,
    lineHeight: 27,
    letterSpacing: -0.25,
    color: colors.ink,
  },
  starBig: { fontSize: 22, lineHeight: 24 },
  deck: {
    fontFamily: fonts.serif,
    fontSize: 15.5,
    lineHeight: 23,
    color: colors.ink80,
    marginBottom: 16,
  },

  // avancée du jour — pétrole, the non-financial counterpart of the ink deal card
  mileCard: { borderWidth: 1.5, borderColor: colors.accent, borderRadius: 8, marginBottom: 16 },
  mileBar: {
    backgroundColor: colors.accent,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderTopLeftRadius: 6.5,
    borderTopRightRadius: 6.5,
  },
  mileBadge: { backgroundColor: colors.claret, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  mileTitle: { fontFamily: fonts.serifSemi, fontSize: 16, lineHeight: 20, color: colors.ink },
  mileWhy: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: border.soft },
  mileWhyLabel: {
    fontFamily: fonts.archivoBold,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.accent,
    marginBottom: 3,
  },

  // deal
  dealCard: { borderWidth: 1.5, borderColor: colors.ink, borderRadius: 8, marginBottom: 16 },
  dealBar: {
    backgroundColor: colors.ink,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderTopLeftRadius: 6.5,
    borderTopRightRadius: 6.5,
  },
  dealBarText: {
    fontFamily: fonts.archivoBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.paper,
  },
  dealBody: { padding: 12 },
  dealHead: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  dealCompany: { fontFamily: fonts.serifBold, fontSize: 18, color: colors.ink },
  dealAmount: { fontFamily: fonts.monoSemi, fontSize: 16, color: colors.accent },
  roundBadge: { backgroundColor: colors.accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  roundText: {
    fontFamily: fonts.archivoBold,
    fontSize: 9,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.paper,
  },
  dealThesis: { fontFamily: fonts.serif, fontSize: 13, lineHeight: 18.8, color: colors.ink90 },
  dealShareRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },

  // section headers
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionLabel: {
    fontFamily: fonts.archivoBold,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  ruleStrong: { flex: 1, height: 2, backgroundColor: colors.ink },
  ruleFaint: { flex: 1, height: 1, backgroundColor: border.divider },

  // brèves
  bref: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: border.soft },
  brefMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  brefMeta: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  brefTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  brefTitle: { fontFamily: fonts.serifSemi, fontSize: 14.5, lineHeight: 18, color: colors.ink },
  starSmall: { fontSize: 16, lineHeight: 18 },
  brefSummary: { fontFamily: fonts.serif, fontSize: 12.5, lineHeight: 17.8, color: colors.ink70 },

  // "IA" badge — claret fill, distinct from the accent sector text / ink stage badge.
  aiBadge: {
    backgroundColor: colors.claret,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  aiText: {
    fontFamily: fonts.archivoBold,
    fontSize: 9,
    letterSpacing: 0.7,
    color: colors.paper,
  },
});
