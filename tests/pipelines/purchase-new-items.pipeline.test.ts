import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { parseNewOrder } from '@/lib/services/inventory/purchase-input';
import { createOrder, receiveOrder, recordPurchaseNow } from '@/lib/services/inventory/purchase-order.service';

// An order can carry items that are not in raw inventory yet. They are created when the delivery is received (not when
// the order is sent), exactly once, and a name already in stock is reused instead of becoming a second card.
const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const PANEER = 'bbbbbbbb-1111-4222-8333-444444444444';
const SAFFRON = 'cccccccc-1111-4222-8333-444444444444';

function db() {
  const stock: Record<string, number> = { [PANEER]: 2 };
  const fake = createFakeSupabase(
    {
      raw_inventory_items: [{ id: PANEER, business_id: BIZ, item_name: 'Paneer', unit: 'kg', category: 'Dairy', supplier_name: null }],
      purchase_orders: [],
    },
    {
      unique: { purchase_orders: [['reference']] },
      rpc: {
        record_inventory_movement: (a: any) => {
          stock[a.p_item_id] = (stock[a.p_item_id] || 0) + a.p_quantity;
          return { item_id: a.p_item_id, change: a.p_quantity, stock_after: stock[a.p_item_id], cost_per_unit: a.p_unit_cost };
        },
      },
    },
  );
  return { fake, stock };
}

const order = (lines: any[], extra: Record<string, unknown> = {}) => {
  const parsed = parseNewOrder({ reference: 'PO-151026-101010', vendor_name: 'Sharma Dairy', lines, ...extra });
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
};
const paneer = { item_id: PANEER, name: 'Paneer', unit: 'kg', quantity: 5, unit_cost: 320 };
const saffron = { item_id: SAFFRON, name: 'Saffron', unit: 'grams', quantity: 10, unit_cost: 900, is_new: true, category: 'Spices' };

describe('purchase orders with new items', () => {
  it('keeps a new item out of raw inventory until the delivery is received', async () => {
    const { fake } = db();
    const r = await createOrder(fake, BIZ, order([paneer, saffron]));
    expect(r.ok).toBe(true);
    expect(fake.tables.raw_inventory_items).toHaveLength(1);
    expect(fake.tables.purchase_orders[0].lines[1]).toMatchObject({ name: 'Saffron', is_new: true, category: 'Spices' });
  });

  it('adds the new item to raw inventory on receipt, with the stock, rate and supplier', async () => {
    const { fake, stock } = db();
    const created = await createOrder(fake, BIZ, order([paneer, saffron]));
    if (!created.ok) throw new Error('not created');
    // The request cannot claim an item is new or old: the stored order decides.
    const r = await receiveOrder(fake, BIZ, created.value.id, [paneer, { ...saffron, is_new: undefined }] as any);
    expect(r.ok && r.value.received).toBe(2);
    const made = fake.tables.raw_inventory_items.find((i: any) => i.id === SAFFRON);
    expect(made).toMatchObject({ item_name: 'Saffron', unit: 'grams', category: 'Spices', supplier_name: 'Sharma Dairy', business_id: BIZ });
    expect(stock[SAFFRON]).toBe(10);
    expect(stock[PANEER]).toBe(7);
  });

  it('receiving twice does not add the goods or the item twice', async () => {
    const { fake, stock } = db();
    const created = await createOrder(fake, BIZ, order([saffron]));
    if (!created.ok) throw new Error('not created');
    await receiveOrder(fake, BIZ, created.value.id, [saffron]);
    const again = await receiveOrder(fake, BIZ, created.value.id, [saffron]);
    expect(again.ok).toBe(false);
    expect(fake.tables.raw_inventory_items.filter((i: any) => i.item_name === 'Saffron')).toHaveLength(1);
    expect(stock[SAFFRON]).toBe(10);
  });

  it('refuses a new item whose name is already in stock when the order is sent', async () => {
    const { fake } = db();
    const r = await createOrder(fake, BIZ, order([{ ...saffron, item_id: 'dddddddd-1111-4222-8333-444444444444', name: ' paneer ' }]));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.status).toBe(409);
  });

  it('reuses the item that appeared by that name before the delivery arrived', async () => {
    const { fake, stock } = db();
    const created = await createOrder(fake, BIZ, order([saffron]));
    if (!created.ok) throw new Error('not created');
    fake.tables.raw_inventory_items.push({ id: 'eeeeeeee-1111-4222-8333-444444444444', business_id: BIZ, item_name: 'Saffron', unit: 'grams' });
    await receiveOrder(fake, BIZ, created.value.id, [saffron]);
    expect(fake.tables.raw_inventory_items.filter((i: any) => i.item_name === 'Saffron')).toHaveLength(1);
    expect(stock['eeeeeeee-1111-4222-8333-444444444444']).toBe(10);
  });

  it('a purchase already in hand is saved and booked in one step, with no vendor needed', async () => {
    const { fake, stock } = db();
    const parsed = parseNewOrder({ reference: 'PO-151026-111111', lines: [paneer, saffron], receive_now: true });
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.value.vendor_name).toBe('Market purchase');
    const r = await recordPurchaseNow(fake, BIZ, parsed.value);
    expect(r.ok && r.value.received).toBe(2);
    expect(stock[SAFFRON]).toBe(10);
    expect(fake.tables.purchase_orders[0].status).toBe('received');
    // A market purchase does not become the item's supplier.
    expect(fake.tables.raw_inventory_items.find((i: any) => i.id === SAFFRON)?.supplier_name).toBeNull();
    expect(fake.tables.raw_inventory_items.find((i: any) => i.id === PANEER)?.supplier_name).toBeNull();
  });

  it('an order to send still needs a vendor, and an item to receive now needs its rate', () => {
    expect(parseNewOrder({ reference: 'PO-1', lines: [paneer] })).toMatchObject({ ok: false, error: 'Choose a vendor.' });
    expect(parseNewOrder({ reference: 'PO-1', receive_now: true, lines: [{ item_id: PANEER, name: 'Paneer', unit: 'kg', quantity: 1 }] }).ok).toBe(false);
  });
});
