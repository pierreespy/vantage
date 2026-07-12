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
  | { type: 'lead'; rubric: string; kicker: string; title: string; summary: string; date: string }
  | { type: 'breve'; rubric: string; kicker: string; title: string; summary: string; date: string }
  | { type: 'mot'; rubric: string; term: string; full: string; fr: string; def: string; date: string };

/** The 1080×1080 canvas. */
export const CARD_SIZE = 1080;

/**
 * Content is variable-length. To keep it left-aligned and full-width (no horizontal
 * squeeze) while always fitting the fixed square, the block is anchored top-left and only
 * the body paragraph's font shrinks when a card is dense — headlines keep their design
 * size. `headlineHeight` estimates what the headlines take so the body gets the rest.
 */
const CONTENT_WIDTH = CARD_SIZE - 84 * 2; // text wraps within the card padding
const CONTENT_AVAIL = 660; // height the content block gets (between rule and footer, minus its padding)

/** Rough wrapped-line count for `text` on the fixed-width card (glyph advance ≈ 0.55·size). */
function estLines(text: string, fontSize: number, letterSpacing = 0): number {
  const advance = fontSize * 0.55 + Math.max(0, letterSpacing);
  return Math.max(1, Math.ceil((text.length * advance) / CONTENT_WIDTH));
}
function estBlock(text: string, fontSize: number, lineHeight: number, marginBottom = 0, letterSpacing = 0): number {
  return estLines(text, fontSize, letterSpacing) * lineHeight + marginBottom;
}

/** Line count for a headline, capped like its numberOfLines (it shrinks to fit, not wraps further). */
function cappedLines(text: string, fontSize: number, max: number, letterSpacing = 0): number {
  return Math.min(max, estLines(text, fontSize, letterSpacing));
}

/** Height of everything ABOVE the body paragraph, per card. Headlines are capped in lines
 *  (they shrink to fit rather than wrap further), so this is a tight upper bound. */
function headlineHeight(data: ShareCardData): number {
  if (data.type === 'deal') {
    return (
      estBlock(data.kicker, 30, 39, 26, 3.6) +
      cappedLines(data.company, 104, 2) * 104 + 30 +
      amountFont(data.amount) + 40 // amount is kept to one line at its adaptive size
    );
  }
  if (data.type === 'breve') {
    return estBlock(data.kicker, 22, 29, 28, 2.4) + cappedLines(data.title, 78, 3) * 81 + 34;
  }
  if (data.type === 'lead') {
    return estBlock(data.kicker, 30, 39, 26, 3.6) + cappedLines(data.title, 78, 3) * 81 + 34;
  }
  return (
    estBlock('Le mot du jour', 30, 39, 20, 3.6) +
    cappedLines(data.term, 150, 2) * 150 +
    estBlock(data.full, 40, 48, 18) +
    estBlock(data.fr, 38, 46, 34) +
    31 // motRule + its margin
  );
}

/** The deal amount is a hero number for short values ("1,5 Md$") but shrinks (staying on
 *  one line) for long compound ones ("€4,2M (acquisition) + €3,1M (levée)"), so it doesn't
 *  dominate the card and starve the thesis. Capped at the design 132px, floored at 40px. */
function amountFont(text: string): number {
  const size = Math.floor(CONTENT_WIDTH / Math.max(1, text.length * 0.6)); // mono ≈ 0.6em/char
  return Math.max(40, Math.min(132, size));
}

/** Design size of each card's body paragraph. */
const BODY = {
  deal: { fontSize: 42, lineHeight: 59 },
  lead: { fontSize: 40, lineHeight: 58 },
  breve: { fontSize: 40, lineHeight: 58 },
  mot: { fontSize: 42, lineHeight: 59 },
} as const;

/** Shrink ONLY the body font (keeping its line-spacing ratio) so a long paragraph fits
 *  `avail` px — text stays full-width and left-aligned, never squeezed horizontally.
 *  Floors at 20px; `height` is the resulting block height (may exceed `avail` at the floor,
 *  which the caller catches with a last-resort scale). */
