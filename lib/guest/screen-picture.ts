'use client';

import { toBlob } from 'html-to-image';

/**
 * A card on screen (a bill, a booking code) as a PNG file, drawn straight to a Blob.
 *
 * Two things here matter on a phone:
 *  - It never fetches a `data:` URL to turn the picture into a file. The site's Content-Security-Policy does not list
 *    `data:` under connect-src, so that fetch was refused and every download and gallery save failed.
 *  - It skips web fonts. The library would otherwise download every Google font the page uses (also refused by the same
 *    policy, and slow); the cards drawn this way use the phone's own fonts, so nothing important in the picture changes.
 */
export async function screenPicture(node: HTMLElement): Promise<Blob> {
  const blob = await toBlob(node, { pixelRatio: 2, backgroundColor: '#ffffff', skipFonts: true });
  if (!blob) throw new Error('The picture came out empty.');
  return blob;
}

