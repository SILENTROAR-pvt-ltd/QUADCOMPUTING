import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { parseTopup, setupInNote } from '@/lib/services/wallet/topup-input';
import { planState } from '@/lib/services/wallet/subscription-state';
import { describeLedger } from '@/components/host/wallet/ledger-format';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const DAY = 86_400_000;
const ctx = vi.hoisted(() => ({ db: null as any }));
vi.mock('@/lib/supabase/admin', () => ({ adminDb: () => ctx.db }));
vi.mock('@/lib/auth/guards', () => ({
  requireHost: async () => ({ error: null, businessId: BIZ, supabase: ctx.db, user: { id: 'host-1' } }),
  requireAdmin: async () => ({ error: null, adminId: 'admin-uid-1', supabase: ctx.db }),
}));
import { POST as walletPOST } from '@/app/api/host/wallet/route';
import { POST as adminPOST } from '@/app/api/admin/topup-requests/route';
import { evaluateFeeGuard } from '@/lib/services/wallet/fee-guard.service';

const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();
const post = (url: string, body: any) => new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const wallet = (body: any) => walletPOST(post('http://x/api/host/wallet', body));
const seed = (sub: any = {}, extra: any = {}, rpc: any = {}) => {
  ctx.db = createFakeSupabase({
    venue_subscriptions: [{ id: 's1', venue_id: BIZ, plan_tier: 'pay_as_you_go', status: 'active', ...sub }],
    venue_wallets: [{ id: 'w1', venue_id: BIZ, balance: 200 }],
    venue_topup_requests: [],
    venue_outstanding_bills: [],
    ...extra,
  }, { rpc });
};

describe('Filing a payment', () => {
  it('prices a plan on the server, whatever amount the browser sends', () => {
    const r = parseTopup({ requestType: 'plan_subscription', planTier: 'rhodium_annual', amount: 1, utrNumber: '4278 1903 4521' }, { setup_fee_paid_at: '2026-10-01T00:00:00Z' });
    expect(r).toEqual({ ok: true, value: expect.objectContaining({ amount: 48999, requestedPlanTier: 'rhodium_annual', utrNumber: '427819034521' }) });
    expect(parseTopup({ requestType: 'plan_subscription', planTier: 'free_forever', utrNumber: '427819034521' }).ok).toBe(false);
    // The earlier tiers can no longer be bought.
    expect(parseTopup({ requestType: 'plan_subscription', planTier: '14k_9m', utrNumber: '427819034521' }).ok).toBe(false);
  });

  it('adds the one-time ₹599 setup to any plan until it has been paid', () => {
    const body = { requestType: 'plan_subscription', planTier: 'm1_pro', utrNumber: '427819034521' };
    expect(parseTopup(body, null)).toMatchObject({ ok: true, value: { amount: 9598 } });
    expect(parseTopup(body, { setup_fee_paid_at: '2026-10-01T00:00:00Z' })).toMatchObject({ ok: true, value: { amount: 8999 } });
    expect(parseTopup({ ...body, planTier: 'rhodium_annual' }, null)).toMatchObject({ ok: true, value: { amount: 49598 } });
  });

  it('takes the Pay as you go setup out of the first top-up, which must cover it', () => {
    const owed = { setup_fee_paid_at: null };
    const small = parseTopup({ amount: 500, utrNumber: '427819034521' }, owed);
    expect(small).toEqual({ ok: false, error: 'Your first top-up includes the one-time ₹599 setup: top up at least ₹699.' });
    const first = parseTopup({ amount: 1000, utrNumber: '427819034521' }, owed);
    expect(first).toMatchObject({ ok: true, value: { amount: 1000, requestType: 'wallet_topup' } });
    expect(setupInNote(first.ok && first.value.notes)).toBe(599);
    // Paid (or exempt), or before the migration: an ordinary top-up.
    expect(parseTopup({ amount: 500, utrNumber: '427819034521' }, { setup_fee_paid_at: '2026-10-01T00:00:00Z' })).toMatchObject({ ok: true, value: { notes: null } });
    expect(parseTopup({ amount: 500, utrNumber: '427819034521' }, {})).toMatchObject({ ok: true });
  });

  it('bounds top-ups and needs a real UTR', () => {
    expect(parseTopup({ amount: 50, utrNumber: '427819034521' }).ok).toBe(false);
    expect(parseTopup({ amount: 500000, utrNumber: '427819034521' }).ok).toBe(false);
    expect(parseTopup({ amount: 500, utrNumber: 'abc' }).ok).toBe(false);
    expect(parseTopup({ amount: 500, utrNumber: '427819034521' })).toMatchObject({ ok: true, value: { amount: 500, requestType: 'wallet_topup' } });
  });

  it('stores the plan price and allows one pending payment at a time', async () => {
    seed();
    const res = await wallet({ action: 'submit_topup_request', requestType: 'plan_subscription', planTier: 'm2_pro', amount: 10, utrNumber: '427819034521' });
    expect(res.status).toBe(200);
    // The seeded row has no setup_fee_paid_at, so the ₹599 setup is added.
    expect(ctx.db.tables.venue_topup_requests[0]).toMatchObject({ venue_id: BIZ, amount: 15598, status: 'pending', request_type: 'plan_subscription', requested_plan_tier: 'm2_pro' });
    const again = await wallet({ action: 'submit_topup_request', amount: 500, utrNumber: '427819034599' });
    expect(again.status).toBe(409);
    expect((await again.json()).error).toMatch(/already being verified/);
  });

  it('never shows a database error to the venue', async () => {
    ctx.db = createFakeSupabase({ venue_topup_requests: [] }, { failOn: { 'venue_topup_requests.insert': () => true } });
    const res = await wallet({ action: 'submit_topup_request', amount: 500, utrNumber: '427819034521' });
    const json = await res.json();
    expect(json.error).toBe('Could not record your payment request. Please try again.');
    expect(JSON.stringify(json)).not.toMatch(/forced failure|venue_topup_requests/);
  });
});

