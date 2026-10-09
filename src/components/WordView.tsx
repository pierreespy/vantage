/**
 * WordView — the full "mot du jour" explainer for a single term, rendered as content
 * (no outer scroll/header). Used by the Mot du jour tab AND the Glossaire detail, so a
 * past term looks exactly like today's. The parent supplies the ScrollView + padding.
 *
 * Les sections montent en fondu, en cascade (<FadeInView>), et l'animation rejoue à
 * chaque changement de terme — c'est ce qui fait « tourner la page » quand on ouvre un
 * mot du glossaire.
 */
import { useSettings } from '@/state/settings';
import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { FadeInView } from '@/components/FadeInView';
import type { Word } from '@/content/types';
import { colors, border } from '@/theme';
import { fonts } from '@/fonts';

/** Anatomy brick colors, by position (guidage / attache / ogive). */
const PART_COLORS = [colors.accent, colors.mnaAmber, colors.claret];

/** Rubric header: label + a rule to the right. */
function SectionHeader({
  label,
  color,
  rule = 'strong',
}: {
  label: string;
  color: string;
  rule?: 'strong' | 'faint';
}) {
  return (
    <View style={styles.sectionHead}>
      <Text style={[styles.sectionLabel, { color }]}>{label}</Text>
      <View style={rule === 'strong' ? styles.ruleStrong : styles.ruleFaint} />
    </View>
  );
}

