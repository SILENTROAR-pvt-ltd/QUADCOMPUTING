// Makes Vibey's avatar files from a source image: a centred square crop, compressed to small WebP files for the chat.
// Run: node scripts/vibey/make-logo.mjs "<path to source image>"
// Writes public/vibey/vibey-96.webp (avatars up to 48 px) and public/vibey/vibey-192.webp (the welcome mascot).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const src = process.argv[2];
if (!src || !fs.existsSync(src)) { console.error('Give the source image path as the first argument.'); process.exit(1); }

const out = path.join(process.cwd(), 'public', 'vibey');
fs.mkdirSync(out, { recursive: true });

const meta = await sharp(src).metadata();
const side = Math.min(meta.width, meta.height);
const crop = Math.round(side * 0.9);
const region = { left: Math.round((meta.width - crop) / 2), top: Math.round((meta.height - crop) / 2), width: crop, height: crop };

for (const size of [96, 192]) {
  const file = path.join(out, `vibey-${size}.webp`);
  await sharp(src).extract(region).resize(size, size, { kernel: 'lanczos3' }).flatten({ background: '#ffffff' })
    .webp({ quality: 82, effort: 6 }).toFile(file);
  console.log(`${path.relative(process.cwd(), file)}  ${fs.statSync(file).size} bytes`);
}
console.log(`source ${meta.width}x${meta.height} ${meta.format}, alpha=${meta.hasAlpha}, ${fs.statSync(src).size} bytes`);
