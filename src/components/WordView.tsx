/**
 * WordView — the full "mot du jour" explainer for a single term, rendered as content
 * (no outer scroll/header). Used by the Mot du jour tab AND the Glossaire detail, so a
 * past term looks exactly like today's. The parent supplies the ScrollView + padding.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
  return (
    <>
      {/* HERO */}
      <View style={styles.hero}>
        <View style={styles.heroBar}>
          <Text style={styles.heroBarLabel}>Décrypté</Text>
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
      </View>

      {/* ANATOMIE */}
      <SectionHeader label="Anatomie" color={colors.claret} />
      <View style={styles.partsRow}>
        {word.parts.map((p, i) => (
          <View
            key={p.label}
            style={[styles.part, { borderTopColor: PART_COLORS[i % PART_COLORS.length] }]}
          >
            <Text style={styles.partLabel}>{p.label}</Text>
            <Text style={styles.partRole}>{p.role}</Text>
          </View>
        ))}
      </View>

      {/* COMMENT ÇA MARCHE */}
      <SectionHeader label="Comment ça marche" color={colors.claret} />
      {word.how.map((s) => (
        <View key={s.n} style={styles.step}>
          <Text style={styles.stepN}>{s.n}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepH}>{s.h}</Text>
            <Text style={styles.stepT}>{s.t}</Text>
          </View>
        </View>
      ))}

      {/* POURQUOI EN VOGUE */}
      <View style={styles.whyBlock}>
        <Text style={styles.whyLabel}>Pourquoi c’est en vogue</Text>
        <Text style={styles.whyText}>{word.why}</Text>
      </View>

      {/* STARTUPS QUI L'UTILISENT */}
      {(word.startups ?? []).length > 0 ? (
        <>
          <SectionHeader label="Startups qui l’utilisent" color={colors.claret} rule="faint" />
          <View style={{ marginBottom: 18 }}>
            {word.startups.map((s, i) => (
              <View key={s.name + i} style={styles.startup}>
                <View style={styles.startupHead}>
                  <Text style={styles.startupName}>{s.name}</Text>
                  {s.place ? <Text style={styles.startupPlace}>{s.place}</Text> : null}
                </View>
                <Text style={styles.startupUse}>{s.use}</Text>
              </View>
            ))}
          </View>
        </>
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
});
