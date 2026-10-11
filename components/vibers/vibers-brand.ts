// Vibers Connect brand: bright and warm. Cream pages, deep violet ink, vivid violet actions, and one
// sunset-to-violet "aura" gradient for highlights. (Fonts live in vibers-fonts.ts.)
export const COLORS = {
  ivory: '#fff7f0',
  sand: '#f3ebff',
  ink: '#2a1250',
  night: '#4c1d95',
  coral: '#ff6a3d',
  rose: '#ff2e88',
  lilac: '#7c3aed',
  /** Pink dark enough for small text on cream. */
  coralText: '#be185d',
} as const;

/** The aura gradient, for highlighted words and art. */
export const AURA = 'bg-gradient-to-r from-[#ff6a3d] via-[#ff2e88] to-[#7c3aed]';
export const AURA_TEXT = `${AURA} bg-clip-text text-transparent`;

export const CONTAINER = 'mx-auto w-full max-w-6xl px-4 sm:px-6';
export const SECTION = 'relative scroll-mt-20 py-20 sm:py-28';
export const KICKER = 'text-[11px] font-bold uppercase tracking-[0.24em] text-[#be185d]';
export const LEAD = 'text-[15px] leading-relaxed text-[#2a1250]/70 sm:text-[17px]';

export const SITE = {
  name: 'Vibers Connect',
  company: 'Vibers Connect Pvt. Ltd.',
  url: 'https://www.vibersconnect.com',
  domain: 'www.vibersconnect.com',
  instagram: 'https://www.instagram.com/vibersconnectclub',
  handle: '@vibersconnectclub',
} as const;
