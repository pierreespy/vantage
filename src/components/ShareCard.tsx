/**
 * ShareCard — the 1080×1080 image shared to LinkedIn / Messages / etc.
 *
 * Pixel-faithful reproduction of the Claude Design handoff "Vantage Share Cards":
 * paper frame, "Vantage Chronicle" masthead + App Store badge, a 2px rule, the
 * content (Deal / Brève / Mot du jour) centered vertically, then a rubric+date footer.
 * Rendered off-screen at full 1080px and captured to a PNG (see src/lib/useShareCard.tsx).
 *
 * All sizes are the design's literal px at 1080 (letterSpacing em→px converted).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, border } from '@/theme';
import { fonts } from '@/fonts';

export type ShareCardData =
  | { type: 'deal'; rubric: string; kicker: string; company: string; amount: string; thesis: string; date: string }
  | { type: 'breve'; rubric: string; kicker: string; title: string; summary: string; date: string }
  | { type: 'mot'; rubric: string; term: string; full: string; fr: string; def: string; date: string };

/** The 1080×1080 canvas. */
export const CARD_SIZE = 1080;

/**
 * Body paragraphs are variable-length; a long deal thesis / brève summary used to
 * overflow the fixed canvas and bleed over the masthead and footer. We keep the
 * design's sizes for normal-length copy and step the font down only when the text
 * would not fit the space left between the (fixed) headline block and the footer.
 * `avail` is that leftover height in px; tuned against the design's real cards.
 */
const BODY = {
  deal: { fontSize: 42, lineHeight: 59, avail: 380 },
  breve: { fontSize: 40, lineHeight: 58, avail: 470 },
  mot: { fontSize: 42, lineHeight: 59, avail: 390 },
} as const;

/** Estimate a font size that keeps `text` within `avail` px on the 912px-wide card. */
function fitParagraph(
  text: string,
  base: { fontSize: number; lineHeight: number },
  avail: number,
): { fontSize: number; lineHeight: number } {
  const WIDTH = CARD_SIZE - 84 * 2; // content width inside the card padding
  const CHAR = 0.6; // avg glyph advance as a fraction of font size (serif, FR)
  const ratio = base.lineHeight / base.fontSize;
  let size = base.fontSize;
  while (size > 22) {
    const perLine = Math.max(1, Math.floor(WIDTH / (size * CHAR)));
    const lines = Math.ceil(text.length / perLine);
    if (lines * size * ratio <= avail) break;
    size -= 2;
  }
  return { fontSize: size, lineHeight: Math.round(size * ratio) };
}

function AppStoreBadge() {
  return (
    <View style={styles.badge}>
      <Svg width={34} height={34} viewBox="0 0 24 24" fill={colors.paper}>
        <Path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.19 2.31-.89 3.51-.8 1.54.15 2.7.74 3.44 1.79-3.14 1.98-2.36 6.16.4 7.44-.68 1.68-1.72 3.35-2.94 4.94zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
      </Svg>
      <View>
        <Text style={styles.badgeSmall}>Télécharger dans</Text>
        <Text style={styles.badgeBig}>l’App Store</Text>
      </View>
    </View>
  );
}

