#!/usr/bin/env node
// Builds the small web versions of the three Live Order Tracker clips. The originals (53 MB, 11 MB, 7 MB) are not kept in
// the repo; only these outputs are. Needs ffmpeg on the PATH (or FFMPEG=path).
//
//   node scripts/encode-tracker-media.mjs "<folder with the three source clips>"
//
// Outputs go to public/media/tracker/. Nothing here touches the database: the clips are plain static files served by the
// CDN, and the page fetches only the one it needs (see components/guest/menu/tracker/TrackerVideo.tsx).
import { spawnSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = process.argv[2];
if (!SRC) { console.error('Usage: node scripts/encode-tracker-media.mjs "<folder with the source clips>"'); process.exit(2); }
const OUT = join(process.cwd(), 'public', 'media', 'tracker');
mkdirSync(OUT, { recursive: true });
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

const BANNER_IN = join(SRC, 'vecteezy_a-chef-is-pouring-oil-into-a-pan-on-a-stove_57789713.mp4'); // 2560x1440, 23 s, a chef pouring oil
const PREP_IN = join(SRC, '376466.mov');   // 3D chef on a transparent background (ProRes 4444 + alpha)
const READY_IN = join(SRC, '215534.mp4');  // 3D chef holding a cupcake on white

function run(args) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  if (r.status !== 0) { console.error('ffmpeg failed:', args.join(' ')); process.exit(1); }
}
const size = (f) => `${(statSync(join(OUT, f)).size / 1024).toFixed(0)} KB`;

// Shared H.264 settings: plays everywhere (iOS included), streams from the first byte, no audio track.
const H264 = (crf) => ['-c:v', 'libx264', '-preset', 'slower', '-crf', String(crf), '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an'];

// 1. Banner: the dark kitchen. A wide band (2.4:1), 11 s cross-faded into itself so the loop has no visible jump.
run([
  '-i', BANNER_IN,
  '-filter_complex',
  '[0:v]crop=2560:1067:0:130,scale=1152:480:flags=lanczos,fps=24,split[a][b];' +
  '[a]trim=1:11,setpts=PTS-STARTPTS[main];[b]trim=0:1,setpts=PTS-STARTPTS[head];' +
  '[main][head]xfade=transition=fade:duration=1:offset=9,format=yuv420p[v]',
  '-map', '[v]', ...H264(28), join(OUT, 'kitchen-banner-v1.mp4'),
]);
run(['-ss', '4', '-i', BANNER_IN, '-vf', 'crop=2560:1067:0:130,scale=960:400', '-frames:v', '1', '-c:v', 'libwebp', '-quality', '55', join(OUT, 'kitchen-banner-v1.webp')]);

// 2. Chef "your order is being prepared": the transparent clip laid on white, cropped to the chef, on a 3:4 white stage.
run([
  '-f', 'lavfi', '-i', 'color=c=white:s=1920x1080:r=25', '-i', PREP_IN,
  '-filter_complex',
  '[0:v][1:v]overlay=format=auto:shortest=1,format=yuv420p,crop=620:1040:603:14,pad=780:1040:(ow-iw)/2:0:white,scale=360:480:flags=lanczos,fps=24[v]',
  '-map', '[v]', ...H264(22), join(OUT, 'chef-preparing-v1.mp4'),
]);
run([
  '-f', 'lavfi', '-i', 'color=c=white:s=1920x1080:r=25', '-ss', '1', '-i', PREP_IN,
  '-filter_complex', '[0:v][1:v]overlay=format=auto:shortest=1,format=yuv420p,crop=620:1040:603:14,pad=780:1040:(ow-iw)/2:0:white,scale=360:480:flags=lanczos[v]',
  '-map', '[v]', '-frames:v', '1', '-c:v', 'libwebp', '-quality', '70', join(OUT, 'chef-preparing-v1.webp'),
]);

// 3. Chef "your order is ready": cropped to the chef, same 3:4 white stage.
run([
  '-i', READY_IN,
  '-vf', 'crop=616:936:566:90,pad=702:936:(ow-iw)/2:0:white,scale=360:480:flags=lanczos,fps=24,format=yuv420p',
  ...H264(22), join(OUT, 'chef-ready-v1.mp4'),
]);
run(['-ss', '2.5', '-i', READY_IN, '-vf', 'crop=616:936:566:90,pad=702:936:(ow-iw)/2:0:white,scale=360:480:flags=lanczos', '-frames:v', '1', '-c:v', 'libwebp', '-quality', '70', join(OUT, 'chef-ready-v1.webp')]);

for (const f of ['kitchen-banner-v1.mp4', 'kitchen-banner-v1.webp', 'chef-preparing-v1.mp4', 'chef-preparing-v1.webp', 'chef-ready-v1.mp4', 'chef-ready-v1.webp']) console.log(f.padEnd(28), size(f));
