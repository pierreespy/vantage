/**
 * Builders: edition data → ShareCardData. Keeps the "what goes on the card" mapping
 * in one place, out of the screens. The date is uppercased to match the design's ours.
 */
import type { Strings } from '@/i18n/strings';
import type { Lead, Milestone, Deal, Bref, Word } from '@/content/types';
import type { ShareCardData } from '@/components/ShareCard';

const kicker = (...parts: (string | undefined)[]) =>
  parts.filter((p) => p && p.trim()).join(' · ');

export function leadCardData(lead: Lead, dateLong: string, t: Strings): ShareCardData {
  return {
    type: 'lead',
    rubric: t.share.lead,
    kicker: lead.kicker,
    title: lead.title,
    summary: lead.deck,
    date: dateLong.toUpperCase(),
  };
}

/** The day's advance reuses the lead template (pétrole kicker + title + summary). */
export function milestoneCardData(m: Milestone, dateLong: string, t: Strings): ShareCardData {
  return {
    type: 'lead',
    rubric: t.share.milestone,
    kicker: kicker(m.milestone, m.place, m.sector),
    title: m.title,
    summary: m.summary,
    date: dateLong.toUpperCase(),
  };
}

export function dealCardData(deal: Deal, dateLong: string, t: Strings): ShareCardData {
  return {
    type: 'deal',
    rubric: t.share.deal,
    kicker: kicker(deal.round, deal.sector),
    company: deal.company,
    amount: deal.amount,
    thesis: deal.thesis,
    date: dateLong.toUpperCase(),
  };
}

export function brefCardData(bref: Bref, dateLong: string, t: Strings): ShareCardData {
  return {
    type: 'breve',
    rubric: t.share.breve,
    kicker: kicker(bref.place, bref.sector),
    title: bref.title,
    summary: bref.summary,
    date: dateLong.toUpperCase(),
  };
}

export function wordCardData(word: Word, dateLong: string, t: Strings): ShareCardData {
  return {
    type: 'mot',
    rubric: t.share.word,
    term: word.term,
    full: word.full,
    fr: word.fr,
    def: word.definition,
    date: dateLong.toUpperCase(),
  };
}