export function ShareCard({ data }: { data: ShareCardData }) {
  return (
    <View style={styles.card}>
      {/* EN-TÊTE OURS */}
      <View style={styles.header}>
        <Text style={styles.masthead}>
          Vantage <Text style={styles.mastheadAccent}>Chronicle</Text>
        </Text>
        <AppStoreBadge />
      </View>
      <View style={styles.headerRule} />

      {/* CONTENU */}
      <View style={styles.content}>
        {data.type === 'deal' ? (
          <>
            <Text style={[styles.kicker, { color: colors.accent }]}>{data.kicker}</Text>
            <Text style={styles.company} numberOfLines={1} adjustsFontSizeToFit>{data.company}</Text>
            <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>{data.amount}</Text>
            <Text style={[styles.thesis, fitParagraph(data.thesis, BODY.deal, BODY.deal.avail)]}>{data.thesis}</Text>
          </>
        ) : data.type === 'breve' ? (
          <>
            <Text style={[styles.kicker, styles.kickerBreve, { color: colors.claret }]}>{data.kicker}</Text>
            <Text style={styles.breveTitle} numberOfLines={3} adjustsFontSizeToFit>{data.title}</Text>
            <Text style={[styles.breveSummary, fitParagraph(data.summary, BODY.breve, BODY.breve.avail)]}>{data.summary}</Text>
          </>
        ) : (
          <>
            <Text style={[styles.kicker, { color: colors.accent, marginBottom: 20 }]}>Le mot du jour</Text>
            <Text style={styles.term} numberOfLines={1} adjustsFontSizeToFit>{data.term}</Text>
            <Text style={styles.termFull} numberOfLines={2}>{data.full}</Text>
            <Text style={styles.termFr} numberOfLines={2}>{data.fr}</Text>
            <View style={styles.motRule} />
            <Text style={[styles.def, fitParagraph(data.def, BODY.mot, BODY.mot.avail)]}>{data.def}</Text>
          </>
        )}
      </View>

      {/* PIED OURS */}
      <View style={styles.footerRule} />
      <View style={styles.footer}>
        <Text style={styles.footRubric}>{data.rubric}</Text>
        <Text style={styles.footDate}>{data.date}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 8,
    padding: 84,
    flexDirection: 'column',
  },

  // header (ours)
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  masthead: {
    fontFamily: fonts.serifBold,
    fontSize: 32,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  mastheadAccent: { color: colors.accent },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.ink,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  badgeSmall: { fontFamily: fonts.archivo, fontSize: 14, color: colors.paper, lineHeight: 16 },
  badgeBig: { fontFamily: fonts.archivoSemi, fontSize: 25, color: colors.paper, lineHeight: 27 },
  headerRule: { height: 2, backgroundColor: colors.ink, marginTop: 30 },

  // content
  content: { flex: 1, justifyContent: 'center', paddingVertical: 40, overflow: 'hidden' },

  kicker: {
    fontFamily: fonts.monoSemi,
    fontSize: 30,
    letterSpacing: 3.6,
    textTransform: 'uppercase',
    marginBottom: 26,
  },
  kickerBreve: { marginBottom: 30 },

  // deal
  company: {
    fontFamily: fonts.serifBold,
    fontSize: 104,
    lineHeight: 98,
    letterSpacing: -1.56,
    color: colors.ink,
    marginBottom: 30,
  },
  amount: {
    fontFamily: fonts.monoSemi,
    fontSize: 132,
    lineHeight: 119,
    color: colors.accent,
    marginBottom: 40,
  },
  thesis: { fontFamily: fonts.serif, fontSize: 42, lineHeight: 59, color: colors.ink90 },

  // brève
  breveTitle: {
    fontFamily: fonts.serifBold,
    fontSize: 78,
    lineHeight: 81,
    letterSpacing: -0.78,
    color: colors.ink,
    marginBottom: 34,
  },
  breveSummary: { fontFamily: fonts.serif, fontSize: 40, lineHeight: 58, color: colors.ink90 },

  // mot
  term: {
    fontFamily: fonts.serifBold,
    fontSize: 150,
    lineHeight: 129,
    letterSpacing: -3,
    color: colors.ink,
  },
  termFull: { fontFamily: fonts.serifSemi, fontSize: 40, color: colors.ink90, marginTop: 18 },
  termFr: { fontFamily: fonts.serifItalic, fontSize: 38, color: colors.ink60, marginBottom: 34 },
  motRule: { height: 1, backgroundColor: border.divider, marginBottom: 30 },
  def: { fontFamily: fonts.serif, fontSize: 42, lineHeight: 59, color: colors.ink90 },

  // footer (ours)
  footerRule: { height: 1, backgroundColor: border.starIdle, marginBottom: 26 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footRubric: {
    fontFamily: fonts.monoSemi,
    fontSize: 26,
    letterSpacing: 2.6,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  footDate: { fontFamily: fonts.monoMed, fontSize: 26, letterSpacing: 2.08, color: colors.ink60 },
});
