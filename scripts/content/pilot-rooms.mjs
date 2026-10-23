// Adds three room types to the pilot venue, for checking the menu and stay pages with more than one room (photos from
// Pexels, free licence, hotlinked). Each type gets its rooms and its catalogue entry, the same rows the host's "add room
// category" makes, without the per-room platform fee.
// usage (from the project root): node scripts/content/pilot-rooms.mjs [--apply | --remove]
// Without a flag it only lists what exists and checks the photos load. --remove deletes only what --apply made, and
// refuses while any of those rooms is not vacant.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const mode = process.argv[2];
const projectDir = process.cwd();
const ledger = path.join(projectDir, 'scripts/content/pilot-rooms-created.json');
const require = createRequire(path.join(projectDir, 'package.json'));
const { createClient } = require('@supabase/supabase-js');
const env = Object.fromEntries(fs.readFileSync(path.join(projectDir, '.env.local'), 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/)).filter(Boolean).map((m) => [m[1], m[2]]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const VENUE = '189664b2-99e7-4d45-ac50-ffb647ef97df';
const px = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200`;
const TYPES = [
  { name: 'Deodar Suite', price: 6500, occupancy: 3, rooms: ['DS-1'], photos: [34053439, 26859068, 19068961, 32560943].map(px),
    amenities: ['Fireplace', 'Soaking tub', 'Mountain-view balcony', 'King bed', 'High-Speed Wi-Fi', 'Room heater'],
    description: 'Our finest room: a fireplace, a soaking tub and the whole valley from the balcony.' },
  { name: 'Cedar Cabin', price: 4200, occupancy: 3, rooms: ['CC-1', 'CC-2'], photos: [30070550, 30070551, 5439495, 7746945].map(px),
    amenities: ['All-wood interiors', 'Private sit-out', 'Garden view', 'Queen bed', 'High-Speed Wi-Fi', 'Bonfire on request'],
    description: 'A warm wooden cabin with its own sit-out, for slow mornings and long evenings.' },
  { name: 'Valley View Deluxe', price: 2600, occupancy: 2, rooms: ['VD-1', 'VD-2'], photos: [37910480, 30722813, 30769149].map(px),
    amenities: ['Valley view', 'Queen bed', 'Rain shower', 'High-Speed Wi-Fi', 'Tea & coffee tray'],
    description: 'Bright and calm, with the hills framed in a wide window.' },
];

const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };

async function checkPhotos() {
  for (const u of new Set(TYPES.flatMap((t) => t.photos))) {
    const res = await fetch(u);
    const kb = Math.round((await res.arrayBuffer()).byteLength / 1024);
    console.log(`${res.status} ${res.headers.get('content-type')} ${kb}KB ${u.match(/photos\/(\d+)/)[1]}`);
    if (!res.ok || !String(res.headers.get('content-type')).startsWith('image/')) throw new Error(`Photo does not load: ${u}`);
  }
}

async function apply() {
  const existing = must(await db.from('room_categories').select('id, name').eq('business_id', VENUE), 'categories');
  const loc = must(await db.from('locations').select('id').eq('business_id', VENUE).order('created_at', { ascending: false }).limit(1).maybeSingle(), 'location');
  const made = fs.existsSync(ledger) ? JSON.parse(fs.readFileSync(ledger, 'utf8')) : [];
  for (const t of TYPES) {
    if (existing.some((c) => c.name.toLowerCase() === t.name.toLowerCase())) { console.log(`skip ${t.name}: already there`); continue; }
    const cat = must(await db.from('room_categories').insert({ business_id: VENUE, name: t.name, price: t.price, occupancy: t.occupancy,
      total_units: t.rooms.length, photos: t.photos, amenities: t.amenities, addons: [], available_addons: [] }).select('id').single(), t.name);
    const item = must(await db.from('catalog_items').insert({ business_id: VENUE, location_id: loc?.id ?? null, item_type: 'room', name: t.name,
      price: t.price, category: 'Accommodations', image_url: t.photos[0], is_available: true, description: t.description,
      metadata: { capacity: t.occupancy, amenities: t.amenities, category_id: cat.id } }).select('id').single(), `${t.name} catalogue`);
    must(await db.from('room_categories').update({ catalog_item_id: item.id }).eq('id', cat.id).eq('business_id', VENUE).select('id'), 'link');
    const rooms = must(await db.from('rooms').insert(t.rooms.map((n, i) => ({ business_id: VENUE, category_id: cat.id, room_number: n, status: 'VACANT',
      qr_code_hash: `ROOM_${cat.id.slice(0, 8)}_${n.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now().toString(36)}_${i + 1}` }))).select('id'), `${t.name} rooms`);
    made.push({ name: t.name, category_id: cat.id, catalog_item_id: item.id, room_ids: rooms.map((r) => r.id) });
    fs.writeFileSync(ledger, JSON.stringify(made, null, 2));
    console.log(`added ${t.name}: ${rooms.length} room(s)`);
  }
}

async function remove() {
  const made = JSON.parse(fs.readFileSync(ledger, 'utf8'));
  const ids = made.flatMap((m) => m.room_ids);
  const busy = must(await db.from('rooms').select('id, room_number, status').in('id', ids).eq('business_id', VENUE).neq('status', 'VACANT'), 'rooms');
  if (busy.length) throw new Error(`Not removed: ${busy.map((r) => `${r.room_number} is ${r.status}`).join(', ')}`);
  for (const m of made) {
    must(await db.from('rooms').delete().in('id', m.room_ids).eq('business_id', VENUE).select('id'), 'rooms');
    must(await db.from('catalog_items').delete().eq('id', m.catalog_item_id).eq('business_id', VENUE).select('id'), 'catalogue');
    must(await db.from('room_categories').delete().eq('id', m.category_id).eq('business_id', VENUE).select('id'), 'category');
    console.log(`removed ${m.name}`);
  }
  fs.unlinkSync(ledger);
}

if (mode === '--remove') await remove();
else {
  const cats = must(await db.from('room_categories').select('name, price, total_units').eq('business_id', VENUE), 'categories');
  console.log('room types now:', cats.map((c) => `${c.name} (₹${c.price}, ${c.total_units} rooms)`).join('; ') || 'none');
  await checkPhotos();
  if (mode === '--apply') await apply();
}
