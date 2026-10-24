// Records the product in use for the landing pages: the guest menu (scrolling, adding dishes, the tray filling), the
// live order tracker, Vibey filling a tray from one message, the lounge wall of memory postcards, Dues on a phone, the
// analytics dashboard, the POS taking a table's order, and the live kitchen board. Each is a real screen at /showcase/<id> with a fictional café's data, driven by a short
// script. Recording is frame-exact (scripts/lib/frame-clock.mjs): the page's clock moves 1/30 s between screenshots, so
// every frame is a real, distinct frame and scrolls are as smooth as the frame rate, however slowly Edge renders.
// Encoded with ffmpeg to H.264 MP4 plus a WebP poster; lib/landing/videos.ts holds their sizes.
//
//   1. $env:QC_SHOWCASE='1'; npm run start      2. node scripts/record-landing-videos.mjs [http://localhost:3000] [id ...]
//   3. Rebuild. Files under /media are cached for a year, so bump VERSION when a video changes. With ids, only those
//      are recorded and the rest of the manifest is kept.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { launchEdge } from './lib/edge-cdp.mjs';
import { FRAME_CLOCK } from './lib/frame-clock.mjs';

const [BASE = 'http://localhost:3000', ...ONLY] = process.argv.slice(2);
const VERSION = 'v3';
const FPS = 30;
const OUT = join(process.cwd(), 'public', 'media', 'landing');
const MANIFEST = join(process.cwd(), 'lib', 'landing', 'videos.ts');

// Helpers available to every script: wait, an eased scroll, scroll-to-element, a tap, a double tap and typing.
const HELPERS = `
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const glide = (to, ms) => new Promise((done) => {
    const el = document.scrollingElement, from = el.scrollTop, max = el.scrollHeight - innerHeight, end = Math.max(0, Math.min(max, to));
    const t0 = performance.now(), ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now) => { const t = Math.min(1, (now - t0) / ms); el.scrollTop = from + (end - from) * ease(t); t < 1 ? requestAnimationFrame(step) : done(); };
    requestAnimationFrame(step);
  });
  // The same eased scroll inside a scrolling box (a chat feed) instead of the page.
  const glideIn = (sel, to, ms) => new Promise((done) => {
    const el = document.querySelector(sel), from = el.scrollTop, end = Math.max(0, Math.min(el.scrollHeight - el.clientHeight, to));
    const t0 = performance.now(), ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now) => { const t = Math.min(1, (now - t0) / ms); el.scrollTop = from + (end - from) * ease(t); t < 1 ? requestAnimationFrame(step) : done(); };
    requestAnimationFrame(step);
  });
  const bottom = () => document.scrollingElement.scrollHeight;
  const glideTo = (sel, ms, at = 0.42) => { const e = document.querySelector(sel); return glide(e.getBoundingClientRect().top + scrollY - innerHeight * at, ms); };
  const tap = (sel) => document.querySelector(sel)?.click();
  // The first element matching sel whose text contains text (for buttons that carry no label of their own).
  const tapText = (sel, text) => [...document.querySelectorAll(sel)].find((e) => e.textContent.includes(text))?.click();
  const doubleTap = (sel) => document.querySelector(sel)?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  const type = async (sel, text, perChar = 45) => {
    const input = document.querySelector(sel);
    const set = Object.getOwnPropertyDescriptor(input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set;
    input.focus();
    for (let i = 1; i <= text.length; i += 1) { set.call(input, text.slice(0, i)); input.dispatchEvent(new Event('input', { bubbles: true })); await wait(perChar); }
  };
`;

