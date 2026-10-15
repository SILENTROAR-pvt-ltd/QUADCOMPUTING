#!/usr/bin/env node
// Turns the three chef pictures (flat pink / white backgrounds, 34 to 245 KB each) into small transparent stickers for the
// "Pick dishes / Send to kitchen / Track & pay" cards. The originals are not kept in the repo; only these outputs are.
//
//   node scripts/encode-chef-stickers.mjs "<folder with the three pictures>"
//
// Output: public/media/stickers/*.webp (192x192, a few KB each). Uses `sharp`, which Next.js already installs.
//
// How the background goes: starting from the picture's edge, every pixel close to the background colour is made
// transparent, and the fill stops at the drawn outline. So the white of a uniform or a hat inside the outline is kept,
// unlike a "remove white" filter, which would punch holes in it.
import sharp from 'sharp';
import { mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = process.argv[2];
if (!SRC) { console.error('Usage: node scripts/encode-chef-stickers.mjs "<folder with the pictures>"'); process.exit(2); }
const OUT = join(process.cwd(), 'public', 'media', 'stickers');
mkdirSync(OUT, { recursive: true });

const PICTURES = [
  { name: 'chef-pick-v1', file: 'cute-chef-girl-smiling-in-uniform-welcoming-and-inviting-his-guests-cartoon-art-vector.jpg', tolerance: 20 },
  { name: 'chef-send-v1', file: 'cute-chef-cooking-restaurant-logo-cartoon-character-art-illustration-vector.jpg', tolerance: 22 },
  { name: 'chef-track-v1', file: '96f0c95cfa8aeae7c47159ed4ca58907.jpg', tolerance: 22 },
];

const WORK_HEIGHT = 720;   // work at this size: fast, and plenty for a 192 px sticker
const EDGE_PULL = 2;       // pixels of the old background colour shaved off the edge, so no halo is left
const SIZE = 192;          // output square
const PAD = 8;             // breathing room inside it

async function cutOut({ file, tolerance }) {
  const { data, info } = await sharp(join(SRC, file)).resize({ height: WORK_HEIGHT }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const at = (x, y) => (y * w + x) * 3;
  const bg = [at(1, 1), at(w - 2, 1), at(1, h - 2), at(w - 2, h - 2)].map((i) => [data[i], data[i + 1], data[i + 2]]);
  const ref = [0, 1, 2].map((c) => Math.round(bg.reduce((s, p) => s + p[c], 0) / bg.length));
  const near = (i) => Math.hypot(data[i] - ref[0], data[i + 1] - ref[1], data[i + 2] - ref[2]) <= tolerance;

  // Fill in from the whole edge of the picture.
  const clear = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0, tail = 0;
  const push = (x, y) => {
    const p = y * w + x;
    if (clear[p] || !near(p * 3)) return;
    clear[p] = 1;
    queue[tail++] = p;
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (head < tail) {
    const p = queue[head++];
    const x = p % w, y = (p / w) | 0;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }

  // Shave the edge: grow the cleared area a little, so the fringe of the old background goes with it.
  let grown = clear;
  for (let n = 0; n < EDGE_PULL; n++) {
    const next = Uint8Array.from(grown);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      if (!grown[p] && (grown[p - 1] || grown[p + 1] || grown[p - w] || grown[p + w])) next[p] = 1;
    }
    grown = next;
  }

  // Soft edge: blur the opacity a touch so the outline is smooth, not stair-stepped.
  const opacity = Buffer.alloc(w * h);
  for (let p = 0; p < w * h; p++) opacity[p] = grown[p] ? 0 : 255;
  // sharp may hand the grey map back with more than one channel: read the first channel of however many it returns.
  const blurred = await sharp(opacity, { raw: { width: w, height: h, channels: 1 } }).blur(0.8).raw().toBuffer({ resolveWithObject: true });
  const stride = blurred.info.channels;
  const soft = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) soft[p] = blurred.data[p * stride];

  const rgba = Buffer.alloc(w * h * 4);
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let p = 0; p < w * h; p++) {
    rgba[p * 4] = data[p * 3]; rgba[p * 4 + 1] = data[p * 3 + 1]; rgba[p * 4 + 2] = data[p * 3 + 2]; rgba[p * 4 + 3] = soft[p];
    if (soft[p] > 24) {
      const x = p % w, y = (p / w) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  return { rgba, w, h, box: { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 } };
}

for (const picture of PICTURES) {
  const { rgba, w, h, box } = await cutOut(picture);
  const inner = SIZE - PAD * 2;
  const clear = { r: 0, g: 0, b: 0, alpha: 0 };
  const out = join(OUT, `${picture.name}.webp`);
  await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .extract(box)
    .resize({ width: inner, height: inner, fit: 'contain', background: clear })
    .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: clear })
    .webp({ quality: 82, alphaQuality: 92, effort: 6 })
    .toFile(out);
  console.log(picture.name.padEnd(16), `${(statSync(out).size / 1024).toFixed(1)} KB`);
}
