/**
 * Live events lead pipeline, live: a venue publishes an event with a guest pool split between men and women, guests say
 * "I'm Interested", and the leads and the guest ledger appear for the host. Runs against a running server and its database
 * on a disposable venue that is removed afterwards. OFF unless E2E_LIVE=1:
 *   $env:E2E_LIVE='1'; npx vitest run --config vitest.e2e.config.ts tests/e2e/live-events.e2e.test.ts
 * The host screens need an owner login, which a test cannot hold; the host's data is checked in the database instead.
 * Needs migrations 20261016000007, 08 and 09 applied.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { call, cleanUp, liveEnv } from './support';

const LIVE = process.env.E2E_LIVE === '1';
const BASE = (process.env.E2E_BASE || 'http://localhost:3000').replace(/\/$/, '');
const ENV = liveEnv();
const report: Array<{ step: string; ok: boolean; note?: string }> = [];
const note = (step: string, ok: boolean, text?: string) => report.push({ step, ok, note: text });
const ip = (n: number) => `10.8.0.${n}`;

describe.skipIf(!LIVE)('Live events: pool split by gender, guests say "I\'m Interested", host sees the lead', () => {
  const db = createClient(ENV.NEXT_PUBLIC_SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  let biz = '';
  let eventId = '';
  const join = (n: number, party: object, who: object) =>
    call(BASE, '/api/guest/events/interest', { method: 'POST', ip: ip(n), body: { venue_id: biz, event_id: eventId, party, ...who } });

  beforeAll(async () => {
    const { data: b, error } = await db.from('businesses').insert({ business_name: 'ZZ E2E Events Venue', name: 'ZZ E2E Events Venue', slug: `zz-e2e-ev-${Date.now().toString(36)}`, categories: ['Cafe'] }).select('id').single();
    if (error) throw new Error(`could not create the test venue: ${error.message}`);
    biz = b.id;
    const { data: ev, error: evErr } = await db.from('venue_live_events').insert({
      business_id: biz, title: 'Sunset Acoustics & Cocktails', category: 'Acoustic Lounge', starts_at: new Date(Date.now() + 2 * 86_400_000).toISOString(),
      entry_fee: 500, perks: ['Free welcome drink', 'Reserved seating'], capacity: 10, male_capacity: 5, female_capacity: 5, status: 'LIVE',
    }).select('id').single();
    if (evErr) throw new Error(`could not create the event (are migrations 20261016000007 and 09 applied?): ${evErr.message}`);
    eventId = ev.id;
  }, 60_000);

  afterAll(async () => {
    const c = await cleanUp(db, ENV, biz);
    note('Cleanup: every row of the test venue removed', c.left === 0, `${c.deleted} rows deleted, ${c.left} left`);
    const lines = ['# Live events lead pipeline: live test report', '', '| # | Step | Result | Detail |', '|---:|---|:---:|---|',
      ...report.map((r, i) => `| ${i + 1} | ${r.step} | ${r.ok ? 'PASS' : 'FAIL'} | ${r.note ?? ''} |`), '', `**${report.filter((r) => r.ok).length} / ${report.length} checks passed.**`, ''];
    try { mkdirSync('docs', { recursive: true }); writeFileSync('docs/e2e-live-events-report.md', lines.join('\n')); } catch { /* console below */ }
    console.log(lines.join('\n'));
  }, 120_000);

  it('1. the guest feed shows the event and the seats left, without host-only details', async () => {
    const r = await call(BASE, `/api/guest/events?venue_id=${biz}`, { ip: ip(1) });
    const e = r.json?.events?.[0];
    note('Guest feed lists the live event', r.status === 200 && e?.id === eventId, `${r.json?.events?.length} event(s)`);
    note('Feed carries fee, perks, and seats left in total and by gender', e?.entry_fee === 500 && e?.perks?.length === 2 && e?.spots_left === 10 && e?.spots_left_men === 5 && e?.spots_left_women === 5 && e?.has_split === true);
    note('Feed does not expose the pool settings', e && !('capacity' in e) && !('male_capacity' in e) && !('max_male_pct' in e));
    expect(e?.id).toBe(eventId);
    expect(e).not.toHaveProperty('male_capacity');
    expect(e).not.toHaveProperty('capacity');
  });

  it('2. a guest who is not signed in gets an empty form to fill', async () => {
    const r = await call(BASE, `/api/guest/events/prefill?venue_id=${biz}`, { ip: ip(2) });
    note('Prefill for a guest not signed in is empty', r.status === 200 && r.json?.signedIn === false && r.json?.name === '');
    expect(r.json.signedIn).toBe(false);
  });

  it('3. interest needs a name and a way to reach the guest', async () => {
    const cases: Array<[string, any, number]> = [
      ['no contact', await join(3, { male: 1, female: 1 }, { name: 'Asha Rao' }), 400],
      ['no name', await join(3, { male: 1, female: 1 }, { email: 'asha@example.com' }), 400],
      ['empty party', await join(3, {}, { name: 'Asha', email: 'asha@example.com' }), 400],
      ['party over ten', await join(3, { male: 6, female: 6 }, { name: 'Asha', email: 'asha@example.com' }), 400],
    ];
    const alien = await call(BASE, '/api/guest/events/interest', { method: 'POST', ip: ip(3), body: { venue_id: biz, event_id: '00000000-0000-4000-8000-000000000000', party: { male: 1 }, name: 'Asha', email: 'asha@example.com' } });
    cases.push(['unknown event', alien, 404]);
    for (const [name, r, code] of cases) {
      note(`Refused: ${name}`, r.status === code, `HTTP ${r.status}`);
      expect(r.status, name).toBe(code);
    }
  });

  it('4. a party that fits goes on the list at once', async () => {
    const r = await join(4, { male: 3, female: 2 }, { name: 'Asha Rao', email: 'Asha@Example.com', phone: '+91 98765 43210' });
    note('Instant confirmation message', r.status === 200 && r.json?.message === "You're on the guest list! The lounge team has been notified.", r.json?.message);
    expect(r.status).toBe(200);
    const { data } = await db.from('event_guest_leads').select('*').eq('event_id', eventId);
    const lead = data?.find((l: any) => l.guest_name === 'Asha Rao');
    note('Lead saved with party and gender mix', lead?.party_size === 5 && lead?.party_male === 3 && lead?.party_female === 2 && lead?.status === 'INTERESTED');
    expect(lead?.party_size).toBe(5);
    const { data: bell } = await db.from('staff_notifications').select('message').eq('business_id', biz).eq('notification_type', 'EVENT_INTEREST');
    note('The lounge team is notified', (bell?.length ?? 0) > 0, bell?.[0]?.message);
    expect(bell?.length).toBeGreaterThan(0);
    const feed = await call(BASE, `/api/guest/events?venue_id=${biz}`, { ip: ip(4) });
    const e = feed.json?.events?.[0];
    note('Seats left drop by gender: 5 total, 2 men, 3 women', e?.spots_left === 5 && e?.spots_left_men === 2 && e?.spots_left_women === 3, `${e?.spots_left} / men ${e?.spots_left_men} / women ${e?.spots_left_women}`);
    expect(e?.spots_left_men).toBe(2);
  });

  it('5. a party that needs more seats than a gender has left is refused, and says which', async () => {
    const r = await join(5, { male: 3, female: 1 }, { name: 'Vikram Shah', phone: '9123456780' });
    note('Three men when two seats are left: refused with the seats left', r.status === 409 && /Only 2 seats are left for men/.test(r.json?.error || ''), r.json?.error);
    expect(r.status).toBe(409);
    const ok = await join(5, { male: 2, female: 2 }, { name: 'Vikram Shah', phone: '9123456780' });
    note('Two men and two women fit', ok.status === 200);
    expect(ok.status).toBe(200);
  });

  it('6. the same guest twice replaces their booking, never adds a second', async () => {
    const r = await join(6, { male: 2, female: 2 }, { name: 'Asha Rao', email: 'asha@example.com' });
    expect(r.status).toBe(200);
    const { data } = await db.from('event_guest_leads').select('party_size, guest_name').eq('event_id', eventId).eq('guest_name', 'Asha Rao');
    note('Second submit by the same guest updates the same lead', data?.length === 1 && data[0].party_size === 4, `${data?.length} lead(s), party ${data?.[0]?.party_size}`);
    expect(data).toHaveLength(1);
  });

  it('7. the pool and each gender\'s seats are enforced to the last seat', async () => {
    // Now booked: Asha 2M 2F, Vikram 2M 2F => 4 men, 4 women, 8 of 10. One seat left for each gender, two in the pool.
    const women = await join(7, { female: 2 }, { name: 'Late Group', phone: '9000000001' });
    note('Two women when one seat is left for women: refused', women.status === 409 && /Only 1 seat is left for women/.test(women.json?.error || ''), women.json?.error);
    expect(women.status).toBe(409);
    const last = await join(7, { male: 1, female: 1 }, { name: 'Last Pair', phone: '9000000002' });
    note('One man and one woman take the last seats', last.status === 200);
    expect(last.status).toBe(200);
    const feed = await call(BASE, `/api/guest/events?venue_id=${biz}`, { ip: ip(7) });
    const e = feed.json?.events?.[0];
    note('Feed now shows the event full', e?.spots_left === 0 && e?.spots_left_men === 0 && e?.spots_left_women === 0, `${e?.spots_left} left`);
    const full = await join(8, { male: 1 }, { name: 'Too Late', phone: '9000000003' });
    note('Anyone else is told the event is full', full.status === 409 && /full/i.test(full.json?.error || ''), full.json?.error);
    expect(full.status).toBe(409);
  });

  it('8. two parties racing for the last seats cannot both get them', async () => {
    await db.from('event_guest_leads').delete().eq('event_id', eventId).eq('guest_name', 'Last Pair');
    const [a, b] = await Promise.all([
      join(9, { male: 1, female: 1 }, { name: 'Racer One', phone: '9000000011' }),
      join(10, { male: 1, female: 1 }, { name: 'Racer Two', phone: '9000000012' }),
    ]);
    const wins = [a, b].filter((r) => r.status === 200).length;
    note('Two parties race for one pair of seats: exactly one wins', wins === 1 && [a, b].some((r) => r.status === 409), `HTTP ${a.status} and ${b.status}`);
    expect(wins).toBe(1);
  });

  it('9. every guest who showed interest is in the host\'s ledger', async () => {
    const { data } = await db.from('venue_guest_ledger').select('guest_key, event_leads').eq('business_id', biz);
    const keys = (data || []).map((g: any) => g.guest_key).sort();
    // Asha gave a phone first and only an email later: one person, keyed by the phone she first gave.
    note('Ledger has one row per guest, even when a guest gave phone once and email later', keys.includes('p:9876543210') && keys.includes('p:9123456780') && new Set(keys).size === keys.length, keys.join(', '));
    note('Each guest counted once as an event lead', (data || []).every((g: any) => g.event_leads === 1));
    expect((data || []).every((g: any) => g.event_leads === 1)).toBe(true);
  });

  it('10. a settled bill adds a visit and the spend to the ledger', async () => {
    const args = { p_business_id: biz, p_guest_key: 'p:9123456780', p_guest_name: 'Vikram Shah', p_handle: null, p_email: null, p_phone: '9123456780' };
    const a = await db.rpc('ledger_record_visit', { ...args, p_spend: 1200 });
    const b = await db.rpc('ledger_record_visit', { ...args, p_spend: 800 });
    const { data } = await db.from('venue_guest_ledger').select('visits, total_spend, last_visit_at').eq('business_id', biz).eq('guest_key', 'p:9123456780').single();
    note('Two settled bills: 2 visits, spend adds up', !a.error && !b.error && data?.visits === 2 && Number(data?.total_spend) === 2000 && Boolean(data?.last_visit_at), `${data?.visits} visits, ₹${data?.total_spend}`);
    expect(data?.visits).toBe(2);
  });

  it('11. the host\'s data is closed to everyone but the signed-in owner', async () => {
    for (const path of ['/api/host/guests', '/api/host/live-events', '/api/host/live-events/import', `/api/host/live-events/leads?event_id=${eventId}`]) {
      const r = await call(BASE, path);
      note(`No login: ${path.split('?')[0]} refused`, [401, 403].includes(r.status), `HTTP ${r.status}`);
      expect([401, 403]).toContain(r.status);
    }
    const anon = createClient(ENV.NEXT_PUBLIC_SUPABASE_URL, ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const direct = await anon.from('event_guest_leads').select('*').eq('business_id', biz);
    note('The browser\'s own key cannot read the guest list directly', (direct.data?.length ?? 0) === 0, direct.error?.message || '0 rows');
    expect(direct.data?.length ?? 0).toBe(0);
  });

  it('12. a cancelled event closes its list', async () => {
    await db.from('venue_live_events').update({ status: 'CANCELLED' }).eq('id', eventId);
    const r = await join(11, { male: 1 }, { name: 'Too Late', phone: '9000000004' });
    const feed = await call(BASE, `/api/guest/events?venue_id=${biz}`, { ip: ip(11) });
    note('Cancelled event refuses new interest and leaves the feed', r.status === 404 && feed.json?.events?.length === 0, `HTTP ${r.status}, ${feed.json?.events?.length} in feed`);
    expect(r.status).toBe(404);
    expect(feed.json.events).toHaveLength(0);
  });
});
