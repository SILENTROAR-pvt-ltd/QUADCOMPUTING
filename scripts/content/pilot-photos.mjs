// Sets professional photos on the pilot venue's room, events and services (Pexels, free licence, hotlinked).
// usage (from the project root): node scripts/content/pilot-photos.mjs [--apply | --restore]
// Without a flag it only reads the current values and checks the new photos load. Every write is scoped to the venue.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const mode = process.argv[2];
const projectDir = process.cwd();
const backupFile = path.join(projectDir, 'scripts/content/pilot-photos-backup.json');
const require = createRequire(path.join(projectDir, 'package.json'));
const { createClient } = require('@supabase/supabase-js');
const env = Object.fromEntries(fs.readFileSync(path.join(projectDir, '.env.local'), 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/)).filter(Boolean).map((m) => [m[1], m[2]]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const VENUE = '189664b2-99e7-4d45-ac50-ffb647ef97df';
const px = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200`;
const PLAN = {
  roomCategory: { id: 'f9f22adf-3c44-459a-847b-4e86045770a9', photos: [28347470, 28347473, 28347480, 30835932].map(px) },
  catalog: [
    { id: '368b95be-dade-449f-af60-112cf0b3b1ef', image_url: px(28347470) }, // MOUNT VIEW (room)
    { id: 'c857b3ee-b897-40df-b454-b6febb9cdcbc', image_url: px(13719340) }, // Bicycle / Mountain Bike Rental
    { id: 'b13ed9c3-616c-4c86-938f-f99966a7d08f', image_url: px(35601221) }, // Guided Nature Trek & Sightseeing
    { id: '1f759ae8-74d4-4784-be93-facb73d55820', image_url: px(14754223) }, // Scooter / Activa Daily Rental
  ],
  events: [
    { id: '869d23d5-978f-4800-8d3d-0ce72e1006a5', banner_url: px(958547) },   // Monday special buffet
    { id: 'a8ddd9ad-5c7b-4705-a0c0-956519749cfb', banner_url: px(36388477) }, // Sunday special buffet
  ],
};

const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };

async function readCurrent() {
  const room = must(await db.from('room_categories').select('id, name, business_id, photos').eq('id', PLAN.roomCategory.id).eq('business_id', VENUE).maybeSingle(), 'room');
  const items = must(await db.from('catalog_items').select('id, name, business_id, location_id, image_url').in('id', PLAN.catalog.map((c) => c.id)), 'catalog');
  const events = must(await db.from('venue_live_events').select('id, title, business_id, banner_url').in('id', PLAN.events.map((e) => e.id)).eq('business_id', VENUE), 'events');
  const mine = items.filter((i) => i.business_id === VENUE || i.location_id === VENUE);
  if (!room || mine.length !== PLAN.catalog.length || events.length !== PLAN.events.length) throw new Error('A row is missing or belongs to another venue; nothing changed.');
  return { at: new Date().toISOString(), room, items: mine, events };
}

async function checkPhotos() {
  const urls = [...PLAN.roomCategory.photos, ...PLAN.catalog.map((c) => c.image_url), ...PLAN.events.map((e) => e.banner_url)];
  for (const u of new Set(urls)) {
    const res = await fetch(u, { method: 'GET' });
    const kb = Math.round((await res.arrayBuffer()).byteLength / 1024);
    console.log(`${res.status} ${res.headers.get('content-type')} ${kb}KB ${u.match(/photos\/(\d+)/)[1]}`);
    if (!res.ok || !String(res.headers.get('content-type')).startsWith('image/')) throw new Error(`Photo does not load: ${u}`);
  }
}

if (mode === '--restore') {
  const b = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  must(await db.from('room_categories').update({ photos: b.room.photos }).eq('id', b.room.id).eq('business_id', VENUE).select('id'), 'restore room');
  for (const i of b.items) must(await db.from('catalog_items').update({ image_url: i.image_url }).eq('id', i.id).select('id'), 'restore item');
  for (const e of b.events) must(await db.from('venue_live_events').update({ banner_url: e.banner_url }).eq('id', e.id).eq('business_id', VENUE).select('id'), 'restore event');
  console.log('restored from', backupFile);
} else {
  const current = await readCurrent();
  console.log('current:', JSON.stringify({ room: [current.room.name, current.room.photos], items: current.items.map((i) => [i.name, i.image_url]), events: current.events.map((e) => [e.title, e.banner_url]) }, null, 1));
  await checkPhotos();
  if (mode === '--apply') {
    if (!fs.existsSync(backupFile)) fs.writeFileSync(backupFile, JSON.stringify(current, null, 2));
    const r = must(await db.from('room_categories').update({ photos: PLAN.roomCategory.photos }).eq('id', PLAN.roomCategory.id).eq('business_id', VENUE).select('id'), 'room');
    let n = r.length;
    for (const c of PLAN.catalog) n += must(await db.from('catalog_items').update({ image_url: c.image_url }).eq('id', c.id).or(`business_id.eq.${VENUE},location_id.eq.${VENUE}`).select('id'), c.id).length;
    for (const e of PLAN.events) n += must(await db.from('venue_live_events').update({ banner_url: e.banner_url }).eq('id', e.id).eq('business_id', VENUE).select('id'), e.id).length;
    console.log(`updated ${n} rows; backup at ${backupFile}`);
  }
}
