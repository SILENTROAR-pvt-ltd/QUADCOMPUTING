import { Fraunces, Manrope } from 'next/font/google';

// Vibers Connect type: a soft, expressive serif for headlines (italics carry the feeling),
// and a clean, friendly sans for reading.
const display = Fraunces({ subsets: ['latin'], style: ['normal', 'italic'], display: 'swap', axes: ['SOFT', 'opsz'] });
const body = Manrope({ subsets: ['latin'], display: 'swap' });

export const DISPLAY = display.className;
export const BODY = body.className;
