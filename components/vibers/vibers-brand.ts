// Vibers Connect, quiet luxury: warm ivory paper, deep forest ink, champagne gold used sparingly (hairlines, numerals,
// the script signature), and photography and film carrying the colour. No neon, no loud highlights.
// (Fonts live in vibers-fonts.ts; media in vibers-media.ts.)
export const COLORS = {
  paper: '#f5f1e8',
  paperDeep: '#ece5d6',
  ink: '#10231a',
  forest: '#0f2a1e',
  forestSoft: '#173a2a',
  gold: '#b08d57',
  goldLight: '#d9c193',
} as const;

export const CONTAINER = 'mx-auto w-full max-w-[1240px] px-4 sm:px-8';
export const SECTION = 'relative scroll-mt-20 py-20 sm:py-28';
/** Small capitals above a headline, with a gold hairline. */
export const KICKER = 'inline-flex items-center gap-3 text-[10.5px] font-semibold uppercase tracking-[0.34em] text-[#8a6d3f] before:h-px before:w-8 before:bg-[#b08d57]';
export const KICKER_LIGHT = 'inline-flex items-center gap-3 text-[10.5px] font-semibold uppercase tracking-[0.34em] text-[#d9c193] before:h-px before:w-8 before:bg-[#d9c193]';
/** Section headline, in the display face (add DISPLAY). */
export const H2 = 'mt-5 text-[2.25rem] font-light leading-[1.08] tracking-[-0.005em] sm:text-[2.9rem] lg:text-[3.3rem]';
/** The italic turn inside a headline. */
export const TURN = 'italic font-normal text-[#8a6d3f]';
export const TURN_LIGHT = 'italic font-normal text-[#d9c193]';
export const LEAD = 'text-[15.5px] leading-[1.85] text-[#10231a]/70 sm:text-[16px]';
export const LEAD_LIGHT = 'text-[15.5px] leading-[1.85] text-[#f5f1e8]/70 sm:text-[16px]';

const BTN = 'inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-[13px] font-semibold tracking-[0.04em] transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
/** On a photo or film: ivory, then a quiet outline. */
export const BTN_IVORY = `${BTN} bg-[#f5f1e8] text-[#10231a] hover:bg-white focus-visible:outline-[#f5f1e8]`;
export const BTN_GHOST_LIGHT = `${BTN} border border-[#f5f1e8]/45 text-[#f5f1e8] hover:border-[#f5f1e8] hover:bg-white/5 focus-visible:outline-[#f5f1e8]`;
/** On paper: forest, then a quiet outline. */
export const BTN_FOREST = `${BTN} bg-[#0f2a1e] text-[#f5f1e8] hover:bg-[#173a2a] focus-visible:outline-[#0f2a1e]`;
export const BTN_GHOST = `${BTN} border border-[#10231a]/25 text-[#10231a] hover:border-[#10231a] focus-visible:outline-[#0f2a1e]`;

export const SITE = {
  name: 'Vibers Connect',
  company: 'Vibers Connect Pvt. Ltd.',
  url: 'https://www.vibersconnect.com',
  domain: 'www.vibersconnect.com',
  instagram: 'https://www.instagram.com/vibersconnectclub',
  handle: '@vibersconnectclub',
} as const;
