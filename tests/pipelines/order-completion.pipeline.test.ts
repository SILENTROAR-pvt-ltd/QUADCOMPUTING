import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';

const ctx = vi.hoisted(() => ({ db: null as any }));
const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const OTHER_BIZ = 'cccccccc-1111-4222-8333-444444444444';
const ITEM = '0b0f2f1e-2d3c-4b5a-8c7d-9e0f1a2b3c4d';
const RAW = 'dddddddd-1111-4222-8333-444444444444';
const ORDER = 'eeeeeeee-1111-4222-8333-444444444444';

vi.mock('@/lib/auth/guards', () => ({
  requireHost: async () => ({ error: null, businessId: BIZ, supabase: ctx.db, user: { id: 'host-1' } }),
  adminDb: () => ctx.db,
}));
const feeSpy = vi.hoisted(() => vi.fn(async () => ({ allowed: true, cost: 3 })));
vi.mock('@/lib/services/wallet/fee-guard.service', () => ({
  evaluateFeeGuard: feeSpy,
  invoiceRefFromId: (id: string) => `QC-TEST-${id.slice(0, 8)}`,
}));

import { POST } from '@/app/api/host/orders/update-status/route';

const setStatus = (orderId: string, status: string) =>
  POST(new Request('http://localhost/api/host/orders/update-status', { method: 'POST', body: JSON.stringify({ orderId, status }) }));

function seed(rpc: (args: any) => any = () => ({ success: true })) {
  return createFakeSupabase(
    {
      orders: [
        { id: ORDER, business_id: BIZ, status: 'PREPARING', items: [{ id: ITEM, quantity: 2 }] },
        { id: 'ffffffff-1111-4222-8333-444444444444', business_id: OTHER_BIZ, status: 'PREPARING', items: [] },
      ],
      recipe_ingredients: [{ business_id: BIZ, catalog_item_id: ITEM, raw_item_id: RAW, quantity_required: 0.25 }],
    },
    { rpc: { deduct_recipe_inventory_for_order: rpc } }
  );
}

describe('Order completion pipeline (inventory deduction + platform fee)', () => {
  beforeEach(() => {
    feeSpy.mockClear();
    ctx.db = seed();
  });

  it('completing an order deducts recipe stock and charges the fee once', async () => {
    const res = await setStatus(ORDER, 'COMPLETED');
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.depletion_errors).toBe(0);
    expect(ctx.db.tables.orders[0].status).toBe('COMPLETED');
    // The once-per-order database deduction does the recipe maths (0.25 x 2 of the raw item).
    expect(ctx.db.calls.rpc).toEqual([{ name: 'deduct_recipe_inventory_for_order', args: { p_order_id: ORDER } }]);
    expect(feeSpy).toHaveBeenCalledTimes(1);
  });

  it('two simultaneous completions deduct stock and charge exactly once (no double deduction)', async () => {
    const [a, b] = await Promise.all([setStatus(ORDER, 'COMPLETED'), setStatus(ORDER, 'COMPLETED')]);

    expect([a.status, b.status]).toEqual([200, 200]);
    expect(ctx.db.calls.rpc).toHaveLength(1);
    expect(feeSpy).toHaveBeenCalledTimes(1);
  });

  it('re-sending COMPLETED, or moving COMPLETED to SERVED, never deducts again', async () => {
    await setStatus(ORDER, 'COMPLETED');
    await setStatus(ORDER, 'COMPLETED');
    await setStatus(ORDER, 'SERVED');

    expect(ctx.db.calls.rpc).toHaveLength(1);
    expect(feeSpy).toHaveBeenCalledTimes(1);
    expect(ctx.db.tables.orders[0].status).toBe('SERVED');
  });

  it('non-final statuses do not touch stock or fees', async () => {
    await setStatus(ORDER, 'READY');
    expect(ctx.db.calls.rpc).toHaveLength(0);
    expect(feeSpy).not.toHaveBeenCalled();
  });

  it('reports a failed stock deduction instead of claiming success', async () => {
    ctx.db = seed(() => { throw new Error('stock row locked'); });
    const res = await setStatus(ORDER, 'COMPLETED');
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.depletion_errors).toBe(1);
    expect(json.message).toMatch(/could not be deducted/i);
  });

  it("cannot change another venue's order", async () => {
    const res = await setStatus('ffffffff-1111-4222-8333-444444444444', 'COMPLETED');
    expect(res.status).toBe(404);
    expect(ctx.db.tables.orders[1].status).toBe('PREPARING');
  });

  it('rejects malformed status values', async () => {
    expect((await setStatus(ORDER, 'DROP TABLE;--')).status).toBe(400);
  });
});