export function WordView({ word }: { word: Word }) {
  const { t } = useSettings();
  return (
    <>
      {/* HERO */}
      <FadeInView index={0} replayKey={word.term} style={styles.hero}>
        <View style={styles.heroBar}>
          <Text style={styles.heroBarLabel}>{t.word.decoded}</Text>
          {/* Catégorie principale seule (1er segment avant « · ») pour tenir dans le bandeau. */}
          <Text style={styles.heroBarField} numberOfLines={1}>
            {word.field.split('·')[0].trim()}
          </Text>
        </View>
        <View style={styles.heroBody}>
          <Text style={styles.term}>{word.term}</Text>
          <Text style={styles.full}>{word.full}</Text>
          <Text style={styles.fr}>{word.fr}</Text>
          <Text style={styles.definition}>{word.definition}</Text>
        </View>
      </FadeInView>

      {/* ANATOMIE */}
      <FadeInView index={1} replayKey={word.term}>
        <SectionHeader label={t.word.anatomy} color={colors.claret} />
      </FadeInView>
      <FadeInView index={2} replayKey={word.term} style={styles.partsRow}>
        {word.parts.map((p, i) => (
          <View
            key={p.label}
            style={[styles.part, { borderTopColor: PART_COLORS[i % PART_COLORS.length] }]}
          >
            <Text style={styles.partLabel}>{p.label}</Text>
            <Text style={styles.partRole}>{p.role}</Text>
          </View>
        ))}
      </FadeInView>

      {/* COMMENT ÇA MARCHE */}
      <FadeInView index={3} replayKey={word.term}>
        <SectionHeader label={t.word.howItWorks} color={colors.claret} />
      </FadeInView>
      {word.how.map((s, i) => (
        <FadeInView key={s.n} index={4 + i} replayKey={word.term} style={styles.step}>
          <Text style={styles.stepN}>{s.n}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepH}>{s.h}</Text>
            <Text style={styles.stepT}>{s.t}</Text>
          </View>
        </FadeInView>
      ))}

      {/* POURQUOI EN VOGUE */}
      <FadeInView index={4 + word.how.length} replayKey={word.term} style={styles.whyBlock}>
        <Text style={styles.whyLabel}>{t.word.whyTrending}</Text>
        <Text style={styles.whyText}>{word.why}</Text>
      </FadeInView>

      {/* STARTUPS QUI L'UTILISENT */}
      {(word.startups ?? []).length > 0 ? (
        <>
          <FadeInView index={5 + word.how.length} replayKey={word.term}>
            <SectionHeader label={t.word.startupsUsing} color={colors.claret} rule="faint" />
          </FadeInView>
          <View style={{ marginBottom: 18 }}>
            {word.startups.map((s, i) => (
              <FadeInView
                key={s.name + i}
                index={6 + word.how.length + i}
                replayKey={word.term}
                style={styles.startup}
              >
                <View style={styles.startupHead}>
                  <Text style={styles.startupName}>{s.name}</Text>
                  {s.place ? <Text style={styles.startupPlace}>{s.place}</Text> : null}
                </View>
                <Text style={styles.startupUse}>{s.use}</Text>
              </FadeInView>
            ))}
          </View>
        </>
      ) : null}

      {/* SOURCES — de quoi l'explication est tirée, pour montrer que rien n'est inventé */}
      {(word.sources ?? []).length > 0 ? (
        <FadeInView index={7 + word.how.length + (word.startups ?? []).length} replayKey={word.term}>
          <SectionHeader label={t.word.sources} color={colors.claret} rule="faint" />
          <Text style={styles.sourcesNote}>{t.word.sourcesNote}</Text>
          <View style={{ marginBottom: 18 }}>
            {(word.sources ?? []).map((s, i) => (
              <Pressable
                key={s.url + i}
                onPress={() => Linking.openURL(s.url).catch(() => {})}
                accessibilityRole="link"
                style={styles.source}
              >
                <Text style={styles.sourceN}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sourcePublisher}>{s.publisher}</Text>
                  <Text style={styles.sourceTitle}>{s.title}</Text>
                </View>
                <Text style={styles.sourceArrow}>↗</Text>
              </Pressable>
            ))}
          </View>
        </FadeInView>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  // hero
  hero: { borderWidth: 1.5, borderColor: colors.ink, borderRadius: 8, marginBottom: 18 },
  heroBar: {
    backgroundColor: colors.ink,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderTopLeftRadius: 6.5,
    borderTopRightRadius: 6.5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  heroBarLabel: {
    fontFamily: fonts.archivoBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.paper,
    flexShrink: 0,
  },
  heroBarField: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.paper,
    opacity: 0.8,
    flexShrink: 1,
    textAlign: 'right',
  },
  heroBody: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 16 },
  term: {
    fontFamily: fonts.serifBold,
    fontSize: 44,
    // lineHeight >= fontSize + small top padding so tall glyphs aren't clipped on iOS.
    lineHeight: 50,
    paddingTop: 2,
    letterSpacing: -0.5,
    color: colors.ink,
    marginBottom: 4,
  },
  full: { fontFamily: fonts.serifSemi, fontSize: 15, color: colors.ink90 },
  fr: {
    fontFamily: fonts.serifItalic,
    fontSize: 14,
    color: colors.ink60,
    marginBottom: 12,
  },
  definition: {
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 23,
    color: colors.ink90,
    borderTopWidth: 1,
    borderTopColor: border.medium,
    paddingTop: 12,
  },

  // section header
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionLabel: {
    fontFamily: fonts.archivoBold,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  ruleStrong: { flex: 1, height: 2, backgroundColor: colors.ink },
  ruleFaint: { flex: 1, height: 1, backgroundColor: border.divider },

  // anatomie
  partsRow: { flexDirection: 'row', gap: 6, marginBottom: 18 },
  part: {
    flex: 1,
    borderWidth: 1,
    borderColor: border.strong,
    borderTopWidth: 3,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  partLabel: { fontFamily: fonts.archivoBold, fontSize: 12.5, color: colors.ink },
  partRole: {
    fontFamily: fonts.serifItalic,
    fontSize: 11.5,
    color: colors.ink60,
    marginTop: 2,
    textAlign: 'center',
  },

  // steps
  step: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: border.light,
  },
  stepN: { fontFamily: fonts.monoSemi, fontSize: 20, color: colors.accent, lineHeight: 20 },
  stepH: { fontFamily: fonts.serifBold, fontSize: 14, color: colors.ink, marginBottom: 2 },
  stepT: { fontFamily: fonts.serif, fontSize: 13, lineHeight: 18.5, color: colors.ink70 },

  // why
  whyBlock: { marginTop: 18, marginBottom: 18 },
  whyLabel: {
    fontFamily: fonts.archivoBold,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: colors.accent,
    marginBottom: 6,
  },
  whyText: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 21.5, color: colors.ink90 },

  // startups qui l'utilisent
  startup: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: border.light,
  },
  startupHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  startupName: { fontFamily: fonts.serifBold, fontSize: 14.5, color: colors.ink, flexShrink: 1 },
  startupPlace: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.ink50,
  },
  startupUse: {
    fontFamily: fonts.serif,
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink70,
    marginTop: 3,
  },

  // sources
  sourcesNote: {
    fontFamily: fonts.serifItalic,
    fontSize: 12,
    lineHeight: 17,
    color: colors.ink60,
    marginBottom: 4,
  },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: border.light,
  },
  sourceN: { fontFamily: fonts.monoSemi, fontSize: 12, color: colors.accent, width: 14 },
  sourcePublisher: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.ink50,
  },
  sourceTitle: { fontFamily: fonts.serif, fontSize: 13, lineHeight: 18, color: colors.ink90 },
  sourceArrow: { fontFamily: fonts.mono, fontSize: 13, color: colors.accent },
});
