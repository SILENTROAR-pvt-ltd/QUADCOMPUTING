/**
 * Live subscription stress test on Bombay Rasoi, the owner's pilot venue: every plan state, every plan-gated service
 * (host and guest side), the ₹3 bill fee and the approval function, against the real database and the real route code.
 *
 * It writes real rows, so it is OFF unless E2E_LIVE=1. The venue's subscription and wallet are snapshotted first and put
 * back exactly at the end; every row it creates (fee ledger lines, dues, payment requests) carries an E2E reference and
 * is deleted. Requests sent on plans that allow a feature are invalid on purpose (they fail validation after the plan
 * gate), so nothing is published, booked or ordered.
 *
 *   $env:E2E_LIVE='1'; npx vitest run --config vitest.e2e.config.ts tests/e2e/subscription-plans.e2e.test.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ALL, at, CASES } from './subscription-plans.matrix';

const LIVE = process.env.E2E_LIVE === '1';
const BIZ = process.env.E2E_SUB_VENUE || '189664b2-99e7-4d45-ac50-ffb647ef97df';
try {
  for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim().replace(/^"|"$/g, '');
  }
} catch { /* no env file: the suite is skipped below */ }

const ctx = vi.hoisted(() => ({ business: null as any }));
vi.mock('@/lib/auth/guards', async (orig) => {
  const { adminDb } = await import('@/lib/supabase/admin');
  return { ...(await orig<any>()), adminDb, requireHost: async () => ({ error: null, businessId: ctx.business.id, business: ctx.business, businesses: [ctx.business], supabase: adminDb(), user: { id: ctx.business.host_id } }) };
});
vi.mock('@/lib/middleware/rate-limiter', async (orig) => ({ ...(await orig<any>()), enforceRateLimit: async () => null, checkRateLimit: async () => ({ allowed: true, remaining: 99 }) }));
vi.mock('@/lib/services/security/master-unlock-guard', () => ({ masterUnlockRequired: () => null }));

import { adminDb } from '@/lib/supabase/admin';
import { loadEntitlements } from '@/lib/services/billing/feature-gate';
import { evaluateFeeGuard } from '@/lib/services/wallet/fee-guard.service';
import { GET as planGET } from '@/app/api/host/plan/route';
import { POST as eventsPOST } from '@/app/api/host/live-events/route';
import { GET as offersGET, POST as offersPOST } from '@/app/api/venue/offers/route';
import { POST as roomsPOST } from '@/app/api/host/accommodations/rooms/route';
import { POST as categoriesPOST } from '@/app/api/host/accommodations/categories/route';
import { POST as bookingsPOST } from '@/app/api/host/accommodations/bookings/route';
import { PUT as deliveryPUT } from '@/app/api/host/delivery-settings/route';
import { GET as hostVibeyGET } from '@/app/api/host/vibey/route';
import { GET as guestEventsGET } from '@/app/api/guest/events/route';
import { GET as deliveryInfoGET } from '@/app/api/guest/delivery-info/route';
import { GET as guestVibeyGET } from '@/app/api/guest/vibey/route';
import { POST as guestOrderPOST } from '@/app/api/guest/order/route';
import { POST as stayBookPOST } from '@/app/api/guest/stay/book/route';
import { POST as interestPOST } from '@/app/api/guest/events/interest/route';
import { POST as offerRequestPOST } from '@/app/api/guest/offers/requests/route';
import { POST as walletPOST } from '@/app/api/host/wallet/route';
import { GET as showcaseGET } from '@/app/api/guest/stay/showcase/route';

