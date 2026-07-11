/**
 * Bundled sample edition — ships inside the app so it works instantly, offline,
 * and before any daily content has been published. The live edition (fetched from
 * config.contentUrl) replaces it when available.
 *
 * Content ported from the "Vantage App iOS" design (edition of 8 juil. 2026).
 */
import type { Edition } from './types';

export const sampleEdition: Edition = {
  dateLong: '8 juil. 2026',

  ticker: [
    { company: 'ALDERAAN', amount: '€120M', kind: 'lev' },
    { company: 'CUREVAC', amount: '$1.3Md', kind: 'mna' },
    { company: 'VITROGEN', amount: '€24M', kind: 'lev' },
    { company: 'FLOW NEURO', amount: '€18M', kind: 'lev' },
    { company: 'OWKIN', amount: '+€30M', kind: 'mna' },
    { company: 'CARDIOWAVE', amount: '€14M', kind: 'lev' },
  ],

  lead: {
    kicker: 'Series B · Oncologie',
    title: 'Alderaan Bio lève 120 M€ pour ses thérapies à ARN ciblé',
    deck: 'Le tour, mené par Sofinnova avec Jeito Capital et l’EIC Fund, place la biotech parisienne parmi les mieux financées d’Europe en oncologie.',
    company: 'Alderaan Bio',
    stage: 'Series B',
    sector: 'Oncologie',
    url: 'https://sifted.eu',
  },

  deal: {
    company: 'CureVac',
    amount: '$1,3 Md',
    round: 'M&A',
    thesis: 'GSK rachète le pionnier allemand de l’ARNm pour internaliser sa plateforme — cas d’école de consolidation post-Covid.',
    sector: 'Biotech',
    url: 'https://endpts.com',
  },

  brefsEurope: [
    {
      company: 'Vitrogen',
      place: 'Munich',
      sector: 'MedTech',
      stage: 'Series A',
      title: 'Vitrogen boucle 24 M€ en Series A',
      summary: 'Valves cardiaques résorbables ; tour mené par un fonds allemand deep-tech. Premiers essais cliniques attendus fin 2026.',
      url: 'https://www.eu-startups.com',
    },
    {
      company: 'Flow Neuroscience',
      place: 'Stockholm',
      sector: 'Digital Health',
      title: 'Flow Neuroscience étend sa Series B à 18 M€',
      summary: 'La medtech de neurostimulation contre la dépression accélère son déploiement aux États-Unis.',
      url: 'https://sifted.eu',
    },
    {
      company: 'Balderton',
      place: 'Londres',
      sector: 'Fonds',
      title: 'Balderton dédie 100 M$ à la healthtech européenne',
      summary: 'Nouveau véhicule early-stage centré sur l’IA appliquée au diagnostic médical.',
      url: 'https://tech.eu',
    },
    {
      company: 'Aboleris Pharma',
      place: 'Paris',
      sector: 'Biotech',
      stage: 'Series A',
      title: 'Aboleris Pharma lève 42 M€ en Series A',
      summary: 'Immunothérapies de tolérance contre les maladies auto-immunes ; tour mené par Jeito Capital et Bpifrance.',
      url: 'https://sifted.eu',
    },
    {
      company: 'Swissmedic',
      place: 'Bâle',
      sector: 'Réglementaire',
      title: 'Swissmedic ouvre une voie accélérée pour les DTx',
      summary: 'Les thérapies digitales validées cliniquement pourront être évaluées en 90 jours.',
      url: 'https://www.swissmedic.ch',
    },
  ],

  brefsIntl: [
    {
      company: 'Chroma Medicine',
      place: 'Boston',
      sector: 'Biotech',
      stage: 'Series A',
      title: 'Chroma Medicine lève 60 M$ en Series A',
      summary: 'Édition épigénétique in vivo ; tour mené par GV (Google Ventures) et Atlas Venture.',
      url: 'https://www.fiercebiotech.com',
    },
    {
      company: 'Abridge',
      place: 'San Francisco',
      sector: 'Digital Health',
      title: 'Abridge lève 90 M$ pour son copilote clinique',
      summary: 'Documentation médicale par IA, déjà déployée dans 40 hôpitaux américains ; Lightspeed en lead.',
      url: 'https://techcrunch.com',
    },
    {
      company: 'Temasek',
      place: 'Singapour',
      sector: 'MedTech',
      title: 'Temasek injecte 200 M$ dans la medtech de dépistage',
      summary: 'Le fonds souverain vise les dispositifs de dépistage à bas coût pour l’Asie du Sud-Est.',
      url: 'https://www.mobihealthnews.com',
    },
  ],

  word: {
    term: 'ADC',
    full: 'Antibody-Drug Conjugate',
    fr: 'Anticorps-médicament conjugué',
    field: 'Oncologie de précision',
    definition:
      'Un « missile guidé » anticancéreux : un anticorps qui reconnaît la cellule tumorale, relié à une charge toxique qu’il y délivre — en épargnant les tissus sains.',
    parts: [
      { label: 'Anticorps', role: 'le guidage' },
      { label: 'Linker', role: 'l’attache' },
      { label: 'Charge', role: 'l’ogive' },
    ],
    how: [
      { n: '1', h: 'Ciblage', t: 'L’anticorps circule dans le sang et se fixe sur un antigène (ex. HER2) surexprimé par la tumeur.' },
      { n: '2', h: 'Internalisation', t: 'Le complexe est absorbé à l’intérieur de la cellule cancéreuse.' },
      { n: '3', h: 'Libération', t: 'Le linker se rompt dans la cellule et libère la charge, qui la détruit de l’intérieur.' },
    ],
    why: 'Après des décennies de faux départs, les linkers de nouvelle génération ont rendu les ADC à la fois efficaces et tolérables. Résultat : la plus grosse vague de M&A oncologique de la décennie, et une course aux cibles au-delà d’HER2. L’un des terrains de chasse les plus actifs pour les fonds biotech.',
    startups: [
      { name: 'Adcytherix', place: 'France', use: 'Startup ADC française ; plus grosse Série A ADC d’Europe (105 M€, 2025), entrée en clinique visée en 2026.' },
      { name: 'Iksuda Therapeutics', place: 'Newcastle', use: 'Linkers stables (techno PermaLink) pour viser des cibles tumorales difficiles.' },
      { name: 'VALANX Biotech', place: 'Vienne', use: 'Plateforme de conjugaison GoldenSite ; ADC anti-LIV-1 pour le cancer du sein triple négatif.' },
      { name: 'Sidewinder', place: 'États-Unis', use: 'ADCs bispécifiques « de précision » ; 137 M$ levés (OrbiMed).' },
    ],
  },
};
