import { describe, it, expect, vi } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';

// Saving a bill at the till. A table bill carries a `settlement` block and is saved and settled in one request; the
// order keeps its own status until the settlement closes it, and a second tap (same order id) never adds a second order.
vi.mock('@/lib/services/billing/gst-policy', () => ({
  loadGstStatus: async () => ({ canCharge: true }),
  stripTax: (t: any) => ({ grandTotal: t.grandTotal - t.taxAmount, taxAmount: 0 }),
}));
vi.mock('@/lib/services/orders/recipe-deduction.service', () => ({ deductRecipeInventoryForOrder: async () => {} }));
vi.mock('@/lib/store/active-order-store', () => ({ saveActiveOrder: () => {} }));

import { createHostOrder } from '@/lib/services/orders/create-order.service';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const TABLE = 'cccccccc-1111-4222-8333-444444444444';
const ORDER = 'bbbbbbbb-1111-4222-8333-444444444444';

const bill = (extra: Record<string, unknown> = {}) => ({
  id: ORDER, tableId: TABLE, tableNumber: 'T-05', items: [{ id: 'x', name: 'Aloo Gobhi', price: 180, qty: 1 }],
  subtotal: 180, grandTotal: 180, paymentMethod: 'CASH', ...extra,
});

describe('createHostOrder at the till', () => {
  it('leaves an open table order open when the same request settles it', async () => {
    const db = createFakeSupabase({ orders: [{ id: ORDER, business_id: BIZ, status: 'open', table_number: 'T-05' }], restaurant_tables: [] });
    const order = await createHostOrder(db, BIZ, bill({ settlement: { session_id: null, credit_cashback: true } }));
    expect(order.status).toBe('open');
    expect(db.tables.orders).toHaveLength(1);
    expect(db.tables.orders[0].grand_total).toBe(180);
  });

  it('marks a counter bill settled straight away', async () => {
    const db = createFakeSupabase({ orders: [], restaurant_tables: [] });
    const order = await createHostOrder(db, BIZ, { ...bill(), tableId: null, tableNumber: 'Takeaway / Counter' });
    expect(order.status).toBe('SETTLED');
  });

  it('a second tap with the same order id updates the order instead of adding another', async () => {
    const db = createFakeSupabase({ orders: [], restaurant_tables: [] });
    const body = bill({ settlement: { session_id: null } });
    await createHostOrder(db, BIZ, body);
    await createHostOrder(db, BIZ, body);
    expect(db.tables.orders).toHaveLength(1);
    expect(db.tables.orders[0].id).toBe(ORDER);
  });

  it('does not let a bill overwrite another venue\'s order that has the same id', async () => {
    const db = createFakeSupabase({ orders: [{ id: ORDER, business_id: 'ffffffff-1111-4222-8333-444444444444', status: 'open', grand_total: 999 }], restaurant_tables: [] }, { unique: { orders: [['id']] } });
    await expect(createHostOrder(db, BIZ, bill({ settlement: {} }))).rejects.toBeTruthy();
    expect(db.tables.orders[0].grand_total).toBe(999);
  });
});
