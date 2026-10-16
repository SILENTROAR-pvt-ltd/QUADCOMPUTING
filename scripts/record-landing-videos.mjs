// Records the product in use for the landing pages: the guest menu (scrolling, adding dishes, the tray filling), the
// live order tracker, Dues on a phone, and the analytics dashboard. Each is a real screen at /showcase/<id> with a
// fictional café's data, driven by a short script and recorded from Edge's screencast with true frame timing, then
// encoded with ffmpeg to H.264 MP4 plus a WebP poster. lib/landing/videos.ts holds their sizes.
//
//   1. $env:QC_SHOWCASE='1'; npm run start      2. node scripts/record-landing-videos.mjs [http://localhost:3000]
//   3. Rebuild. Files under /media are cached for a year, so bump VERSION when a video changes.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { launchEdge } from './lib/edge-cdp.mjs';

const BASE = process.argv[2] || 'http://localhost:3000';
const VERSION = 'v1';
const OUT = join(process.cwd(), 'public', 'media', 'landing');

// Helpers available to every script: wait, an eased scroll, scroll-to-element, and a tap.
const HELPERS = `
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const glide = (to, ms) => new Promise((done) => {
    const el = document.scrollingElement, from = el.scrollTop, max = el.scrollHeight - innerHeight, end = Math.max(0, Math.min(max, to));
    const t0 = performance.now(), ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now) => { const t = Math.min(1, (now - t0) / ms); el.scrollTop = from + (end - from) * ease(t); t < 1 ? requestAnimationFrame(step) : done(); };
    requestAnimationFrame(step);
  });
  const bottom = () => document.scrollingElement.scrollHeight;
  const glideTo = (sel, ms) => { const e = document.querySelector(sel); return glide(e.getBoundingClientRect().top + scrollY - innerHeight * 0.42, ms); };
  const tap = (sel) => document.querySelector(sel)?.click();
`;

const PHONE = { width: 393, height: 728, scale: 2, out: 600 };
const VIDEOS = [
  { id: 'guest-menu', ...PHONE, alt: 'The guest menu in use: scrolling the dishes and adding them to the tray', script: `
    await wait(1000); await glideTo('[aria-label="Add Grilled Skewers"]', 1900); await wait(450);
    tap('[aria-label="Add Grilled Skewers"]'); await wait(1000);
    await glideTo('[aria-label="Add Big Breakfast Board"]', 1500); await wait(400);
    tap('[aria-label="Add Big Breakfast Board"]'); await wait(800);
    tap('[aria-label="One more Big Breakfast Board"]'); await wait(1100);
    await glide(bottom(), 1300); await wait(900); await glide(0, 2300); await wait(1200);` },
  { id: 'guest-tracker', ...PHONE, alt: 'The live order tracker moving from received to ready, then the bill and wallet', script: `
    window.__showcaseStep(0); await wait(1600); window.__showcaseStep(1); await wait(2400); window.__showcaseStep(2); await wait(1800);
    await glide(bottom(), 2200); await wait(1800); await glide(0, 1800); await wait(500); window.__showcaseStep(0); await wait(400);` },
  { id: 'dues-phone', ...PHONE, alt: 'Dues on a phone: You earn and We earn, the split, and how guests paid', script: `
    await wait(1300); await glide(bottom(), 3600); await wait(1500); await glide(0, 2600); await wait(1100);` },
  { id: 'overview', width: 1280, height: 760, scale: 1, out: 1280, alt: 'The analytics dashboard: totals, sales by hour, channels, categories and guests', script: `
    await wait(1300); await glide(bottom(), 4800); await wait(1600); await glide(0, 3200); await wait(900);` },
];

const edge = await launchEdge(9335);
try {
  mkdirSync(OUT, { recursive: true });
  const manifest = {};
  for (const v of VIDEOS) {
    const height = await edge.open(`${BASE}/showcase/${v.id}`, v.width, v.height, v.scale);
    if (!height) throw new Error(`${v.id}: nothing rendered (is QC_SHOWCASE=1 set on the server?)`);
    const dir = mkdtempSync(join(tmpdir(), `qc-rec-${v.id}-`));
    const frames = [];
    const off = edge.on('Page.screencastFrame', (p) => {
      const file = join(dir, `f${String(frames.length).padStart(5, '0')}.jpg`);
      writeFileSync(file, Buffer.from(p.data, 'base64'));
      frames.push({ file, t: p.metadata.timestamp });
      void edge.send('Page.screencastFrameAck', { sessionId: p.sessionId });
    });
    await edge.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: v.width * v.scale, maxHeight: v.height * v.scale, everyNthFrame: 1 });
    await edge.evaluate(`(async () => { ${HELPERS} ${v.script} })()`);
    const end = Date.now() / 1000;
    await edge.send('Page.stopScreencast');
    off();
    if (frames.length < 2) throw new Error(`${v.id}: the screencast sent ${frames.length} frames`);

    // A concat list gives each frame its real on-screen time, so holds stay holds and scrolls keep their pace.
    const list = frames.map((f, i) => `file '${f.file.replace(/\\/g, '/')}'\nduration ${(((frames[i + 1]?.t ?? end) - f.t)).toFixed(4)}`);
    writeFileSync(join(dir, 'list.txt'), `${list.join('\n')}\nfile '${frames[frames.length - 1].file.replace(/\\/g, '/')}'\n`);
    const mp4 = join(OUT, `${v.id}-${VERSION}.mp4`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(dir, 'list.txt'),
      '-vf', `fps=30,scale=${v.out}:-2:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '24',
      '-profile:v', 'high', '-movflags', '+faststart', '-an', mp4]);
    const poster = await sharp(frames[0].file).resize({ width: v.out }).webp({ quality: 82 }).toFile(join(OUT, `${v.id}-poster-${VERSION}.webp`));
    manifest[v.id] = { src: `/media/landing/${v.id}-${VERSION}.mp4`, poster: `/media/landing/${v.id}-poster-${VERSION}.webp`, width: poster.width, height: poster.height, alt: v.alt };
    console.log(`${v.id}: ${frames.length} frames, ${(frames[frames.length - 1].t - frames[0].t).toFixed(1)} s, ${poster.width}x${poster.height}`);
  }
  const ts = `// Written by scripts/record-landing-videos.mjs. Recordings of the product with a fictional café's data.\n`
    + `export const VIDEOS = ${JSON.stringify(manifest, null, 2)} as const;\n\nexport type VideoId = keyof typeof VIDEOS;\n`;
  writeFileSync(join(process.cwd(), 'lib', 'landing', 'videos.ts'), ts);
} finally {
  edge.close();
}