const PHONE = { width: 393, height: 728, scale: 2, out: 600 };
const VIDEOS = [
  { id: 'guest-menu', ...PHONE, alt: 'The guest menu in use: the venue banner, top picks, category bars opening to dishes, and the tray filling', script: `
    await wait(1700); await glideTo('[aria-label="Top picks"]', 1300, 0.22); await wait(500);
    tap('[aria-label="Top picks"] [aria-label="Add Seafood Paella"]'); await wait(700);
    await glideTo('section[data-category="Coffee"]', 1100, 0.1); await wait(300);
    tap('section[data-category="Coffee"] [aria-label="Add Cappuccino"]'); await wait(450);
    tap('section[data-category="Coffee"] [aria-label="One more Cappuccino"]'); await wait(600);
    tap('section[data-category="Mains"] > button'); await wait(500);
    await glideTo('section[data-category="Mains"]', 1100, 0.12); await wait(300);
    tap('section[data-category="Mains"] [aria-label="Add Grilled Skewers"]'); await wait(900);
    await glideTo('#memory-vault-title', 1400, 0.18); await wait(1100); await glide(0, 1700); await wait(700);` },
  { id: 'guest-tracker', ...PHONE, alt: 'The live order tracker moving from received to ready, then the bill and wallet', script: `
    window.__showcaseStep(0); await wait(1000); window.__showcaseStep(1); await wait(1500); window.__showcaseStep(2); await wait(1200);
    await glide(bottom(), 1500); await wait(1200); await glide(0, 1200); await wait(300); window.__showcaseStep(0); await wait(300);` },
  { id: 'guest-vibey', ...PHONE, alt: 'Vibey, the ordering chat: one message fills the tray and suggests dishes to share', script: `
    await wait(900); await type('#vibey-input', '2 cappuccino and something to share'); await wait(300);
    tap('button[aria-label="Send"]'); await wait(2300);
    await glideIn('[role="dialog"] [aria-live="polite"]', 0, 700); await wait(1300);
    await glideIn('[role="dialog"] [aria-live="polite"]', 9999, 800); await wait(300);
    tap('[role="dialog"] [aria-label="Add Seafood Paella"]'); await wait(800);
    tap('[role="dialog"] [aria-label="One more Seafood Paella"]'); await wait(1500);` },
  { id: 'guest-lounge', ...PHONE, alt: 'The Vibers Lounge: memory postcards from guests, liked with a double tap', script: `
    await wait(700); await glideTo('article', 1300, 0.06); await wait(350);
    doubleTap('article [class*="aspect-[4/3]"]'); await wait(1100);
    await glideTo('article:nth-of-type(2)', 1300, 0.06); await wait(800);
    await glideTo('article:nth-of-type(3)', 1300, 0.06); await wait(800);
    await glide(0, 1500); await wait(500);` },
  { id: 'guest-events', ...PHONE, alt: 'A guest sees the venue’s live events, taps I’m Interested and asks for a place for two', script: `
    await wait(1300); await glideTo('main article', 1100, 0.12); await wait(700);
    tapText('main article button', 'Interested'); await wait(1100);
    tap('[role="dialog"] button[aria-label="More Women"]'); await wait(700);
    tapText('[role="dialog"] button', 'Request my place'); await wait(2600);
    tap('[role="dialog"] button[aria-label="Close"]'); await wait(1200);
    await glide(bottom(), 1300); await wait(800); await glide(0, 1100); await wait(500);` },
  { id: 'guest-offers', ...PHONE, alt: 'A guest opens a live offer on the menu, redeems it for a code, and the counter settles it', script: `
    await wait(1500); tapText('[aria-label="Live venue offers"] button', 'Happy hours'); await wait(1300);
    tapText('[role="dialog"] button', 'Redeem this offer'); await wait(6500); await wait(1500);` },
  { id: 'guest-book-service', ...PHONE, alt: 'A guest opens a venue service at the foot of the menu and requests it', script: `
    await wait(1200); await glideTo('#services-section', 1200, 0.08); await wait(900);
    tap('#services-section button[aria-label="Bonfire evening, request it"]'); await wait(1600);
    tapText('[role="dialog"] button', 'Request this'); await wait(3200); await glide(0, 1100); await wait(500);` },
  { id: 'dues-phone', ...PHONE, alt: 'Dues on a phone: You earn and We earn, the split, and how guests paid', script: `
    await wait(1100); await glide(bottom(), 3200); await wait(1200); await glide(0, 2300); await wait(900);` },
  { id: 'overview', width: 1280, height: 760, scale: 1, out: 1280, alt: 'The analytics dashboard: totals, sales by hour, channels, categories and guests', script: `
    await wait(1100); await glide(bottom(), 4400); await wait(1400); await glide(0, 3000); await wait(800);` },
  { id: 'pos-billing', width: 1280, height: 760, scale: 1, out: 1280, alt: 'The POS in use: picking table T-04, tapping dishes, searching the menu, and the receipt adding GST and cashback', script: `
    await wait(900); tapText('button', 'T-04'); await wait(800);
    tapText('[data-demo="catalog"] button', 'Cappuccino'); await wait(450);
    tapText('[data-demo="catalog"] button', 'Cappuccino'); await wait(450);
    tapText('[data-demo="catalog"] button', 'Avocado Toast'); await wait(600);
    await type('[data-demo="catalog"] input[placeholder="Search the menu"]', 'pan', 120); await wait(700);
    tapText('[data-demo="catalog"] button', 'Paneer Tikka'); await wait(600);
    tap('[data-demo="catalog"] [aria-label="Clear search"]'); await wait(500);
    tapText('[data-demo="catalog"] button', 'Tiramisu'); await wait(700);
    tap('[aria-label="One more Avocado Toast"]'); await wait(1000);
    await glide(bottom(), 1600); await wait(1200); await glide(0, 1400); await wait(700);` },
  { id: 'host-events', width: 1280, height: 760, scale: 1, out: 1280, alt: 'My Guests: publishing a live event, then the interested guest list filling up and a party confirmed', script: `
    await wait(1300); tapText('[role="tab"]', 'Live Events'); await wait(1800);
    tapText('button', 'New live event'); await wait(700);
    await type('input[placeholder^="e.g. Sunset"]', 'Sunset Acoustics & Cocktails', 50); await wait(250);
    await type('input[placeholder^="Free welcome"]', 'Free welcome drink, Reserved seating', 30); await wait(400);
    tapText('button[type="submit"]', 'Publish event'); await wait(500); await glide(0, 600); await wait(1500);
    tapText('[role="tab"]', 'Event Interested List'); await wait(1400);
    tap('[aria-label="My Guests"] ~ div button[aria-label="Refresh"]'); await wait(1500);
    tapText('button', 'Mark Confirmed'); await wait(1100);
    await glide(bottom(), 1500); await wait(900); await glide(0, 1200); await wait(500);` },
  { id: 'host-offers', width: 1280, height: 760, scale: 1, out: 1280, alt: 'Live offers: publishing a new offer, and guests’ redemption codes settled at the counter', script: `
    await wait(1200); tapText('button', 'Publish Offer'); await wait(800);
    await type('#offer-title', 'Live music Fridays: free dessert', 45); await wait(300);
    await type('#offer-description', 'With any two mains, 8 to 11 PM', 30); await wait(400);
    tapText('form button[type="submit"]', ''); await wait(1500);
    await glideTo('section[aria-label="Guest requests"]', 1300, 0.3); await wait(700);
    tapText('section[aria-label="Guest requests"] button', 'Settle'); await wait(1200);
    tapText('section[aria-label="Guest requests"] button', 'Settle'); await wait(1200);
    await glide(0, 1300); await wait(600);` },
  { id: 'host-services', width: 1280, height: 760, scale: 1, out: 1280, alt: 'Services and partners: guests’ service requests ringing in from the menu, handled one by one', script: `
    await wait(1800); tapText('button', 'Done'); await wait(1600);
    tapText('button', 'Done'); await wait(2200);
    tapText('button', 'Done'); await wait(1800);
    tapText('button', 'Done'); await wait(2000);` },
  { id: 'kitchen-board', width: 1280, height: 760, scale: 1, out: 1280, alt: 'The live kitchen board: a ticket started, a dish ticked off, a ticket marked ready, and a new order arriving', script: `
    await wait(1000); tapText('article[aria-label^="Ticket 142"] button', 'Start preparing'); await wait(1200);
    tap('article[aria-label^="Ticket 141"] [aria-label="1 Paneer Tikka"]'); await wait(900);
    tapText('article[aria-label^="Ticket 141"] button', 'Mark ready'); await wait(1300);
    window.__showcaseStep(1); await wait(1600);
    tap('article[aria-label^="Ticket 142"] [aria-label="1 Avocado Toast"]'); await wait(900);
    tapText('article[aria-label^="Ticket 143"] button', 'Start preparing'); await wait(1600);
    await glide(bottom(), 1300); await wait(900); await glide(0, 1100); await wait(600);` },
];

