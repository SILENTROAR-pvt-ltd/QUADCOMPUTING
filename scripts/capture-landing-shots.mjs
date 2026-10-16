// Photographs the desktop product screens at /showcase/<id> (the real components with a fictional café's data) for the
// landing pages, and writes them to public/images/landing/screens as WebP, with lib/landing/screenshots.ts holding sizes.
// The phone screens are videos: see scripts/record-landing-videos.mjs.
//
//   1. Start the app with the showcase on:  $env:QC_SHOWCASE='1'; npm run start
//   2. node scripts/capture-landing-shots.mjs [http://localhost:3000]
//   3. Rebuild (the sizes are compiled into the pages).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { launchEdge } from './lib/edge-cdp.mjs';

const BASE = process.argv[2] || 'http://localhost:3000';
const OUT = join(process.cwd(), 'public', 'images', 'landing', 'screens');

/** Screen id, the viewport width it is drawn at, and the width the saved image is scaled to. */
const SHOTS = [
  { id: 'overview', width: 1280, out: 1600, alt: 'Analytics: total sales, bills, net profit, GST, sales by hour, channels, categories and connected guests' },
  { id: 'dues', width: 1280, out: 1600, alt: 'Dues: You earn and We earn, with daily bars and how guests paid' },
  { id: 'pnl', width: 760, out: 1100, alt: 'Profit and loss: revenue, cost of goods, every expense and net profit' },
  { id: 'items-stock', width: 1100, out: 1400, alt: 'Top-selling dishes and the stock control panel' },
  { id: 'slip', width: 900, out: 1200, alt: 'A daily due slip, 10 AM to 10 PM, with each bill and its fee' },
  { id: 'delivery', width: 1100, out: 1400, alt: 'Delivery orders with address, payment and the next step' },
  { id: 'vendors', width: 1100, out: 1400, alt: 'Vendors with their QR codes and one-tap WhatsApp' },
];

const edge = await launchEdge();
try {
  mkdirSync(OUT, { recursive: true });
  const manifest = {};
  for (const shot of SHOTS) {
    const height = await edge.open(`${BASE}/showcase/${shot.id}`, shot.width, 900, 2);
    if (!height) throw new Error(`${shot.id}: nothing rendered (is QC_SHOWCASE=1 set on the server?)`);
    const { data } = await edge.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: shot.width, height, scale: 1 } });
    const info = await sharp(Buffer.from(data, 'base64')).resize({ width: shot.out }).webp({ quality: 84 }).toFile(join(OUT, `${shot.id}.webp`));
    manifest[shot.id] = { src: `/images/landing/screens/${shot.id}.webp`, width: info.width, height: info.height, alt: shot.alt };
    console.log(`${shot.id}: ${info.width}x${info.height}, ${Math.round(info.size / 1024)} KB`);
  }
  const ts = `// Written by scripts/capture-landing-shots.mjs. Product screenshots with a fictional café's data.\n`
    + `export const SCREENSHOTS = ${JSON.stringify(manifest, null, 2)} as const;\n\nexport type ScreenshotId = keyof typeof SCREENSHOTS;\n`;
  writeFileSync(join(process.cwd(), 'lib', 'landing', 'screenshots.ts'), ts);
} finally {
  edge.close();
}
