// Builds public/menu-stickers: the food stickers on the guest menu's category chips. They are Microsoft's Fluent 3D
// emoji (MIT, via the @lobehub/fluent-emoji-3d package), resized to 128 px WebP so each is a couple of kilobytes.
// Only the stickers lib/guest/menu-stickers.ts can show are copied; the package itself is not a dependency.
//
// Re-run after adding a sticker to lib/guest/menu-stickers.ts:
//   npm install --prefix <scratch-folder> @lobehub/fluent-emoji-3d@1.1.0 --ignore-scripts
//   node scripts/build-menu-stickers.mjs <scratch-folder>/node_modules/@lobehub/fluent-emoji-3d/assets
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = process.argv[2];
if (!assets) {
  console.error('Usage: node scripts/build-menu-stickers.mjs <path to @lobehub/fluent-emoji-3d/assets>');
  process.exit(1);
}

const source = readFileSync(join(root, 'lib', 'guest', 'menu-stickers.ts'), 'utf8');
const codes = [...new Set([...source.matchAll(/'([0-9a-f]{4,5}(?:-fe0f)?)'/g)].map((m) => m[1]))];
const out = join(root, 'public', 'menu-stickers');
mkdirSync(out, { recursive: true });

let bytes = 0;
for (const code of codes) {
  const buffer = await sharp(join(assets, `${code}.webp`)).resize(128, 128, { fit: 'contain' }).webp({ quality: 82, alphaQuality: 90 }).toBuffer();
  writeFileSync(join(out, `${code}.webp`), buffer);
  bytes += buffer.length;
}
writeFileSync(join(out, 'NOTICE.md'), [
  '# Menu stickers',
  '',
  'Fluent Emoji 3D by Microsoft Corporation, via @lobehub/fluent-emoji-3d. Resized for the guest menu.',
  '',
  'MIT License. Copyright (c) Microsoft Corporation.',
  '',
  'Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated',
  'documentation files (the "Software"), to deal in the Software without restriction, including without limitation the',
  'rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit',
  'persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and',
  'this permission notice shall be included in all copies or substantial portions of the Software.',
  '',
  'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.',
  '',
].join('\n'));
console.log(`Wrote ${codes.length} stickers (${(bytes / 1024).toFixed(1)} KB) to public/menu-stickers`);
