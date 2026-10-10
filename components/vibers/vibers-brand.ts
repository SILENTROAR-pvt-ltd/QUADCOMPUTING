// Vibers Connect brand: warm ivory and deep ink, with one "sunset aura" gradient used sparingly.
export const COLORS = {
  ivory: '#f7f2ea',
  sand: '#efe6d8',
  ink: '#1c1714',
  night: '#1d1420',
  coral: '#ff7a59',
  rose: '#f0508a',
  lilac: '#8f7cf6',
  /** Coral dark enough for small text on ivory. */
  coralText: '#c2410c',
} as const;

/** The aura gradient, for highlighted words and art. */
export const AURA = 'bg-gradient-to-r from-[#ff7a59] via-[#f0508a] to-[#8f7cf6]';
export const AURA_TEXT = `${AURA} bg-clip-text text-transparent`;

export const CONTAINER = 'mx-auto w-full max-w-6xl px-4 sm:px-6';
export const SECTION = 'relative scroll-mt-20 py-20 sm:py-28';
export const KICKER = 'text-[11px] font-bold uppercase tracking-[0.24em] text-[#c2410c]';
export const LEAD = 'text-[15px] leading-relaxed text-[#1c1714]/70 sm:text-[17px]';

export const SITE = {
  name: 'Vibers Connect',
  company: 'Vibers Connect Pvt. Ltd.',
  url: 'https://www.vibersconnect.com',
  domain: 'www.vibersconnect.com',
  instagram: 'https://www.instagram.com/vibersconnectclub',
  handle: '@vibersconnectclub',
} as const;
