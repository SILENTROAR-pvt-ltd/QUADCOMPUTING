import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';

// Vibers Connect type, the same pair as Vibers Club: an editorial serif for headlines (italics for warmth), and a
// refined, very legible sans for everything people read and tap.
const display = Playfair_Display({ subsets: ['latin'], style: ['normal', 'italic'], display: 'swap' });
const body = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap' });

export const DISPLAY = display.className;
export const BODY = body.className;
