// What can a signed-out visitor do with the public anon key (it ships in every browser)? Run before launch and after any
// policy change:   node scripts/audit/rls-anon.mjs        (reads .env.local; exits 1 on any finding)
//
//  1. READ every table the migrations create: only tables meant to be public may return rows.
//  2. INSERT an empty row into every table: it can never persist (an empty row breaks a NOT NULL), but the error says
//     whether row-level security would have let it through (42501 = refused; anything else = it got past the policy).
//  3. READ / UPDATE / DELETE rows that this script creates itself (a venue with no owner, a room, an offer, a photo)
//     and removes at the end, then check with the service role whether the anon client changed or removed them.
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]));
const opts = { auth: { persistSession: false } };
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, opts);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, opts);

/** Tables that are public on purpose: the menu, the table list, opening hours, the lobby, live offers and photos. */
const PUBLIC_READ = new Set(['catalog_items', 'restaurant_tables', 'venue_operating_hours', 'lobby_messages', 'venue_live_offers', 'venue_photo_vault']);

const dir = 'supabase/migrations';
const sql = fs.readdirSync(dir).sort().map((f) => fs.readFileSync(path.join(dir, f), 'utf8').replace(/--.*$/gm, '')).join('\n');
const tables = [...new Set([...sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?"?(\w+)"?/gi)].map((m) => m[1].toLowerCase()))].sort();

const findings = [];
const note = (s) => { findings.push(s); console.log(`  FINDING: ${s}`); };

console.log(`1+2. anon read and insert probes over ${tables.length} tables`);
for (const t of tables) {
  const live = await admin.from(t).select('*', { count: 'exact', head: true });
  if (live.error || live.count === null) continue; // not in this database (a migration not applied yet)
  const read = await anon.from(t).select('*').limit(1);
  if (!read.error && read.data.length && !PUBLIC_READ.has(t)) note(`anon can READ rows of ${t}`);
  const ins = await anon.from(t).insert({}).select();
  if (!ins.error) note(`anon INSERT into ${t} was accepted`);
  else if (!['42501', 'PGRST205', '42P01'].includes(ins.error.code)) note(`anon INSERT into ${t} got past row-level security (${ins.error.code})`);
}

console.log('3. anon read/update/delete against rows this script creates');
const tag = `zz-audit-${Date.now().toString(36)}`;
const made = { businesses: [], room_categories: [], rooms: [], venue_live_offers: [], venue_photo_vault: [] };
const mk = async (table, row) => { const { data, error } = await admin.from(table).insert(row).select().single(); if (error) throw new Error(`setup ${table}: ${error.message}`); made[table].push(data.id); return data; };
const probe = async (table, row, field, label = table) => {
  const read = await anon.from(table).select('id').eq('id', row.id);
  await anon.from(table).update({ [field]: 'HIJACKED' }).eq('id', row.id).select();
  const changed = (await admin.from(table).select(field).eq('id', row.id).single()).data?.[field] === 'HIJACKED';
  await anon.from(table).delete().eq('id', row.id).select();
  const gone = (await admin.from(table).select('id').eq('id', row.id)).data?.length !== 1;
  const sees = !read.error && read.data.length === 1;
  console.log(`   ${label.padEnd(26)} anon sees: ${String(sees).padEnd(5)} changes: ${String(changed).padEnd(5)} deletes: ${gone}`);
  if (changed) note(`anon CHANGED a ${label} row`);
  if (gone) note(`anon DELETED a ${label} row`);
  if (sees && !PUBLIC_READ.has(table)) note(`anon can SEE a ${label} row`);
};
try {
  const orphan = await mk('businesses', { business_name: `ZZ Audit ${tag}`, name: `ZZ Audit ${tag}`, slug: tag, categories: ['Cafe'] });
  await probe('businesses', orphan, 'business_name', 'businesses (no owner)');
  const biz = await mk('businesses', { business_name: `ZZ Audit B ${tag}`, name: `ZZ Audit B ${tag}`, slug: `${tag}-b`, categories: ['Cafe'] });
  const cat = await mk('room_categories', { business_id: biz.id, name: 'ZZ probe', price: 1 });
  await probe('room_categories', cat, 'name');
  const cat2 = await mk('room_categories', { business_id: biz.id, name: 'ZZ probe 2', price: 1 });
  await probe('rooms', await mk('rooms', { business_id: biz.id, category_id: cat2.id, room_number: 'ZZ1' }), 'room_number');
  await probe('venue_live_offers', await mk('venue_live_offers', { venue_id: biz.id, title: 'ZZ probe', discount_badge: '10%' }), 'title');
  await probe('venue_photo_vault', await mk('venue_photo_vault', { venue_id: biz.id, title: 'ZZ probe', category: 'x', image_url: 'https://example.invalid/x.jpg' }), 'title');
} finally {
  for (const t of ['rooms', 'room_categories', 'venue_live_offers', 'venue_photo_vault', 'businesses']) if (made[t].length) await admin.from(t).delete().in('id', made[t]);
  const left = await Promise.all(Object.entries(made).map(async ([t, ids]) => (ids.length ? (await admin.from(t).select('id', { count: 'exact', head: true }).in('id', ids)).count : 0)));
  console.log(`   cleanup: ${left.reduce((a, b) => a + b, 0)} of my rows left`);
}
console.log(findings.length ? `\nFAILED: ${findings.length} finding(s)` : '\nPASSED: the anon key reads only the public tables and changes nothing.');
process.exit(findings.length ? 1 : 0);
