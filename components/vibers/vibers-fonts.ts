import { Cormorant_Garamond, Pinyon_Script, Plus_Jakarta_Sans } from 'next/font/google';

// Vibers Connect type, set like a private club's: a high-contrast Garamond for the wordmark and headlines (italics carry
// the warmth), a hand script used once or twice as a signature ("Connect", "Welcome to"), and a quiet, very legible sans
// for everything people read and tap.
const display = Cormorant_Garamond({ subsets: ['latin'], weight: ['300', '400', '500', '600'], style: ['normal', 'italic'], display: 'swap' });
const script = Pinyon_Script({ subsets: ['latin'], weight: '400', display: 'swap' });
const body = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap' });

export const DISPLAY = display.className;
export const SCRIPT = script.className;
export const BODY = body.className;
