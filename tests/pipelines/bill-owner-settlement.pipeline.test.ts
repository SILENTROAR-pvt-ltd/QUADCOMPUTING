import { describe, it, expect, vi } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';

// Settlement credits 7% of the whole bill. It may go to one signed-in guest only when they ordered every dish on
// it (order_items.guest_handle). The table's shared session handle and a handle sent by the POS are never trusted.
// The settlement SQL itself is stubbed; these tests cover who the server asks it to credit.
vi.mock('@/lib/services/billing/venue-guard.service', () => ({ checkVenueBillingGuard: async () => ({ allowed: true }) }));
vi.mock('@/lib/services/billing/gst-policy', () => ({
  loadGstStatus: async () => ({ canCharge: false }),
  stripTax: (t: any) => ({ grandTotal: t.grandTotal - t.taxAmount, taxAmount: 0 }),
}));
vi.mock('@/lib/services/inventory/recipe-deduction.service', () => ({ deductInventoryForOrder: async () => ({ success: true }) }));
vi.mock('@/lib/services/wallet/fee-guard.service', () => ({ evaluateFeeGuard: async () => ({ success: true, cost: 0 }) }));
vi.mock('@/lib/realtime/channels', () => ({ broadcastToGuestTable: async () => {} }));

import { settleAndVacateSession } from '@/lib/services/session/settle-session.service';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const ORDER = 'bbbbbbbb-1111-4222-8333-444444444444';
const SESSION = 'dddddddd-1111-4222-8333-444444444444';

function db(items: Array<{ guest_handle?: string | null }>, opts: { failItems?: boolean } = {}) {
  return createFakeSupabase(
    {
      businesses: [{ id: BIZ, business_name: 'Bombay Rasoi' }],
      orders: [{ id: ORDER, business_id: BIZ, session_id: SESSION, table_number: 'T-01', status: 'open', grand_total: 300, subtotal: 300, customer_name: 'Harshit', customer_phone: null }],
      // The shared session still carries a stale handle from before: it must not decide anything.
      dine_in_sessions: [{ id: SESSION, business_id: BIZ, table_number: 'T-01', status: 'bill_requested', guest_handle: '@reshav' }],
      order_items: items.map((it, i) => ({ id: `item-${i}`, order_id: ORDER, item_name: `Dish ${i}`, price: 100, quantity: 1, ...it })),
      restaurant_tables: [], bill_request_events: [],
    },
    {
      failOn: opts.failItems ? { 'order_items.select': () => true } : undefined,
      rpc: { execute_atomic_bill_settlement: () => ({ success: true, cashback_credited: 0 }) },
    }
  );
}

const settle = async (d: any, body: Record<string, unknown> = {}) => {
  await settleAndVacateSession({ business_id: BIZ, order_id: ORDER, session_id: SESSION, table_number: 'T-01', subtotal: 300, grand_total: 300, ...body }, d);
  return d.calls.rpc.find((c: any) => c.name === 'execute_atomic_bill_settlement').args;
};

describe('Cashback at settlement goes only to the guest who ordered the whole bill', () => {
  it('credits the one signed-in guest who ordered every dish, whatever the session or POS says', async () => {
    const args = await settle(db([{ guest_handle: '@realboss' }, { guest_handle: '@realboss' }, { guest_handle: '@realboss' }]), { guest_handle: '@reshav' });
    expect(args.p_guest_handle).toBe('@realboss');
    expect(args.p_guest_id).toBe('@realboss');
  });

  it('credits nobody when two signed-in guests ordered', async () => {
    const args = await settle(db([{ guest_handle: '@realboss' }, { guest_handle: '@reshav' }]));
    expect(args.p_guest_handle).toBeNull();
    expect(args.p_guest_id).toBeNull();
  });

  it('credits nobody when a guest without an account shared the bill with a signed-in guest', async () => {
    const args = await settle(db([{ guest_handle: '@realboss' }, { guest_handle: null }]));
    expect(args.p_guest_handle).toBeNull();
    expect(args.p_guest_id).toBeNull();
  });

  it('keeps the guest-without-account rule for a bill no signed-in guest ordered on', async () => {
    const args = await settle(db([{ guest_handle: null }, { guest_handle: null }]));
    expect(args.p_guest_handle).toBeNull();
    expect(args.p_guest_id).toBe('Harshit');
  });

  it('credits nobody when the host switched cashback off', async () => {
    const args = await settle(db([{ guest_handle: '@realboss' }]), { credit_cashback: false });
    expect(args.p_guest_handle).toBeNull();
    expect(args.p_guest_id).toBeNull();
  });

  it('credits nobody when who ordered cannot be read (also before the migration adds the column)', async () => {
    const args = await settle(db([{ guest_handle: '@realboss' }], { failItems: true }), { guest_handle: '@realboss' });
    expect(args.p_guest_handle).toBeNull();
    expect(args.p_guest_id).toBeNull();
  });
});
