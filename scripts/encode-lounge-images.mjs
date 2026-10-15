#!/usr/bin/env node
// Turns the four lounge photographs (about 6 MB in all) into small WebP files for the Vibers Lobby. The originals are not kept
// in the repo; only these outputs are. Uses `sharp`, which Next.js already installs.
//
//   node scripts/encode-lounge-images.mjs <toast.jpg> <friends.jpg> <flatlay.jpg> <feast.jpg>
//
// Output: public/media/lounge/*.webp. Plain static files: nothing here touches the database.
import sharp from 'sharp';
import { mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const [TOAST, FRIENDS, FLATLAY, FEAST] = process.argv.slice(2);
if (!FEAST) { console.error('Usage: node scripts/encode-lounge-images.mjs <toast.jpg> <friends.jpg> <flatlay.jpg> <feast.jpg>'); process.exit(2); }
const OUT = join(process.cwd(), 'public', 'media', 'lounge');
mkdirSync(OUT, { recursive: true });

/** Crop a region given as fractions of the picture, then fit it to the size and save. */
async function make(file, name, region, width, height, quality = 72) {
  const meta = await sharp(file).rotate().metadata();
  const left = Math.round(region.x * meta.width), top = Math.round(region.y * meta.height);
  const w = Math.round(region.w * meta.width), h = Math.round(region.h * meta.height);
  const out = join(OUT, `${name}.webp`);
  await sharp(file).rotate().extract({ left, top, width: w, height: h })
    .resize(width, height, { fit: 'cover', kernel: 'lanczos3' })
    .webp({ quality, effort: 6, smartSubsample: true })
    .toFile(out);
  console.log(name.padEnd(22), `${width}x${height}`, `${(statSync(out).size / 1024).toFixed(1)} KB`);
}

// Hero: the friends at the cafe, 16:9, shown full width behind the headline.
await make(FRIENDS, 'lounge-hero-v1', { x: 0, y: 0, w: 1, h: 1 }, 960, 540, 70);
// Two prints, 4:5: the toast (cheers across the table) and guests photographing a paella.
await make(TOAST, 'lounge-toast-v1', { x: 0, y: 0.12, w: 1, h: 0.7035 }, 300, 375);
await make(FEAST, 'lounge-feast-v1', { x: 0, y: 0.12, w: 1, h: 0.8333 * 0.8 }, 300, 375);
// The flat lay, 4:3: used on the postage stamp, behind the empty photo slot, and on the empty wall.
await make(FLATLAY, 'lounge-flatlay-v1', { x: 0, y: 0, w: 1, h: 1 }, 640, 480, 70);