/** The manifest written last time, so recording a few ids keeps the others. */
function readManifest() {
  try { return JSON.parse(readFileSync(MANIFEST, 'utf8').match(/export const VIDEOS = (\{[\s\S]*?\n\}) as const;/)[1]); } catch { return {}; }
}

const edge = await launchEdge(9335);
try {
  mkdirSync(OUT, { recursive: true });
  await edge.send('Page.addScriptToEvaluateOnNewDocument', { source: FRAME_CLOCK });
  const manifest = readManifest();
  for (const v of VIDEOS.filter((x) => !ONLY.length || ONLY.includes(x.id))) {
    const height = await edge.open(`${BASE}/showcase/${v.id}`, v.width, v.height, v.scale);
    if (!height) throw new Error(`${v.id}: nothing rendered (is QC_SHOWCASE=1 set on the server?)`);
    // Every photo fetched and decoded first, so none pops in mid-recording; then the page's clock is handed over.
    await edge.evaluate(`Promise.all([...document.images].map((i) => { i.loading = 'eager'; return i.decode().catch(() => null); }))`);
    // The dev server's corner badge (Next.js dev tools) is not part of the product.
    await edge.evaluate(`document.head.insertAdjacentHTML('beforeend', '<style>nextjs-portal{display:none!important}</style>')`);
    await edge.evaluate('window.__clock.manual()');
    // Started, not awaited: its waits only pass as the loop below steps the clock.
    await edge.evaluate(`window.__recDone = false; void (async () => { ${HELPERS} ${v.script} })().catch((e) => console.error(e)).finally(() => { window.__recDone = true; }); 0`);

    const dir = mkdtempSync(join(tmpdir(), `qc-rec-${v.id}-`));
    let n = 0;
    for (let done = false, guard = 0; !done && guard < FPS * 40; guard += 1) {
      done = await edge.evaluate(`window.__clock.step(${1000 / FPS})`);
      const { data } = await edge.send('Page.captureScreenshot', { format: 'jpeg', quality: 92 });
      writeFileSync(join(dir, `f${String(n).padStart(5, '0')}.jpg`), Buffer.from(data, 'base64'));
      n += 1;
    }

    const mp4 = join(OUT, `${v.id}-${VERSION}.mp4`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(dir, 'f%05d.jpg'),
      '-vf', `scale=${v.out}:-2:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '23',
      '-profile:v', 'high', '-g', String(FPS * 2), '-movflags', '+faststart', '-an', mp4]);
    const poster = await sharp(join(dir, 'f00000.jpg')).resize({ width: v.out }).webp({ quality: 82 }).toFile(join(OUT, `${v.id}-poster-${VERSION}.webp`));
    manifest[v.id] = { src: `/media/landing/${v.id}-${VERSION}.mp4`, poster: `/media/landing/${v.id}-poster-${VERSION}.webp`, width: poster.width, height: poster.height, alt: v.alt };
    console.log(`${v.id}: ${n} frames, ${(n / FPS).toFixed(1)} s, ${poster.width}x${poster.height}`);
  }
  const ts = `// Written by scripts/record-landing-videos.mjs. Recordings of the product with a fictional café's data.\n`
    + `export const VIDEOS = ${JSON.stringify(manifest, null, 2)} as const;\n\nexport type VideoId = keyof typeof VIDEOS;\n`;
  writeFileSync(MANIFEST, ts);
} finally {
  edge.close();
}