describe('Plans', () => {
  it('cannot be switched on without paying', async () => {
    seed();
    const res = await wallet({ action: 'select_plan', planTier: 'rhodium_annual' });
    expect(res.status).toBe(403);
    expect(ctx.db.tables.venue_subscriptions[0].plan_tier).toBe('pay_as_you_go');
  });

  it('waive fees only until the end date, even if the row still says active', () => {
    expect(planState({ plan_tier: 'm2_pro', status: 'active', expires_at: iso(100) })).toMatchObject({ phase: 'active', feesWaived: true, daysLeft: 100 });
    expect(planState({ plan_tier: 'm2_pro', status: 'active', expires_at: iso(5) })).toMatchObject({ phase: 'expiring', feesWaived: true });
    // A paid plan gets a grace week after its end date; a trial does not.
    expect(planState({ plan_tier: 'm2_pro', status: 'active', expires_at: iso(-1) })).toMatchObject({ phase: 'grace', feesWaived: true, daysLeft: 6 });
    expect(planState({ plan_tier: 'm2_pro', status: 'active', expires_at: iso(-8) })).toMatchObject({ phase: 'expired', feesWaived: false });
    expect(planState({ plan_tier: 'm1_pro', status: 'trial', trial_ends_at: iso(-1) })).toMatchObject({ phase: 'expired', feesWaived: false });
    expect(planState({ plan_tier: 'm2_pro', status: 'active' })).toMatchObject({ phase: 'expired', feesWaived: false });
    expect(planState({ plan_tier: 'm1_pro', status: 'trial', trial_ends_at: iso(12) })).toMatchObject({ phase: 'expiring', feesWaived: true, onTrial: true });
    expect(planState({ plan_tier: 'pay_as_you_go', status: 'active' })).toMatchObject({ phase: 'payg', feesWaived: false });
    expect(planState({ plan_tier: 'rhodium_ppb', status: 'active' })).toMatchObject({ phase: 'payg', feesWaived: false });
  });

  it('starts the free month from Wallet once, and lets the venue end it early', async () => {
    seed({ trial_used_at: null });
    const res = await wallet({ action: 'start_trial', planTier: 'm1_pro' });
    expect(res.status).toBe(200);
    expect(ctx.db.tables.venue_subscriptions[0]).toMatchObject({ plan_tier: 'm1_pro', status: 'trial' });
    expect((await wallet({ action: 'start_trial', planTier: 'm2_pro' })).status).toBe(409);
    expect((await wallet({ action: 'select_plan', planTier: 'pay_as_you_go' })).status).toBe(200);
    expect(ctx.db.tables.venue_subscriptions[0]).toMatchObject({ plan_tier: 'pay_as_you_go', trial_ends_at: null });
    expect(ctx.db.tables.venue_subscriptions[0].trial_used_at).toBeTruthy();
  });

  it('sells the Vibey add-on at its price, to M¹-Pro and M²-Pro venues only', async () => {
    expect(parseTopup({ planTier: 'vibey_addon', amount: 1, utrNumber: '427819034521' })).toMatchObject({ ok: true, value: { amount: 7000, requestedPlanTier: 'vibey_addon' } });
    seed({ plan_tier: 'm1_pro', status: 'active', expires_at: iso(200) });
    expect((await wallet({ action: 'submit_topup_request', planTier: 'vibey_addon', amount: 1, utrNumber: '427819034521' })).status).toBe(200);
    expect(ctx.db.tables.venue_topup_requests[0]).toMatchObject({ amount: 7000, request_type: 'plan_subscription', requested_plan_tier: 'vibey_addon' });

    seed({ plan_tier: 'pay_as_you_go', status: 'active' });
    const no = await wallet({ action: 'submit_topup_request', planTier: 'vibey_addon', utrNumber: '427819034522' });
    expect(no.status).toBe(409);
    expect((await no.json()).error).toMatch(/already included in You earn, we earn/);
  });

  it('lets a venue in its grace week pick a smaller plan or go per bill', async () => {
    seed({ plan_tier: 'm2_pro', status: 'active', expires_at: iso(-2) });
    expect((await wallet({ action: 'submit_topup_request', requestType: 'plan_subscription', planTier: 'm1_pro', utrNumber: '427819034521' })).status).toBe(200);
  });

  it('lets a venue upgrade mid-plan but keeps a smaller plan for the renewal', async () => {
    seed({ plan_tier: 'm2_pro', status: 'active', expires_at: iso(200) });
    const down = await wallet({ action: 'submit_topup_request', requestType: 'plan_subscription', planTier: 'm1_pro', utrNumber: '427819034521' });
    expect(down.status).toBe(409);
    expect((await down.json()).error).toMatch(/smaller plan can start from your renewal/);
    const up = await wallet({ action: 'submit_topup_request', requestType: 'plan_subscription', planTier: 'rhodium_annual', utrNumber: '427819034522' });
    expect(up.status).toBe(200);
  });

  it('keeps a paid-up plan, and moves an ended one to pay-as-you-go', async () => {
    seed({ plan_tier: 'm1_pro', status: 'active', expires_at: iso(30) });
    expect((await wallet({ action: 'select_plan', planTier: 'pay_as_you_go' })).status).toBe(409);
    expect(ctx.db.tables.venue_subscriptions[0].plan_tier).toBe('m1_pro');

    seed({ plan_tier: 'm1_pro', status: 'active', expires_at: iso(-2) });
    expect((await wallet({ action: 'select_plan', planTier: 'pay_as_you_go' })).status).toBe(200);
    expect(ctx.db.tables.venue_subscriptions[0]).toMatchObject({ plan_tier: 'pay_as_you_go', expires_at: null });
  });
});

