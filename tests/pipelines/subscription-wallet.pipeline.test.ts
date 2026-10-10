import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { parseTopup } from '@/lib/services/wallet/topup-input';
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
    const r = parseTopup({ requestType: 'plan_subscription', planTier: '14k_9m', amount: 1, utrNumber: '4278 1903 4521' });
    expect(r).toEqual({ ok: true, value: expect.objectContaining({ amount: 14000, requestedPlanTier: '14k_9m', utrNumber: '427819034521' }) });
    expect(parseTopup({ requestType: 'plan_subscription', planTier: 'free_forever', utrNumber: '427819034521' }).ok).toBe(false);
  });

  it('bounds top-ups and needs a real UTR', () => {
    expect(parseTopup({ amount: 50, utrNumber: '427819034521' }).ok).toBe(false);
    expect(parseTopup({ amount: 500000, utrNumber: '427819034521' }).ok).toBe(false);
    expect(parseTopup({ amount: 500, utrNumber: 'abc' }).ok).toBe(false);
    expect(parseTopup({ amount: 500, utrNumber: '427819034521' })).toMatchObject({ ok: true, value: { amount: 500, requestType: 'wallet_topup' } });
  });

  it('stores the plan price and allows one pending payment at a time', async () => {
    seed();
    const res = await wallet({ action: 'submit_topup_request', requestType: 'plan_subscription', planTier: '12k_6m', amount: 10, utrNumber: '427819034521' });
    expect(res.status).toBe(200);
    expect(ctx.db.tables.venue_topup_requests[0]).toMatchObject({ venue_id: BIZ, amount: 12000, status: 'pending', request_type: 'plan_subscription' });
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
    const res = await wallet({ action: 'select_plan', planTier: '14k_9m' });
    expect(res.status).toBe(403);
    expect(ctx.db.tables.venue_subscriptions[0].plan_tier).toBe('pay_as_you_go');
  });

  it('waive fees only until the end date, even if the row still says active', () => {
    expect(planState({ plan_tier: '12k_6m', status: 'active', expires_at: iso(100) })).toMatchObject({ phase: 'active', feesWaived: true, daysLeft: 100 });
    expect(planState({ plan_tier: '12k_6m', status: 'active', expires_at: iso(5) })).toMatchObject({ phase: 'expiring', feesWaived: true });
    expect(planState({ plan_tier: '12k_6m', status: 'active', expires_at: iso(-1) })).toMatchObject({ phase: 'expired', feesWaived: false });
    expect(planState({ plan_tier: '12k_6m', status: 'active' })).toMatchObject({ phase: 'expired', feesWaived: false });
    expect(planState({ plan_tier: 'pay_as_you_go', status: 'active' })).toMatchObject({ phase: 'payg', feesWaived: false });
  });

  it('keeps a paid-up plan, and moves an ended one to pay-as-you-go', async () => {
    seed({ plan_tier: '8k_2m', status: 'active', expires_at: iso(30) });
    expect((await wallet({ action: 'select_plan', planTier: 'pay_as_you_go' })).status).toBe(409);
    expect(ctx.db.tables.venue_subscriptions[0].plan_tier).toBe('8k_2m');

    seed({ plan_tier: '8k_2m', status: 'active', expires_at: iso(-2) });
    expect((await wallet({ action: 'select_plan', planTier: 'pay_as_you_go' })).status).toBe(200);
    expect(ctx.db.tables.venue_subscriptions[0]).toMatchObject({ plan_tier: 'pay_as_you_go', expires_at: null });
  });
});

describe('Platform fees', () => {
  beforeEach(() => { vi.spyOn(console, 'log').mockImplementation(() => {}); });
  const deduct = { deduct_venue_wallet_credits: (a: any) => ({ success: true, remaining_balance: 200 - a.p_amount }) };

  it('are free on a running plan and charged once it has ended', async () => {
    seed({ plan_tier: '12k_6m', status: 'active', expires_at: iso(60) }, {}, deduct);
    expect((await evaluateFeeGuard(BIZ, 'bill_generate', 'QC-2026-AAAA', ctx.db)).cost).toBe(0);

    seed({ plan_tier: '12k_6m', status: 'active', expires_at: iso(-1) }, {}, deduct);
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
  });
});