const RUN = `E2ESUB${Date.now().toString(36).toUpperCase()}`;
const FAKE_ID = 'cccccccc-1111-4222-8333-444444444444';
const req = (path: string, method = 'GET', body?: unknown) =>
  new Request(`http://localhost${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
const json = async (res: Response) => ({ status: res.status, body: await res.json().catch(() => null) });

/** Host routes a plan gates; each request fails its own validation once past the gate, so nothing is written. */
const HOST_GATES = [
  { name: 'Publish a live event', feature: 'events', call: () => eventsPOST(req('/api/host/live-events', 'POST', {})) },
  { name: 'Create an offer', feature: 'offers', call: () => offersPOST(req('/api/venue/offers', 'POST', {})) },
  { name: 'Add a room', feature: 'rooms', call: () => roomsPOST(req('/api/host/accommodations/rooms', 'POST', {})) },
  { name: 'Add a room type', feature: 'rooms', call: () => categoriesPOST(req('/api/host/accommodations/categories', 'POST', {})) },
  { name: 'Desk room booking', feature: 'rooms', call: () => bookingsPOST(req('/api/host/accommodations/bookings', 'POST', {})) },
] as const;
/** Guest actions a plan gates: only sent where the plan lacks the feature (elsewhere they would place real requests). */
const GUEST_GATES = [
  { name: 'Guest delivery order', feature: 'delivery', call: () => guestOrderPOST(req('/api/guest/order', 'POST', { cafe_id: BIZ, order_type: 'delivery', items: [] })) },
  { name: 'Guest room booking', feature: 'rooms', call: () => stayBookPOST(req('/api/guest/stay/book', 'POST', { venue: BIZ })) },
  { name: 'Guest joins an event list', feature: 'events', call: () => interestPOST(req('/api/guest/events/interest', 'POST', { venue_id: BIZ, event_id: FAKE_ID })) },
  { name: 'Guest redeems an offer', feature: 'offers', call: () => offerRequestPOST(req(`/api/guest/offers/requests?cafe_id=${BIZ}&table=T-01`, 'POST', { offer_id: FAKE_ID, kind: 'redeem' })) },
  { name: 'Turn delivery on', feature: 'delivery', call: () => deliveryPUT(req('/api/host/delivery-settings', 'PUT', { enabled: true, radiusKm: 5, minOrder: 300, fee: 40, venueLat: 32.24, venueLng: 77.19 })) },
] as const;

const rows: string[] = [];
const checks: Array<{ what: string; ok: boolean; detail?: string }> = [];
const check = (what: string, ok: boolean, detail?: string) => { checks.push({ what, ok, detail }); expect.soft(ok, `${what}${detail ? ` (${detail})` : ''}`).toBe(true); };

describe.skipIf(!LIVE)('Subscription plans, live on Bombay Rasoi', () => {
  const db = adminDb();
  let snapSub: any; let snapWallet: any;
  const requestIds: string[] = [];

  const setSub = async (fields: Record<string, unknown>) => {
    const { error } = await db.from('venue_subscriptions').update(fields).eq('venue_id', BIZ);
    if (error) throw new Error(`could not set the plan: ${error.message}`);
  };
  const setBalance = async (balance: number) => { await db.from('venue_wallets').update({ balance }).eq('venue_id', BIZ); };
  const balance = async () => Number((await db.from('venue_wallets').select('balance').eq('venue_id', BIZ).single()).data?.balance);
  const sub = async () => (await db.from('venue_subscriptions').select('*').eq('venue_id', BIZ).single()).data;

  beforeAll(async () => {
    const { data: business } = await db.from('businesses').select('*').eq('id', BIZ).single();
    if (!business) throw new Error('test venue not found');
    ctx.business = business;
    snapSub = await sub();
    snapWallet = (await db.from('venue_wallets').select('*').eq('venue_id', BIZ).single()).data;
    const { count } = await db.from('venue_topup_requests').select('id', { count: 'exact', head: true }).eq('venue_id', BIZ).eq('status', 'pending');
    if (count) throw new Error('the venue has a payment waiting for review; run the test once it is settled');
  });

  afterAll(async () => {
    const keep = ['plan_tier', 'status', 'trial_ends_at', 'expires_at', 'trial_used_at', 'setup_fee_paid_at', 'vibey_until', 'current_period_end', 'updated_at'];
    if (snapSub) await setSub(Object.fromEntries(keep.filter((k) => k in snapSub).map((k) => [k, snapSub[k]])));
    if (snapWallet) await db.from('venue_wallets').update({ balance: snapWallet.balance, updated_at: snapWallet.updated_at }).eq('venue_id', BIZ);
    const refs = requestIds.map((id) => `TOPUP_${id}`);
    const ledger = await db.from('usage_ledger').delete().eq('venue_id', BIZ).or(`reference_id.like.QC-${RUN}%,reference_id.in.(${refs.join(',') || 'none'})`).select('id');
    const dues = await db.from('venue_outstanding_bills').delete().eq('venue_id', BIZ).like('reference_id', `QC-${RUN}%`).select('id');
    const reqs = requestIds.length ? await db.from('venue_topup_requests').delete().in('id', requestIds).select('id') : { data: [] };
    const after = await sub(); const wallet = await balance();
    const restored = keep.filter((k) => k !== 'updated_at' && k in (snapSub || {})).every((k) => String(after?.[k]) === String(snapSub[k])) && wallet === Number(snapWallet?.balance);
    checks.push({ what: 'Venue put back exactly (plan row and wallet balance)', ok: restored, detail: `plan ${after?.plan_tier}/${after?.status}, wallet ₹${wallet}` });
    checks.push({ what: 'Test rows removed', ok: !ledger.error && !dues.error, detail: `${ledger.data?.length ?? 0} ledger lines, ${dues.data?.length ?? 0} dues, ${reqs.data?.length ?? 0} payment requests${ledger.error ? `; ledger: ${ledger.error.message}` : ''}` });
    writeReport();
  });

  it('every plan unlocks, hides and charges exactly what it should', async () => {
    let baseline: Record<string, unknown> | null = null;
    for (const c of CASES) {
      await setSub(c.sub);
      const e = await loadEntitlements(BIZ, db);
      const got = ALL.filter((f) => e.features.has(f));
      check(`${c.label}: unlocks ${c.features.join(', ')}`, got.join() === ALL.filter((f) => c.features.includes(f)).join(), `got ${got.join(', ')}`);
      const plan = await json(await planGET(req('/api/host/plan')));
      check(`${c.label}: dashboard phase ${c.phase}`, plan.body?.phase === c.phase, `got ${plan.body?.phase}`);

      // The ₹3 fee: settle one bill twice (a retry) with ₹50 in the wallet.
      await setBalance(50);
      const ref = `QC-${RUN}-${c.key.toUpperCase()}`;
      const first = await evaluateFeeGuard(BIZ, 'bill_generate', ref, db);
      await evaluateFeeGuard(BIZ, 'bill_generate', ref, db);
      const left = await balance();
      check(`${c.label}: bill fee ₹${c.fee}, charged once`, first.cost === c.fee && left === 50 - c.fee, `cost ₹${first.cost}, wallet ₹50 → ₹${left}`);

      // What guests see.
      const guest = {
        events: (await json(await guestEventsGET(req(`/api/guest/events?venue_id=${BIZ}`)))).body?.events?.length ?? 0,
        offers: (await json(await offersGET(req(`/api/venue/offers?venue_id=${BIZ}`)))).body?.offers?.length ?? 0,
        delivery: Boolean((await json(await deliveryInfoGET(req(`/api/guest/delivery-info?cafe_id=${BIZ}`)))).body?.enabled),
        vibey: Boolean((await json(await guestVibeyGET(req(`/api/guest/vibey?cafe_id=${BIZ}`)))).body?.enabled),
        rooms: (await json(await showcaseGET(req(`/api/guest/stay/showcase?venue=${BIZ}`)))).body?.types?.length ?? 0,
      };
      if (c.key === 'yewe') baseline = guest;
      const has = (f: string) => c.features.includes(f as any);
      const expectGuest = { events: has('events') ? baseline!.events : 0, offers: has('offers') ? baseline!.offers : 0, delivery: has('delivery') && baseline!.delivery, vibey: has('vibey') && baseline!.vibey, rooms: has('rooms') ? baseline!.rooms : 0 };
      check(`${c.label}: guests see events ${expectGuest.events}, offers ${expectGuest.offers}, delivery ${expectGuest.delivery}, Vibey ${expectGuest.vibey}, room types ${expectGuest.rooms}`,
        JSON.stringify(guest) === JSON.stringify(expectGuest), `got ${JSON.stringify(guest)}`);
      const hostVibey = (await json(await hostVibeyGET(req('/api/host/vibey')))).body;
      check(`${c.label}: owner's Vibey co-pilot ${has('vibey') ? 'available' : 'locked'}`, hostVibey?.planRequired === !has('vibey'), `planRequired ${hostVibey?.planRequired}`);

      const gates: string[] = [];
      for (const g of HOST_GATES) {
        const r = await json(await g.call());
        const ok = has(g.feature) ? r.status !== 402 : r.status === 402 && r.body?.code === 'plan_required';
        check(`${c.label}: ${g.name} ${has(g.feature) ? 'allowed' : 'needs an upgrade (402)'}`, ok, `HTTP ${r.status}`);
        gates.push(`${g.name}: ${r.status === 402 ? '🔒' : '✓'}`);
      }
      for (const g of GUEST_GATES.filter((x) => !has(x.feature))) {
        const r = await json(await g.call());
        check(`${c.label}: ${g.name} refused (402)`, r.status === 402, `HTTP ${r.status}`);
      }
      rows.push(`| ${c.label} | ${got.length === ALL.length ? 'everything' : got.join(', ')} | ₹${first.cost} (₹50 → ₹${left}) | ${guest.events} / ${guest.offers} / ${guest.delivery ? 'on' : 'off'} / ${guest.vibey ? 'on' : 'off'} / ${guest.rooms} | ${gates.join(' · ')} |`);
    }
  }, 300_000);

  it('a bill with too little credit becomes a due, never a blocked till', async () => {
    await setSub(CASES[0].sub);
    await setBalance(1);
    const r = await evaluateFeeGuard(BIZ, 'bill_generate', `QC-${RUN}-DUE`, db);
    const { data: due } = await db.from('venue_outstanding_bills').select('amount, status').eq('venue_id', BIZ).eq('reference_id', `QC-${RUN}-DUE`).maybeSingle();
    check('₹1 in the wallet: bill still settles, ₹3 recorded as a due', r.allowed && (await balance()) === 1 && Number(due?.amount) === 3, `due ₹${due?.amount ?? 'none'}`);
  });

  it('wallet rules: Vibey add-on only on M¹/M², no smaller plan mid-term', async () => {
    const wallet = (b: unknown) => walletPOST(req('/api/host/wallet', 'POST', b));
    for (const c of ['yewe', 'rhodium']) {
      await setSub(CASES.find((x) => x.key === c)!.sub);
      const r = await json(await wallet({ action: 'submit_topup_request', planTier: 'vibey_addon', utrNumber: `${RUN}A`.slice(0, 22) }));
      check(`Vibey add-on refused on ${c === 'yewe' ? 'You earn, we earn' : 'Rhodium'} (already included)`, r.status === 409, `HTTP ${r.status}`);
    }
    await setSub(CASES.find((x) => x.key === 'm2')!.sub);
    const down = await json(await wallet({ action: 'submit_topup_request', requestType: 'plan_subscription', planTier: 'm1_pro', utrNumber: `${RUN}B`.slice(0, 22) }));
    check('M²-Pro mid-term: buying the smaller M¹-Pro waits for renewal', down.status === 409, `HTTP ${down.status}`);
  });

  it('approval: setup from the first top-up, plan purchase, early renewal, Vibey add-on', async () => {
    let n = 0;
    const file = async (amount: number, tier: string | null, type: 'wallet_topup' | 'plan_subscription', notes: string | null = null) => {
      n += 1;
      const { data, error } = await db.from('venue_topup_requests').insert({
        venue_id: BIZ, amount, utr_number: `${RUN}${n}`.slice(0, 22), payment_method: 'upi_manual', requested_plan_tier: tier, request_type: type, status: 'pending', notes,
      }).select('id').single();
      if (error) throw new Error(`could not file the request: ${error.message}`);
      requestIds.push(data.id);
      return data.id as string;
    };
    const approve = async (id: string) => (await db.rpc('approve_topup_request', { p_request_id: id, p_admin_id: 'e2e-subscription-test' })).data;
    const drop = async (id: string) => { await db.from('venue_topup_requests').delete().eq('id', id); };
    const near = (iso: unknown, target: Date) => Math.abs(Date.parse(String(iso)) - target.getTime()) < 2 * 86_400_000;
    const plusMonths = (from: number, m: number) => { const d = new Date(from); d.setMonth(d.getMonth() + m); return d; };

    // You earn, we earn with the setup still owed: the first top-up pays it, the rest is credit.
    await setSub({ ...CASES[0].sub, setup_fee_paid_at: null }); await setBalance(0);
    const small = await file(599, null, 'wallet_topup', 'Includes the ₹599 one-time setup.');
    check('First top-up of ₹599 only (no credit left) is refused', (await approve(small))?.error === 'AMOUNT_BELOW_SETUP_FEE');
    await drop(small);
    const first = await approve(await file(1099, null, 'wallet_topup', 'Includes the ₹599 one-time setup.'));
    const s1 = await sub();
    check('First top-up ₹1,099 → ₹599 setup + ₹500 credit', first?.success && Number(first.credited_amount) === 500 && (await balance()) === 500 && Boolean(s1?.setup_fee_paid_at), JSON.stringify(first));
    const second = await approve(await file(300, null, 'wallet_topup'));
    check('Second top-up ₹300 → all ₹300 is credit (setup paid once)', second?.success && Number(second.credited_amount) === 300 && (await balance()) === 800);

    // A plan bought with the setup still owed must include it.
    await setSub({ ...CASES[0].sub, setup_fee_paid_at: null });
    const under = await file(14999, 'm2_pro', 'plan_subscription');
    check('M²-Pro paid without the setup (₹14,999) is refused', (await approve(under))?.error === 'AMOUNT_BELOW_PLAN_PRICE');
    await drop(under);
    const bought = await approve(await file(15598, 'm2_pro', 'plan_subscription'));
    const s2 = await sub();
    check('M²-Pro ₹15,598 (with setup) → plan runs 12 months, wallet untouched', bought?.success && s2?.plan_tier === 'm2_pro' && s2?.status === 'active' && near(s2?.expires_at, plusMonths(Date.now(), 12)) && (await balance()) === 800, `ends ${s2?.expires_at}`);

    // Renewing early adds the year onto the current end date.
    const end = at(100);
    await setSub({ plan_tier: 'm2_pro', status: 'active', expires_at: end, trial_ends_at: null });
    const renewed = await approve(await file(14999, 'm2_pro', 'plan_subscription'));
    const s3 = await sub();
    check('Early renewal of M²-Pro extends from its end date (no days lost)', renewed?.success && near(s3?.expires_at, plusMonths(Date.parse(end), 12)), `ends ${s3?.expires_at}`);

    // The Vibey add-on: a year of Vibey, plan untouched; buying again stacks another year.
    await setSub({ plan_tier: 'm1_pro', status: 'active', expires_at: at(200), trial_ends_at: null, vibey_until: null });
    const addonId = await file(7000, 'vibey_addon', 'plan_subscription');
    const addon = await approve(addonId);
    const s4 = await sub();
    check('Vibey add-on ₹7,000 → Vibey for 12 months, plan stays M¹-Pro', addon?.success && s4?.plan_tier === 'm1_pro' && near(s4?.vibey_until, plusMonths(Date.now(), 12)), `vibey until ${s4?.vibey_until}`);
    const again = await approve(addonId);
    check('Approving the same payment twice changes nothing', again?.idempotent === true && (await sub())?.vibey_until === s4?.vibey_until);
    await approve(await file(7000, 'vibey_addon', 'plan_subscription'));
    check('A second add-on stacks another year', near((await sub())?.vibey_until, plusMonths(Date.parse(String(s4?.vibey_until)), 12)));
    const e = await loadEntitlements(BIZ, db);
    check('M¹-Pro + add-on: Vibey on, events still locked', e.features.has('vibey') && !e.features.has('events'));
  }, 120_000);
});

function writeReport() {
  const passed = checks.filter((c) => c.ok).length;
  const lines = ['# Subscription plans: live stress test on Bombay Rasoi', '', `Run ${RUN} · ${new Date().toISOString()} · venue ${BIZ.slice(0, 8)}…, put back afterwards`, '',
    '## What each plan unlocks, charges and shows', '', '| Plan state | Unlocks | Bill fee | Guests see (events / offers / delivery / Vibey / room types) | Owner actions |', '|---|---|---|---|---|', ...rows, '',
    '## Every check', '', '| Result | Check | Detail |', '|:---:|---|---|', ...checks.map((c) => `| ${c.ok ? 'PASS' : 'FAIL'} | ${c.what} | ${c.detail ?? ''} |`), '',
    `**${passed} / ${checks.length} checks passed.**`, ''];
  try { writeFileSync('docs/e2e-subscription-report.md', lines.join('\n')); } catch { /* printed below */ }
  console.log(lines.join('\n'));
}
