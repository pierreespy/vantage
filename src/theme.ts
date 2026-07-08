/**
 * Vantage design tokens — FT/Bloomberg palette, ported 1:1 from the
 * "Vantage App iOS" design (paper/ivory ground, ink text, pétrole accent).
 */

export const colors = {
  /** Warm ivory paper — the app background. */
  paper: '#F9EFE3',
  /** Near-black editorial ink. */
  ink: '#22201D',
  /** Pétrole — the brand accent ("CHRONICLE", kickers, deal amounts). */
  accent: '#0B4F6C',
  accentDark: '#08394e',
  /** Claret — rubric labels (Brèves · Europe, Anatomie…). */
  claret: '#8A2B2B',

  /** Canvas behind the phone frame (design page background). */
  canvas: '#d9ccb8',
  /** Physical phone frame. */
  frame: '#0d0d0f',

  /** Text greys, from darkest to lightest. */
  ink90: '#2a2620',
  ink80: '#3a352e',
  ink70: '#4a443c',
  ink60: '#6b6257',
  ink50: '#8a8378',
  ink40: '#a49b8c',

  /** Ticker / legend semantics. */
  levGreen: '#2E8B57', // levée (fundraise) — legend
  mnaAmber: '#B8862A', // M&A — legend + Linker anatomy
  tickerLev: '#5FB98C', // levée delta on ink chip
  tickerMna: '#E5B85C', // M&A delta on ink chip
  weatherAmber: '#C9982B',

  white: '#ffffff',
} as const;

/** Hairline / border helpers built on the ink hue (34,32,29). */
export const border = {
  faint: 'rgba(34,32,29,0.10)',
  light: 'rgba(34,32,29,0.12)',
  soft: 'rgba(34,32,29,0.14)',
  medium: 'rgba(34,32,29,0.16)',
  strong: 'rgba(34,32,29,0.18)',
  firm: 'rgba(34,32,29,0.22)',
  bold: 'rgba(34,32,29,0.25)',
  divider: 'rgba(34,32,29,0.3)',
  starIdle: 'rgba(34,32,29,0.28)',
} as const;

/** Frosted panel tints (tab bar, native headers). */
export const glass = {
  panel: 'rgba(249,239,227,0.9)',
  header: 'rgba(249,239,227,0.92)',
  scrim: 'rgba(24,22,20,0.42)',
  cardFill: 'rgba(255,255,255,0.4)',
} as const;
