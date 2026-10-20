import { describe, it, expect, vi } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';

// The settlement's guards on the server side of the till: a paid visit is not settled twice, and the cashback base is
// the bill the server priced, which the till may lower but never raise. The settlement SQL is stubbed; these cover
// what the server refuses before calling it and what it asks it to credit.
vi.mock('@/lib/services/billing/venue-guard.service', () => ({ checkVenueBillingGuard: async () => ({ allowed: true }) }));
vi.mock('@/lib/services/billing/gst-policy', () => ({
  loadGstStatus: async () => ({ canCharge: false }),
  stripTax: (t: any) => ({ grandTotal: t.grandTotal - t.taxAmount, taxAmount: 0 }),
}));
vi.mock('@/lib/services/inventory/recipe-deduction.service', () => ({ deductInventoryForOrder: async () => ({ success: true }) }));
vi.mock('@/lib/services/wallet/fee-guard.service', () => ({ evaluateFeeGuard: async () => ({ success: true, cost: 0 }) }));
vi.mock('@/lib/realtime/channels', () => ({ broadcastToGuestTable: async () => {} }));

import { settleAndVacateSession } from '@/lib/services/session/settle-session.service';
import { isFeeBearingStatus } from '@/lib/services/orders/bill-status.util';
import { isReplayOfSameOrder, REPLAY_WINDOW_MS } from '@/lib/services/guest-order/submit-order.service';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const ORDER = 'bbbbbbbb-1111-4222-8333-444444444444';
const NEW_ORDER = 'eeeeeeee-1111-4222-8333-444444444444';
const SESSION = 'dddddddd-1111-4222-8333-444444444444';

function db(opts: { sessionStatus?: string; orderStatus?: string; subtotal?: number } = {}) {
  return createFakeSupabase(
    {
      businesses: [{ id: BIZ, business_name: 'Bombay Rasoi' }],
      orders: [
        { id: ORDER, business_id: BIZ, session_id: SESSION, table_number: 'T-01', status: opts.orderStatus || 'open', grand_total: 300, subtotal: opts.subtotal ?? 300 },
        { id: NEW_ORDER, business_id: BIZ, session_id: SESSION, table_number: 'T-01', status: 'open', grand_total: 50, subtotal: 50 },
      ],
      dine_in_sessions: [{ id: SESSION, business_id: BIZ, table_number: 'T-01', status: opts.sessionStatus || 'bill_requested' }],
      order_items: [{ id: 'i1', order_id: ORDER, item_name: 'Dal', price: 300, quantity: 1, guest_handle: '@asha' }],
      restaurant_tables: [], bill_request_events: [],
    },
    { rpc: { execute_atomic_bill_settlement: () => ({ success: true, cashback_credited: 0 }) } },
  );
}

const settle = (d: any, body: Record<string, unknown>) =>
  settleAndVacateSession({ business_id: BIZ, session_id: SESSION, table_number: 'T-01', ...body }, d);

describe('a paid visit is settled once', () => {
  it('refuses a new order against a closed session with 409 SESSION_ALREADY_SETTLED, before any write', async () => {
    const d = db({ sessionStatus: 'closed', orderStatus: 'settled' });
    await expect(settle(d, { order_id: NEW_ORDER, subtotal: 50, grand_total: 50 })).rejects.toMatchObject({ status: 409, code: 'SESSION_ALREADY_SETTLED' });
    expect(d.calls.rpc).toHaveLength(0);
  });

  it('lets the settled order itself be replayed (the till retrying after a timeout)', async () => {
    const d = db({ sessionStatus: 'closed', orderStatus: 'settled' });
    await expect(settle(d, { order_id: ORDER, subtotal: 300, grand_total: 300 })).resolves.toMatchObject({ success: true });
    expect(d.calls.rpc.filter((c: any) => c.name === 'execute_atomic_bill_settlement')).toHaveLength(1);
  });
});

describe('the cashback base is the bill the server priced', () => {
  const rpcArgs = (d: any) => d.calls.rpc.find((c: any) => c.name === 'execute_atomic_bill_settlement').args;

  it('ignores a subtotal the till inflated above the stored bill', async () => {
    const d = db({ subtotal: 300 });
    await settle(d, { order_id: ORDER, subtotal: 10_000, grand_total: 300 });
    expect(rpcArgs(d).p_subtotal).toBe(300);
  });

  it('accepts a subtotal the till lowered (a voided dish)', async () => {
    const d = db({ subtotal: 300 });
    await settle(d, { order_id: ORDER, subtotal: 200, grand_total: 200 });
    expect(rpcArgs(d).p_subtotal).toBe(200);
  });

  it('uses the till subtotal only for a bill the server never priced', async () => {
    const d = db({ subtotal: 0 });
    await settle(d, { order_id: ORDER, subtotal: 120, grand_total: 120 });
    expect(rpcArgs(d).p_subtotal).toBe(120);
  });
});

describe('every closed bill saved at the till pays the per-bill fee', () => {
  it('counts SETTLED, COMPLETED, SERVED, PAID, BILLED and CLOSED, in any case, and never a cancelled or open bill', () => {
    for (const s of ['SETTLED', 'settled', 'COMPLETED', 'SERVED', 'PAID', 'paid', 'BILLED', 'CLOSED', 'closed']) expect(isFeeBearingStatus(s)).toBe(true);
    for (const s of ['open', 'OPEN', 'CANCELLED', 'cancelled', 'preparing', '', null, undefined]) expect(isFeeBearingStatus(s)).toBe(false);
  });
});

describe('a guest-order replay is the same order', () => {
  const now = Date.parse('2026-10-21T10:00:00Z');
  const placed = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();

  it('same table, within the window, whatever the table label form', () => {
    expect(isReplayOfSameOrder({ table_number: 'Table 4', created_at: placed(5) }, 'T-04', now)).toBe(true);
    expect(isReplayOfSameOrder({ table_number: 't-4', created_at: placed(5) }, '4', now)).toBe(true);
  });

  it('another table, another day, or no timestamp is not a replay', () => {
    expect(isReplayOfSameOrder({ table_number: 'T-09', created_at: placed(5) }, 'T-04', now)).toBe(false);
    expect(isReplayOfSameOrder({ table_number: 'T-04', created_at: new Date(now - REPLAY_WINDOW_MS - 1).toISOString() }, 'T-04', now)).toBe(false);
    expect(isReplayOfSameOrder({ table_number: 'T-04' }, 'T-04', now)).toBe(false);
  });
});