describe('Platform fees', () => {
  beforeEach(() => { vi.spyOn(console, 'log').mockImplementation(() => {}); });
  const deduct = { deduct_venue_wallet_credits: (a: any) => ({ success: true, remaining_balance: 200 - a.p_amount }) };

  it('are free on a running plan, trial or grace week and charged once it has ended', async () => {
    seed({ plan_tier: 'm2_pro', status: 'active', expires_at: iso(60) }, {}, deduct);
    expect((await evaluateFeeGuard(BIZ, 'bill_generate', 'QC-2026-AAAA', ctx.db)).cost).toBe(0);
    seed({ plan_tier: 'm1_pro', status: 'trial', trial_ends_at: iso(10) }, {}, deduct);
    expect((await evaluateFeeGuard(BIZ, 'bill_generate', 'QC-2026-ABAB', ctx.db)).cost).toBe(0);
    seed({ plan_tier: 'm2_pro', status: 'active', expires_at: iso(-2) }, {}, deduct);
    expect((await evaluateFeeGuard(BIZ, 'bill_generate', 'QC-2026-ACAC', ctx.db)).cost).toBe(0);

    seed({ plan_tier: 'm2_pro', status: 'active', expires_at: iso(-8) }, {}, deduct);
    const res = await evaluateFeeGuard(BIZ, 'bill_generate', 'QC-2026-BBBB', ctx.db);
    expect(res).toMatchObject({ cost: 3, remainingBalance: 197 });
  });

  it('bill as dues, never by overwriting the balance, when the locked deduction refuses', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    seed({}, {}, { deduct_venue_wallet_credits: () => ({ success: false, error: 'INSUFFICIENT_FUNDS' }) });
    const res = await evaluateFeeGuard(BIZ, 'bill_generate', 'QC-2026-CCCC', ctx.db);
    expect(res.allowed).toBe(true);
    expect(ctx.db.tables.venue_wallets[0].balance).toBe(200);
    expect(ctx.db.tables.venue_outstanding_bills).toEqual([expect.objectContaining({ reference_id: 'QC-2026-CCCC', amount: 3, status: 'unpaid' })]);
  });
});

