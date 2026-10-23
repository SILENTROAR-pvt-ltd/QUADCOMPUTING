// Fills the pilot venue's memory vault (the "Moments at …" arch cards at the foot of the menu) with six photos and
// captions. The vault only accepts photos stored in the venue's own gallery folder, so each Pexels photo (free licence)
// is copied into venue-vault/<venue>/gallery/ first, then added to menu_info.gallery after the host's own photos.
// usage (from the project root): node scripts/content/pilot-moments.mjs [--apply | --remove]
// Without a flag it only shows the vault as it is and checks the photos load. --remove takes out only what --apply added.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const mode = process.argv[2];
const projectDir = process.cwd();
const ledger = path.join(projectDir, 'scripts/content/pilot-moments-added.json');
const require = createRequire(path.join(projectDir, 'package.json'));
const { createClient } = require('@supabase/supabase-js');
const env = Object.fromEntries(fs.readFileSync(path.join(projectDir, '.env.local'), 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/)).filter(Boolean).map((m) => [m[1], m[2]]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const VENUE = '189664b2-99e7-4d45-ac50-ffb647ef97df';
const MAX = 12; // GALLERY_MAX in lib/services/menu-info/gallery.ts
const px = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1400`;
const MOMENTS = [
  { id: 12446438, caption: 'Bonfire nights, and stories that run long' },
  { id: 33104714, caption: 'Kulhad chai, the way the mountains like it' },
  { id: 2079452, caption: 'Our corner by the bookshelf' },
  { id: 5018990, caption: 'Long table, longer conversations' },
  { id: 9143544, caption: 'Acoustic evenings by the river' },
  { id: 7611700, caption: 'Snow outside, warmth inside' },
];

const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };
const readInfo = async () => {
  const raw = must(await db.from('businesses').select('menu_info').eq('id', VENUE).single(), 'venue').menu_info;
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
};
const writeGallery = async (info, gallery) => must(await db.from('businesses').update({ menu_info: { ...info, gallery } }).eq('id', VENUE).select('id'), 'save');

async function fetchPhoto(id) {
  const res = await fetch(px(id));
  const type = String(res.headers.get('content-type'));
  if (!res.ok || !type.startsWith('image/')) throw new Error(`Photo ${id} does not load (${res.status} ${type})`);
  return { bytes: Buffer.from(await res.arrayBuffer()), type };
}

if (mode === '--remove') {
  const added = JSON.parse(fs.readFileSync(ledger, 'utf8'));
  const info = await readInfo();
  const urls = new Set(added.map((a) => a.url));
  await writeGallery(info, (info.gallery || []).filter((p) => !urls.has(p.url)));
  must(await db.storage.from('venue-vault').remove(added.map((a) => a.path)), 'storage');
  fs.unlinkSync(ledger);
  console.log(`removed ${added.length} moments`);
} else {
  const info = await readInfo();
  const gallery = Array.isArray(info.gallery) ? info.gallery : [];
  console.log(`vault now: ${gallery.length} photo(s)${gallery.map((p) => `\n  ${p.caption || '(no caption)'}`).join('')}`);
  const room = MAX - gallery.length;
  if (room <= 0) throw new Error('The vault is full (12 photos); nothing added.');
  const todo = MOMENTS.slice(0, room);
  const photos = [];
  for (const m of todo) { const p = await fetchPhoto(m.id); photos.push(p); console.log(`ok ${m.id} ${Math.round(p.bytes.length / 1024)}KB`); }
  if (mode === '--apply') {
    const added = [];
    for (let i = 0; i < todo.length; i++) {
      const file = `${VENUE}/gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      must(await db.storage.from('venue-vault').upload(file, photos[i].bytes, { contentType: photos[i].type, upsert: false }), `upload ${todo[i].id}`);
      added.push({ path: file, url: db.storage.from('venue-vault').getPublicUrl(file).data.publicUrl, caption: todo[i].caption });
      fs.writeFileSync(ledger, JSON.stringify(added, null, 2));
    }
    await writeGallery(info, [...gallery, ...added.map(({ url, caption }) => ({ url, caption }))]);
    console.log(`added ${added.length} moments; the menu shows them within a minute`);
  }
}
