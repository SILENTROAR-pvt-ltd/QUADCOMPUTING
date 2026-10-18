// One-off, safe to re-run: moves any venue PIN still stored in plain text (businesses.admin_pin / staff_pin) into the
// salted scrypt hash column the app checks first (admin_pin_hash / staff_pin_hash), and clears the plain text. The same
// PIN keeps working: the app already verifies hashes (lib/services/security/venue-pin.ts). Prints counts, never PINs.
//
//   node scripts/hash-legacy-venue-pins.mjs            (dry run: says what it would do)
//   node scripts/hash-legacy-venue-pins.mjs --apply
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const apply = process.argv.includes('--apply');
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// The same stored form as encodePin(): "scrypt:<salt hex>:<key hex>", scrypt(pin, salt, 32).
const encode = (pin) => { const salt = randomBytes(16).toString('hex'); return `scrypt:${salt}:${scryptSync(pin, salt, 32).toString('hex')}`; };
const matches = (stored, pin) => {
  const [, salt, hash] = String(stored).split(':');
  const key = scryptSync(pin, salt, 32);
  const want = Buffer.from(hash, 'hex');
  return want.length === key.length && timingSafeEqual(want, key);
};

const { data: rows, error } = await db.from('businesses').select('id, admin_pin, staff_pin, admin_pin_hash, staff_pin_hash');
if (error) throw error;
let found = 0, migrated = 0, failed = 0;
for (const row of rows) {
  const patch = {};
  const check = [];
  for (const kind of ['admin', 'staff']) {
    const plain = row[`${kind}_pin`] == null ? '' : String(row[`${kind}_pin`]).trim();
    if (!plain) continue;
    found += 1;
    // A four-digit PIN is the only kind the app accepts; anything else is cleared rather than hashed.
    if (/^\d{4}$/.test(plain) && !row[`${kind}_pin_hash`]) { patch[`${kind}_pin_hash`] = encode(plain); check.push([kind, plain]); }
    patch[`${kind}_pin`] = null;
  }
  if (!Object.keys(patch).length) continue;
  if (!apply) { migrated += check.length; continue; }
  const up = await db.from('businesses').update(patch).eq('id', row.id);
  if (up.error) { failed += 1; console.error(`venue ${row.id.slice(0, 8)}: ${up.error.message}`); continue; }
  const back = (await db.from('businesses').select('admin_pin, staff_pin, admin_pin_hash, staff_pin_hash').eq('id', row.id).single()).data;
  const ok = check.every(([kind, plain]) => back[`${kind}_pin_hash`] && matches(back[`${kind}_pin_hash`], plain)) && back.admin_pin == null && back.staff_pin == null;
  if (ok) migrated += check.length; else { failed += 1; console.error(`venue ${row.id.slice(0, 8)}: read-back did not verify`); }
}
console.log(`${apply ? 'APPLIED' : 'DRY RUN'}: ${found} plain-text PIN(s) found, ${migrated} ${apply ? 'hashed and verified' : 'would be hashed'}, ${failed} failure(s)`);
