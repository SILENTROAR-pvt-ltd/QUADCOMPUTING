// Adds three live events to the pilot venue (the "Live events" cards on the menu and in the lounge), each with a banner
// from Pexels (free licence, hotlinked), perks and a guest pool, the same row the host's event form publishes. Dates are
// the next Friday, Saturday and Sunday from the day it runs, in IST.
// usage (from the project root): node scripts/content/pilot-events.mjs [--apply | --remove]
// Without a flag it only lists the live events and checks the banners load. --remove deletes only what --apply added,
// and refuses while any of those events has guests on its list.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const mode = process.argv[2];
const projectDir = process.cwd();
const ledger = path.join(projectDir, 'scripts/content/pilot-events-added.json');
const require = createRequire(path.join(projectDir, 'package.json'));
const { createClient } = require('@supabase/supabase-js');
const env = Object.fromEntries(fs.readFileSync(path.join(projectDir, '.env.local'), 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/)).filter(Boolean).map((m) => [m[1], m[2]]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const VENUE = '189664b2-99e7-4d45-ac50-ffb647ef97df';
const px = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1400`;

/** The next given weekday (0 = Sunday) at hh:mm IST, as an ISO time; today counts only if that time is still ahead. */
function nextAt(weekday, hh, mm) {
  const ist = new Date(Date.now() + 5.5 * 3600_000);
  for (let add = 0; add < 8; add++) {
    const day = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + add);
    const at = new Date(day + (hh * 60 + mm) * 60_000 - 5.5 * 3600_000);
    if (new Date(day).getUTCDay() === weekday && at.getTime() > Date.now()) return at;
  }
  throw new Error('no date');
}
const span = (start, hours) => ({ starts_at: start.toISOString(), ends_at: new Date(start.getTime() + hours * 3600_000).toISOString() });

const EVENTS = [
  { title: 'Stargazing on the Terrace', category: 'Theme Night', entry_fee: 399, capacity: 20, banner_url: px(9143829), ...span(nextAt(5, 21, 0), 2.5),
    perks: ['Telescope & a guide', 'Warm blankets', 'Masala chai'],
    description: 'The valley goes dark and the sky comes out. A guide, a telescope and warm blankets on our terrace, with chai all evening.' },
  { title: 'Bonfire & Acoustic Evening', category: 'Acoustic Lounge', entry_fee: 0, capacity: 40, banner_url: px(4625392), ...span(nextAt(6, 19, 30), 3),
    perks: ['Live acoustic set', 'Bonfire under the deodars', 'Hot chocolate & kahwa'],
    description: 'Old songs, new friends and a fire that lasts as long as the stories do. Free entry; order from the menu as you like.' },
  { title: 'Himalayan Sunday Brunch', category: 'Brunch', entry_fee: 799, capacity: 30, banner_url: px(30548856), ...span(nextAt(0, 11, 0), 3),
    perks: ['Pahadi specials', 'Fresh juices', 'Unlimited chai & coffee'],
    description: 'A slow Sunday table: pahadi favourites, fresh bakes and juices, with the mountains for company.' },
];

const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };

if (mode === '--remove') {
  const added = JSON.parse(fs.readFileSync(ledger, 'utf8'));
  const leads = must(await db.from('event_guest_leads').select('event_id').in('event_id', added.map((a) => a.id)), 'guest lists');
  if (leads.length) throw new Error(`Not removed: ${leads.length} guest(s) already on these lists. Cancel them from the host console instead.`);
  must(await db.from('venue_live_events').delete().in('id', added.map((a) => a.id)).eq('business_id', VENUE).select('id'), 'events');
  fs.unlinkSync(ledger);
  console.log(`removed ${added.length} events`);
} else {
  const live = must(await db.from('venue_live_events').select('title, starts_at').eq('business_id', VENUE).eq('status', 'LIVE').order('starts_at'), 'events');
  console.log('live events now:', live.map((e) => `${e.title} (${e.starts_at.slice(0, 16)})`).join('; ') || 'none');
  for (const e of EVENTS) {
    const res = await fetch(e.banner_url);
    console.log(`${res.status} ${res.headers.get('content-type')} ${e.title} → ${e.starts_at.slice(0, 16)}Z`);
    if (!res.ok) throw new Error(`Banner does not load: ${e.banner_url}`);
  }
  if (mode === '--apply') {
    const added = fs.existsSync(ledger) ? JSON.parse(fs.readFileSync(ledger, 'utf8')) : [];
    for (const e of EVENTS) {
      if (live.some((x) => x.title === e.title)) { console.log(`skip ${e.title}: already live`); continue; }
      const row = must(await db.from('venue_live_events').insert({ ...e, business_id: VENUE, status: 'LIVE', male_capacity: null, female_capacity: null }).select('id').single(), e.title);
      added.push({ id: row.id, title: e.title });
      fs.writeFileSync(ledger, JSON.stringify(added, null, 2));
      console.log(`added ${e.title}`);
    }
  }
}
