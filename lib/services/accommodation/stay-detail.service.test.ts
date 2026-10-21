import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { loadStayDetail } from './stay-detail.service';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const OTHER = 'bbbbbbbb-1111-4222-8333-444444444444';
const ROOM = 'dddddddd-1111-4222-8333-444444444441';

const log = { id: 'log-1', business_id: BIZ, room_id: ROOM, guest_name: 'Asha Rao', guest_phone: '9876543210', id_type: 'Aadhaar Card', id_number: '1234', check_in_time: '2026-10-21T09:00:00.000Z', check_out_time: '2026-10-21T15:48:00.000Z', total_guests: 2, total_billed_amount: 4160, advance_paid: 3500, room: { id: ROOM, room_number: '204', category: { id: 'cat', name: 'Mount View', price: 3500 } } };
const order = (o: Record<string, unknown>) => ({ business_id: BIZ, room_id: ROOM, status: 'SETTLED', items: [{ name: 'Pav Bhaji', qty: 3, price: 220 }], grand_total: 660, subtotal: 660, ...o });

describe('one past stay, in full', () => {
  it('gathers the invoice, the advance, the food of that stay and the cashback, and leaves the next guest\'s food out', async () => {
    const db = createFakeSupabase({
      room_stay_logs: [log],
      orders: [
        order({ id: 'adv', order_type: 'room_advance', created_at: '2026-10-21T08:30:00.000Z', grand_total: 3500, items: [{ name: 'Mount View · 1 night', qty: 1, price: 3500 }] }),
        order({ id: 'food', order_type: 'room_service', created_at: '2026-10-21T12:00:00.000Z', guest_handle: '@asha' }),
        order({ id: 'inv', order_type: 'room_stay', created_at: '2026-10-21T15:48:00.000Z', grand_total: 660, invoice_number: 'INV-7', payment_method: 'CASH' }),
        order({ id: 'before', order_type: 'room_service', created_at: '2026-10-20T20:00:00.000Z' }),
        order({ id: 'after', order_type: 'room_service', created_at: '2026-10-22T09:00:00.000Z' }),
      ],
      wallet_transactions: [{ id: 't1', order_id: 'inv', transaction_type: 'CASHBACK', amount: 46.2, guest_id: '@asha' }],
    });
    const d = await loadStayDetail(db, db, BIZ, 'log-1');
    expect(d?.room).toMatchObject({ room_number: '204', category: { name: 'Mount View' } });
    expect(d?.stay).toMatchObject({ guest_name: 'Asha Rao', advance_paid: 3500 });
    expect(d?.invoice).toMatchObject({ id: 'inv', invoice_number: 'INV-7', payment_method: 'CASH', grand_total: 660 });
    expect(d?.advances.map((o) => o.id)).toEqual(['adv']);
    expect(d?.orders.map((o) => o.id)).toEqual(['food']);
    expect(d?.orders[0].items).toEqual([{ name: 'Pav Bhaji', qty: 3, price: 220, notes: null, type: undefined }]);
    expect(d?.cashback).toEqual({ amount: 46.2, handle: '@asha' });
  });

  it('is null for a stay of another venue, and has no invoice for a stay closed without one', async () => {
    const db = createFakeSupabase({ room_stay_logs: [log, { ...log, id: 'log-x', business_id: OTHER }], orders: [], wallet_transactions: [] });
    expect(await loadStayDetail(db, db, BIZ, 'log-x')).toBeNull();
    const d = await loadStayDetail(db, db, BIZ, 'log-1');
    expect(d).toMatchObject({ invoice: null, advances: [], orders: [], cashback: null });
  });
});
