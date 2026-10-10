// Imports a venue's menu into its catalog and sets its menu information.
//
//   node scripts/import-menu.mjs <venue-id> <menu-file.json>            # dry run: shows the changes
//   node scripts/import-menu.mjs <venue-id> <menu-file.json> --apply    # writes them
//
// Reads SUPABASE credentials from .env.local. Refuses to run if the venue's name does not match the
// menu file, so a wrong id cannot load one venue's menu into another.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { planMenuImport } from './lib/menu-import.mjs';

const [venueId, file, flag] = process.argv.slice(2);
if (!venueId || !file) {
  console.error('Usage: node scripts/import-menu.mjs <venue-id> <menu-file.json> [--apply]');
  process.exit(2);
}
const apply = flag === '--apply';
const projectDir = process.cwd();
const require = createRequire(path.join(projectDir, 'package.json'));
require('dotenv').config({ path: path.join(projectDir, '.env.local'), quiet: true });
const { createClient } = require('@supabase/supabase-js');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const menu = JSON.parse(readFileSync(file, 'utf8'));
const norm = (s) => String(s || '').trim().toLowerCase();

const { data: venue, error: venueErr } = await db.from('businesses').select('id, name, business_name').eq('id', venueId).maybeSingle();
if (venueErr) throw venueErr;
if (!venue) { console.error('No venue with that id.'); process.exit(1); }
const venueName = venue.business_name || venue.name;
if (norm(venueName) !== norm(menu.venue?.name)) {
  console.error(`The venue is "${venueName}" but the menu file is for "${menu.venue?.name}". Nothing was written.`);
  process.exit(1);
}

const { data: existing, error: existingErr } = await db.from('catalog_items')
  .select('id, name, price, is_available, metadata').eq('business_id', venueId);
if (existingErr) throw existingErr;

const plan = planMenuImport(menu, existing || []);
if (plan.errors.length) {
  console.error('The menu file has problems. Nothing was written:');
  for (const e of plan.errors) console.error(`  - ${e}`);
  process.exit(1);
}

const priced = plan.inserts.filter((i) => i.is_available).length;
console.log(`Venue: ${venueName}`);
console.log(`New items: ${plan.inserts.length} (${priced} priced and on the menu, ${plan.hidden.length} hidden until priced)`);
console.log(`Existing items updated: ${plan.updates.length}`);
for (const u of plan.updates) if (u.priceChanged) console.log(`  price: ${u.name} → ₹${u.patch.price}`);
if (plan.hidden.length) console.log(`Hidden until priced: ${plan.hidden.join(', ')}`);

if (!apply) {
  console.log('\nDry run. Nothing was written. Run again with --apply to write these changes.');
  process.exit(0);
}

const { data: location } = await db.from('locations').select('id').eq('business_id', venueId)
  .order('created_at', { ascending: true }).limit(1).maybeSingle();
const locationId = location?.id ?? null;

for (let i = 0; i < plan.inserts.length; i += 50) {
  const chunk = plan.inserts.slice(i, i + 50).map((row) => ({ ...row, business_id: venueId, location_id: locationId }));
  const { error } = await db.from('catalog_items').insert(chunk);
  if (error) { console.error('Insert failed:', error.message); process.exit(1); }
}
for (const u of plan.updates) {
  const { error } = await db.from('catalog_items').update(u.patch).eq('id', u.id).eq('business_id', venueId);
  if (error) { console.error(`Update failed for ${u.name}:`, error.message); process.exit(1); }
}

const info = menu.info;
if (info) {
  const { error } = await db.from('businesses').update({ menu_info: info }).eq('id', venueId);
  if (error) {
    console.error('Items were written, but the menu information was not:', error.message);
    console.error('Apply migration 20261010000014_menu_info.sql in Supabase, then run this again.');
    process.exit(1);
  }
}
console.log(`\nDone. ${plan.inserts.length} added, ${plan.updates.length} updated${info ? ', menu information set' : ''}.`);
