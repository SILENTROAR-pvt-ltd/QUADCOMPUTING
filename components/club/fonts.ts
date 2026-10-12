import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';

// Vibers Club type: an editorial serif for headlines (a travel-magazine feel, italics for warmth),
// and a refined, very legible sans for everything people read and tap.
const display = Playfair_Display({ subsets: ['latin'], style: ['normal', 'italic'], display: 'swap' });
const body = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap' });

export const CLUB_DISPLAY = display.className;
export const CLUB_BODY = body.className;
