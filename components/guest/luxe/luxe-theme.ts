import { Cormorant_Garamond } from 'next/font/google';

// The guest app dressed like the Vibers Connect home: warm ivory paper, deep forest ink, champagne gold used sparingly,
// and a high-contrast Garamond for names and headings. One variable font file per style (about 2 x 60 KB), so the
// menu stays light on a phone. Only looks live here: nothing in this file touches data or behaviour.
const display = Cormorant_Garamond({ subsets: ['latin'], weight: 'variable', style: ['normal', 'italic'], variable: '--font-luxe', display: 'swap' });

/** Put on a guest page's root so everything inside can use the serif as var(--font-luxe). */
export const LUXE_FONT_VAR = display.variable;

/** The serif for venue and dish names and headings (Playfair, already loaded, stands in until it arrives). */
export const LUXE_SERIF = { fontFamily: "var(--font-luxe), 'Playfair Display', Georgia, serif" } as const;

export const LUXE = {
  paper: '#f5f1e8',
  card: '#fbf9f4',
  line: '#e8dfcc',
  ink: '#10231a',
  forest: '#0f2a1e',
  forestSoft: '#173a2a',
  gold: '#b08d57',
  goldDeep: '#8a6d3f',
  goldLight: '#d9c193',
} as const;

/** Small capitals above a heading, in gold. */
export const LUXE_KICKER = 'text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8a6d3f]';
/** An ivory card with a warm hairline. */
export const LUXE_CARD = 'rounded-[22px] border border-[#e8dfcc] bg-[#fbf9f4] shadow-[0_18px_40px_-34px_rgba(16,35,26,0.45)]';
/** The forest button (primary on paper). */
export const LUXE_BTN = 'bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] text-[#f5f1e8] shadow-[0_10px_22px_-12px_rgba(15,42,30,0.75)] ring-1 ring-[#d9c193]/25';