function fitBody(text: string, base: { fontSize: number; lineHeight: number }, avail: number) {
  const ratio = base.lineHeight / base.fontSize;
  let size = base.fontSize;
  let height = base.lineHeight;
  while (true) {
    const perLine = Math.max(1, Math.floor(CONTENT_WIDTH / (size * 0.55)));
    const lines = Math.ceil(text.length / perLine);
    height = lines * size * ratio;
    if (height <= avail || size <= 20) break;
    size -= 2;
  }
  return { fontSize: size, lineHeight: Math.round(size * ratio), height };
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
  // The body paragraph gets whatever height the headlines leave, then its font shrinks to
  // fit — so the text stays left-aligned and full-width, never squeezed.
  const bodyText = data.type === 'deal' ? data.thesis : data.type === 'mot' ? data.def : data.summary;
  const bodyBase = data.type === 'deal' ? BODY.deal : data.type === 'mot' ? BODY.mot : BODY.breve;
  const amountSize = data.type === 'deal' ? amountFont(data.amount) : 0;
  const headH = headlineHeight(data);
  const body = fitBody(bodyText, bodyBase, CONTENT_AVAIL - headH);
  const bodyStyle = { fontSize: body.fontSize, lineHeight: body.lineHeight };
  // Last resort for a very dense card: if the floored body still overflows, scale the whole
  // block from the top-left — it stays left-aligned and top-anchored, never re-centered.
  const scale = Math.min(1, CONTENT_AVAIL / (headH + body.height));
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

      {/* CONTENU — ancré en haut à gauche ; seul le corps rétrécit si l'article est long */}
      <View style={styles.content}>
        <View style={[styles.contentInner, { transform: [{ scale }], transformOrigin: 'left top' }]}>
          {data.type === 'deal' ? (
            <>
              <Text style={[styles.kicker, { color: colors.accent }]}>{data.kicker}</Text>
              <Text style={styles.company} numberOfLines={2} adjustsFontSizeToFit>{data.company}</Text>
              <Text style={[styles.amount, { fontSize: amountSize, lineHeight: amountSize }]} numberOfLines={1} adjustsFontSizeToFit>{data.amount}</Text>
              <Text style={[styles.thesis, bodyStyle]}>{data.thesis}</Text>
            </>
          ) : data.type === 'breve' || data.type === 'lead' ? (
            <>
              {data.type === 'lead' ? (
                <Text style={[styles.kicker, { color: colors.accent }]}>{data.kicker}</Text>
              ) : (
                <Text style={[styles.kicker, styles.kickerBreve, { color: colors.claret }]}>{data.kicker}</Text>
              )}
              <Text style={styles.breveTitle} numberOfLines={3} adjustsFontSizeToFit>{data.title}</Text>
              <Text style={[styles.breveSummary, bodyStyle]}>{data.summary}</Text>
            </>
          ) : (
            <>
              <Text style={[styles.kicker, { color: colors.accent, marginBottom: 20 }]}>Le mot du jour</Text>
              <Text style={styles.term} numberOfLines={2} adjustsFontSizeToFit>{data.term}</Text>
              <Text style={styles.termFull}>{data.full}</Text>
              <Text style={styles.termFr}>{data.fr}</Text>
              <View style={styles.motRule} />
              <Text style={[styles.def, bodyStyle]}>{data.def}</Text>
            </>
          )}
        </View>
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

  // header (ours) — align tops so the App Store badge sits at the masthead's level
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
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

  // content — anchored to the top so a dense card only ever clips at the bottom, never
  // into the masthead; the body font (fitBody) keeps it fitting.
  content: { flex: 1, justifyContent: 'flex-start', paddingVertical: 40, overflow: 'hidden' },
  contentInner: { width: '100%' },

  kicker: {
    fontFamily: fonts.monoSemi,
    fontSize: 30,
    letterSpacing: 3.6,
    textTransform: 'uppercase',
    marginBottom: 26,
  },
  // brève kicker smaller than the deal one, so the red rubric leaves more room for the title
  kickerBreve: { fontSize: 22, letterSpacing: 2.4, marginBottom: 28 },

  // deal
  company: {
    fontFamily: fonts.serifBold,
    fontSize: 104,
    // lineHeight >= fontSize so adjustsFontSizeToFit never clips tall glyphs.
    lineHeight: 104,
    letterSpacing: -1.56,
    color: colors.ink,
    marginBottom: 30,
  },
  amount: {
    fontFamily: fonts.monoSemi,
    fontSize: 132,
    lineHeight: 132,
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
    // lineHeight >= fontSize so tall caps aren't clipped at the top on iOS.
    lineHeight: 150,
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
