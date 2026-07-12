/**
 * Builders: edition data → ShareCardData. Keeps the "what goes on the card" mapping
 * in one place, out of the screens. The date is uppercased to match the design's ours.
 */
import type { Lead, Deal, Bref, Word } from '@/content/types';
import type { ShareCardData } from '@/components/ShareCard';

const kicker = (...parts: (string | undefined)[]) =>
  parts.filter((p) => p && p.trim()).join(' · ');

export function leadCardData(lead: Lead, dateLong: string): ShareCardData {
  return {
    type: 'lead',
    rubric: 'La une',
    kicker: lead.kicker,
    title: lead.title,
    summary: lead.deck,
    date: dateLong.toUpperCase(),
  };
}

export function dealCardData(deal: Deal, dateLong: string): ShareCardData {
  return {
    type: 'deal',
    rubric: 'Deal du jour',
    kicker: kicker(deal.round, deal.sector),
    company: deal.company,
    amount: deal.amount,
    thesis: deal.thesis,
    date: dateLong.toUpperCase(),
  };
}

export function brefCardData(bref: Bref, dateLong: string): ShareCardData {
  return {
    type: 'breve',
    rubric: 'Brève',
    kicker: kicker(bref.place, bref.sector),
    title: bref.title,
    summary: bref.summary,
    date: dateLong.toUpperCase(),
  };
}

export function wordCardData(word: Word, dateLong: string): ShareCardData {
  return {
    type: 'mot',
    rubric: 'Mot du jour',
    term: word.term,
    full: word.full,
    fr: word.fr,
    def: word.definition,
    date: dateLong.toUpperCase(),
  };
}
