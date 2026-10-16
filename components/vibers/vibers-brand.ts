// Vibers Connect brand, aligned with Vibers Club: soft luxury. Warm ivory pages, white cards, deep forest-green ink and
// actions, a chartreuse highlight for the moments that matter, and mint for quiet panels. Photos carry the colour.
// (Fonts live in vibers-fonts.ts.)
export const COLORS = {
  ivory: '#f1efe6',
  card: '#fbfaf6',
  mint: '#e1efe3',
  ink: '#14261b',
  forest: '#17301f',
  forestHover: '#22432c',
  chartreuse: '#c8da4a',
  olive: '#3c6b2b',
} as const;

/** The main action: forest green with ivory text. */
export const PRIMARY = 'bg-[#17301f] text-[#f6f4ec] hover:bg-[#22432c]';
/** The celebratory action: chartreuse with forest text. */
export const HIGHLIGHT = 'bg-[#c8da4a] text-[#14261b] hover:bg-[#bccf3b]';
/** A white card on the ivory page. */
export const SURFACE = 'rounded-[28px] border border-[#14261b]/[0.06] bg-[#fbfaf6] shadow-[0_18px_40px_-30px_rgba(20,38,27,0.45)]';
/** The italic accent word inside a headline. */
export const ACCENT = 'font-normal italic text-[#3c6b2b]';
/** A chartreuse highlighter stroke under a word. */
export const MARK = 'bg-[linear-gradient(transparent_64%,#c8da4a_64%,#c8da4a_92%,transparent_92%)] px-1';

export const CONTAINER ='mx-auto w-full max-w-6xl px-4 sm:px-6';
export const SECTION = 'relative scroll-mt-20 py-20 sm:py-28';
export const KICKER = 'text-[11px] font-bold uppercase tracking-[0.24em] text-[#3c6b2b]';
export const LEAD = 'text-[15px] leading-relaxed text-[#14261b]/70 sm:text-[17px]';
export const H2 = 'mt-4 text-[2.4rem] leading-[1.04] tracking-[-0.02em] text-[#14261b] sm:text-[3.4rem]';
export const BTN = 'inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17301f]';

export const SITE = {
  name: 'Vibers Connect',
  company: 'Vibers Connect Pvt. Ltd.',
  url: 'https://www.vibersconnect.com',
  domain: 'www.vibersconnect.com',
  instagram: 'https://www.instagram.com/vibersconnectclub',
  handle: '@vibersconnectclub',
} as const;
