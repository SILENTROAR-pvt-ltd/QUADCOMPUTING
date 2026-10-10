import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { buildPurchaseMessage, normalizePhone, poReference, whatsappUrl, displayPhone } from '@/lib/services/inventory/purchase-message';
import { parseLines, parseNewOrder, parseVendor } from '@/lib/services/inventory/purchase-input';
import { cancelOrder, receiveOrder } from '@/lib/services/inventory/purchase-order.service';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const MILK = '0b0f2f1e-2d3c-4b5a-8c7d-9e0f1a2b3c4d';
const RICE = '1b0f2f1e-2d3c-4b5a-8c7d-9e0f1a2b3c4d';
const PO = 'bbbbbbbb-1111-4222-8333-444444444444';
const milk = { item_id: MILK, name: 'Milk', unit: 'ltr', quantity: 22.5, unit_cost: 64 };

describe('WhatsApp numbers', () => {
  it('turns the ways people type Indian numbers into one WhatsApp can open', () => {
    for (const raw of ['98765 43210', '+91 98765-43210', '09876543210', '919876543210', '0091 98765 43210']) {
      expect(normalizePhone(raw)).toBe('919876543210');
    }
    expect(normalizePhone('12345')).toBeNull();
    expect(displayPhone('919876543210')).toBe('+91 98765 43210');
  });
});

describe('The order message', () => {
  const text = buildPurchaseMessage({ venueName: 'Bombay Rasoi', vendorName: 'Sharma Dairy', reference: 'PO-091026-143205', lines: [milk], note: 'Before 10 am' });

  it('lists each item with quantity and unit, the venue, the reference and the note', () => {
    expect(text).toContain('Hello Sharma Dairy,');
    expect(text).toContain('for Bombay Rasoi (order PO-091026-143205)');
    expect(text).toContain('1. Milk - 22.5 ltr');
    expect(text).toContain('Note: Before 10 am');
    expect(text).not.toContain('\n\n\n');
  });

  it('opens the vendor chat with the text encoded, or the contact picker without a number', () => {
    expect(whatsappUrl('919876543210', text)).toMatch(/^https:\/\/wa\.me\/919876543210\?text=Hello%20Sharma%20Dairy%2C%0A/);
    expect(whatsappUrl(null, 'hi')).toBe('https://wa.me/?text=hi');
  });

  it('dates the reference in India time', () => {
    expect(poReference(new Date('2026-10-09T09:02:05Z'))).toBe('PO-091026-143205');
  });
});

describe('Order input', () => {
  it('needs a vendor name and a valid number if one is given', () => {
    expect(parseVendor({ name: 'Metro', phone: '98765 43210' })).toMatchObject({ ok: true, value: { phone: '919876543210' } });
    expect(parseVendor({ name: 'Metro', phone: '123' })).toMatchObject({ ok: false });
    expect(parseVendor({ name: ' ' })).toMatchObject({ ok: false });
  });

  it('refuses empty orders, zero quantities and the same item twice', () => {
    expect(parseLines([])).toMatchObject({ ok: false });
    expect(parseLines([{ ...milk, quantity: 0 }])).toMatchObject({ ok: false });
    expect(parseLines([milk, milk])).toMatchObject({ ok: false });
    expect(parseNewOrder({ vendor_name: 'Metro', reference: 'po-1', lines: [milk] })).toMatchObject({ ok: true, value: { reference: 'PO-1' } });
  });
});

describe('Receiving a delivery', () => {
  const seed = (status = 'sent') => createFakeSupabase(
    { purchase_orders: [{ id: PO, business_id: BIZ, reference: 'PO-1', vendor_name: 'Metro', status, lines: [milk, { ...milk, item_id: RICE, name: 'Rice' }], note: null }] },
    { rpc: { record_inventory_movement: (a: any) => ({ item_id: a.p_item_id, change: a.p_quantity, stock_after: a.p_quantity + 5, cost_per_unit: a.p_unit_cost }) } },
  );

  it('books what arrived as purchases against the order, once', async () => {
    const db = seed();
    const r = await receiveOrder(db, BIZ, PO, [{ ...milk, quantity: 20, unit_cost: 62 }]);
    expect(r).toMatchObject({ ok: true, value: { received: 1, failed: [] } });
    expect(db.calls.rpc).toEqual([{ name: 'record_inventory_movement', args: expect.objectContaining({ p_type: 'PURCHASE', p_quantity: 20, p_unit_cost: 62, p_supplier: 'Metro', p_reference: 'PO-1' }) }]);
    expect(db.tables.purchase_orders[0]).toMatchObject({ status: 'received' });
    expect(db.tables.purchase_orders[0].lines.map((l: any) => l.received_quantity)).toEqual([20, 0]);

    expect(await receiveOrder(db, BIZ, PO, [milk])).toMatchObject({ ok: false, status: 409 });
    expect(db.calls.rpc).toHaveLength(1);
  });

  it('only cancels an open order', async () => {
    expect(await cancelOrder(seed('received'), BIZ, PO)).toMatchObject({ ok: false, status: 409 });
    const db = seed();
    expect(await cancelOrder(db, BIZ, PO)).toMatchObject({ ok: true });
    expect(db.tables.purchase_orders[0].status).toBe('cancelled');
  });
});