describe('Review and statement', () => {
  it('records the signed-in admin as reviewer, not a name from the request', async () => {
    seed({}, {}, { approve_topup_request: (a: any) => ({ success: true, reviewer: a.p_admin_id }) });
    await adminPOST(post('http://x/api/admin/topup-requests', { requestId: 'r1', action: 'approve', adminId: 'someone-else' }));
    expect(ctx.db.calls.rpc[0].args).toEqual({ p_request_id: 'r1', p_admin_id: 'admin-uid-1' });
  });

  it('shows added credit as credit and a plan purchase as a plan', () => {
    const base = { id: '1', venue_id: BIZ, created_at: iso(0) } as any;
    expect(describeLedger({ ...base, action_type: 'WALLET_TOPUP', cost: 500, reference_id: 'TOPUP_x', metadata: { utr: '427819034521' } }))
      .toMatchObject({ kind: 'credit', amount: '+₹500.00', reference: 'UTR 427819034521' });
    expect(describeLedger({ ...base, action_type: 'PLAN_PURCHASE', cost: 0, metadata: { plan_tier: '12k_6m', amount: 12000 } }))
      .toMatchObject({ kind: 'plan', label: 'Growth plan purchased' });
    expect(describeLedger({ ...base, action_type: 'bill_generate', cost: 3 })).toMatchObject({ kind: 'debit', amount: '−₹3.00' });
    expect(describeLedger({ ...base, action_type: 'WALLET_TOPUP', cost: 401, metadata: { setup_fee: 599, amount: 1000 } }))
      .toMatchObject({ kind: 'credit', label: 'Credit added (₹599 setup taken)', amount: '+₹401.00' });
  });
});
