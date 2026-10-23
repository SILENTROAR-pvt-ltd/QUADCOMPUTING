// Puts The Mad kings' printed menu (scripts/content/madkings-menu.data.mjs) on its digital menu: every dish with its
// category, price, veg / non-veg / egg mark, a one-line description and a Pexels photo (free licence, hotlinked;
// chosen per dish in madkings-menu.photos.mjs). The rows are the ones the host's menu import makes, without the
// per-dish platform fee. A dish the venue already has (same name) is left exactly as it is.
// usage (from the project root): node scripts/content/madkings-menu.mjs [--apply | --remove]
// Without a flag it only reads: what would be added, what is already there, and whether every photo loads.
// --remove deletes only the dishes --apply added (listed in scripts/content/madkings-menu-added.json).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { VENUE_NAME, menuRows } from './madkings-menu.data.mjs';
import { PHOTOS } from './madkings-menu.photos.mjs';

const mode = process.argv[2];
const projectDir = process.cwd();
const ledger = path.join(projectDir, 'scripts/content/madkings-menu-added.json');
const require = createRequire(path.join(projectDir, 'package.json'));
const { createClient } = require('@supabase/supabase-js');
const env = Object.fromEntries(fs.readFileSync(path.join(projectDir, '.env.local'), 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/)).filter(Boolean).map((m) => [m[1], m[2]]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const VENUE = '6afc36e9-d29e-45ce-8b80-d33feb462749';
const px = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800`;
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };

async function checkPhotos(rows) {
  const ids = [...new Set(rows.map((r) => PHOTOS[r.photo_key]).filter(Boolean))];
  const bad = [];
  for (let i = 0; i < ids.length; i += 12) {
    await Promise.all(ids.slice(i, i + 12).map(async (id) => {
      const res = await fetch(px(id).replace('w=800', 'w=200')).catch(() => null);
      if (!res?.ok || !String(res.headers.get('content-type')).startsWith('image/')) bad.push(id);
      else await res.arrayBuffer();
    }));
  }
  console.log(`photos: ${ids.length - bad.length} of ${ids.length} load${bad.length ? `; not loading: ${bad.join(', ')}` : ''}`);
  return new Set(bad);
}

async function plan() {
  const venue = must(await db.from('businesses').select('id, business_name').eq('id', VENUE).maybeSingle(), 'venue');
  if (!venue || venue.business_name.trim().toLowerCase() !== VENUE_NAME.toLowerCase()) throw new Error(`Venue ${VENUE} is not ${VENUE_NAME}.`);
  const existing = must(await db.from('catalog_items').select('id, name').eq('business_id', VENUE), 'menu');
  const have = new Set(existing.map((e) => e.name.trim().toLowerCase()));
  const rows = menuRows();
  const fresh = rows.filter((r) => !have.has(r.name.toLowerCase()));
  console.log(`${venue.business_name}: ${existing.length} item(s) on the menu now; the boards have ${rows.length}; ${rows.length - fresh.length} already there, ${fresh.length} to add`);
  const unphotographed = rows.filter((r) => !PHOTOS[r.photo_key]).map((r) => r.name);
  if (unphotographed.length) console.log(`no photo chosen for: ${unphotographed.join(', ')}`);
  return { fresh, rows };
}

async function apply(fresh, broken) {
  const loc = must(await db.from('locations').select('id').eq('business_id', VENUE).order('created_at', { ascending: false }).limit(1).maybeSingle(), 'location');
  const made = fs.existsSync(ledger) ? JSON.parse(fs.readFileSync(ledger, 'utf8')) : [];
  for (let i = 0; i < fresh.length; i += 100) {
    const batch = fresh.slice(i, i + 100).map((r) => {
      const photo = PHOTOS[r.photo_key];
      return {
        business_id: VENUE, location_id: loc?.id ?? null, item_type: 'food', name: r.name, price: r.price, category: r.category,
        description: r.description, image_url: photo && !broken.has(photo) ? px(photo) : null, is_available: true, station: r.station,
        metadata: { dietary: r.dietary, imported_from: 'menu-import', made_to_order: false, needs_price: false, prep_time_minutes: 15 },
      };
    });
    const added = must(await db.from('catalog_items').insert(batch).select('id, name'), `dishes ${i + 1}-${i + batch.length}`);
    made.push(...added.map((a) => ({ id: a.id, name: a.name })));
    fs.writeFileSync(ledger, JSON.stringify(made, null, 2));
    console.log(`added ${made.length} so far`);
  }
  const byCat = {};
  for (const r of fresh) byCat[r.category] = (byCat[r.category] || 0) + 1;
  console.log(`done: ${fresh.length} dishes in ${Object.keys(byCat).length} categories`);
}

async function remove() {
  const made = JSON.parse(fs.readFileSync(ledger, 'utf8'));
  for (let i = 0; i < made.length; i += 100) {
    const ids = made.slice(i, i + 100).map((m) => m.id);
    must(await db.from('catalog_items').delete().in('id', ids).eq('business_id', VENUE).select('id'), 'remove');
  }
  fs.unlinkSync(ledger);
  console.log(`removed ${made.length} dishes`);
}

if (mode === '--remove') await remove();
else {
  const { fresh, rows } = await plan();
  const broken = await checkPhotos(rows);
  if (mode === '--apply') await apply(fresh, broken);
}
