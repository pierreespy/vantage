/**
 * Journal tab — native "Veille" screen (design 2a).
 *
 * Header 1b épuré (date + VANTAGE CHRONICLE), then the scrolling ticker with its
 * legend, the lead article (★ favorite + clickable title), the "deal du jour" card,
 * and Brèves Europe + International (each with a ★ and a summary). Titles open the
 * source article in the system browser. Pull down to fetch the day's edition.
 *
 * All content comes from the shared daily Edition (useEdition).
 */
import React, { useCallback } from 'react';
import {
  Pressable,
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
import type { Bref } from '@/content/types';
import { Ticker } from '@/components/Ticker';
import { colors, border } from '@/theme';
import { fonts } from '@/fonts';
import { hapticError, hapticSuccess } from '@/lib/haptics';

const openLink = (url: string) => WebBrowser.openBrowserAsync(url).catch(() => {});

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const { edition, loading, refresh, usesAI } = useEdition();
  const { isFollowed, toggle } = useFavorites();
  const { lead, deal, ticker, brefsEurope, brefsIntl } = edition;

  const onRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const starColor = (name: string) => (isFollowed(name) ? colors.accent : border.starIdle);

  // ★ toggle with haptics: same "ok" cue on every successful tap (add OR remove),
  // and "non" when the add is refused (already at the max).
  const onToggleFav = (name: string) => {
    if (!toggle(name)) hapticError();
    else hapticSuccess();
  };

  return (
    <View style={styles.root}>
      {/* HEADER 1b épuré */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Text style={styles.date}>{edition.dateLong}</Text>
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
          <View style={styles.legendItem}>
            <Text style={[styles.legendSym, { color: colors.levGreen }]}>↑</Text>
            <Text style={styles.legendText}>Levée</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={[styles.legendSym, { color: colors.mnaAmber }]}>⇄</Text>
            <Text style={styles.legendText}>M&A</Text>
          </View>
        </View>

        {/* ticker */}
        <View style={styles.tickerWrap}>
          <Ticker items={ticker} />
        </View>

        {/* LEAD */}
        <View style={styles.kickerRow}>
          <Text style={styles.kicker}>{lead.kicker}</Text>
          {lead.ai || usesAI(lead.company) ? <AiBadge /> : null}
        </View>
        <View style={styles.leadRow}>
          <Pressable style={{ flex: 1 }} onPress={() => openLink(lead.url)} accessibilityRole="link">
            <Text style={styles.leadTitle}>{lead.title}</Text>
          </Pressable>
          <Pressable
            onPress={() => onToggleFav(lead.company)}
            accessibilityRole="button"
            accessibilityLabel="Ajouter aux favoris"
            hitSlop={8}
          >
            <Text style={[styles.starBig, { color: starColor(lead.company) }]}>★</Text>
          </Pressable>
        </View>
        <Text style={styles.deck}>{lead.deck}</Text>

        {/* DEAL CARD */}
        <View style={styles.dealCard}>
          <View style={styles.dealBar}>
            <Text style={styles.dealBarText}>Le deal du jour</Text>
          </View>
          <View style={styles.dealBody}>
            <View style={styles.dealHead}>
              <Pressable onPress={() => openLink(deal.url)} accessibilityRole="link">
                <Text style={styles.dealCompany}>{deal.company}</Text>
              </Pressable>
              <Text style={styles.dealAmount}>{deal.amount}</Text>
              <View style={styles.roundBadge}>
                <Text style={styles.roundText}>{deal.round}</Text>
              </View>
              {deal.ai || usesAI(deal.company) ? <AiBadge /> : null}
            </View>
            <Text style={styles.dealThesis}>{deal.thesis}</Text>
          </View>
        </View>

        {/* BRÈVES EUROPE */}
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionLabel, { color: colors.claret }]}>Brèves · Europe</Text>
          <View style={styles.ruleStrong} />
        </View>
        {brefsEurope.map((b, i) => (
          <BrefRow
            key={b.url + i}
            bref={b}
            accent
            ai={b.ai || usesAI(b.company)}
            starColor={starColor(b.company)}
            onFav={() => onToggleFav(b.company)}
          />
        ))}

        {/* BRÈVES INTERNATIONAL */}
        <View style={[styles.sectionHead, { marginTop: 18 }]}>
          <Text style={[styles.sectionLabel, { color: colors.ink60 }]}>Brèves · International</Text>
          <View style={styles.ruleFaint} />
        </View>
        {brefsIntl.map((b, i) => (
          <BrefRow
            key={b.url + i}
            bref={b}
            ai={b.ai || usesAI(b.company)}
            starColor={starColor(b.company)}
            onFav={() => onToggleFav(b.company)}
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
  accent = false,
  ai = false,
  starColor,
  onFav,
}: {
  bref: Bref;
  accent?: boolean;
  ai?: boolean;
  starColor: string;
  onFav: () => void;
}) {
  return (
    <View style={styles.bref}>
      <View style={styles.brefMetaRow}>
        <Text style={[styles.brefMeta, { color: accent ? colors.accent : colors.ink60 }]}>
          {bref.place} · {bref.sector}
        </Text>
        {ai ? <AiBadge /> : null}
      </View>
      <View style={styles.brefTitleRow}>
        <Pressable style={{ flex: 1 }} onPress={() => openLink(bref.url)} accessibilityRole="link">
          <Text style={styles.brefTitle}>{bref.title}</Text>
        </Pressable>
        <Pressable onPress={onFav} accessibilityRole="button" accessibilityLabel="Favori" hitSlop={8}>
          <Text style={[styles.starSmall, { color: starColor }]}>★</Text>
        </Pressable>
      </View>
      <Text style={styles.brefSummary}>{bref.summary}</Text>
    </View>
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
  legend: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingTop: 9 },
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
