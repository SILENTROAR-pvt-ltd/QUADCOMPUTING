// Quad Computing, the venue side of Vibers Connect: the same family as the home page (Cormorant display, champagne gold,
// warm paper, the same motion), with its own ink. Near-black "control room" sections carry the product; forest is kept for
// the guest side (Vibers Connect), so the two products read apart at a glance. Layout tokens come from vibers-brand.
export { CONTAINER, SECTION, KICKER, KICKER_LIGHT, H2, TURN, TURN_LIGHT, LEAD, LEAD_LIGHT, BTN_IVORY, BTN_GHOST_LIGHT, BTN_FOREST, BTN_GHOST } from '@/components/vibers/vibers-brand';

export const QC = {
  paper: '#f6f3ec',
  card: '#fbf9f4',
  line: '#e6dfcf',
  ink: '#0c0f0d',
  inkSoft: '#151916',
  forest: '#0f2a1e',
  gold: '#b08d57',
  goldDeep: '#8a6d3f',
  goldLight: '#d9c193',
} as const;

/** On paper: the venue's ink, then a quiet outline. */
export const BTN_INK = 'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#0c0f0d] px-7 text-[13px] font-semibold tracking-[0.04em] text-[#f6f3ec] transition-all duration-300 hover:bg-[#252a26] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0c0f0d]';

/** Rupees, Indian grouping, no paise. */
export const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** The small print under product footage, so nobody mistakes the demo café for a real one. */
export const DEMO_NOTE = 'Real product screens · sample café and data';
