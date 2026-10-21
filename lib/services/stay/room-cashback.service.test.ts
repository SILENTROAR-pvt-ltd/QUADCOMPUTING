import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { creditRoomDiningCashback, stampBillOwner } from './room-cashback.service';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const INVOICE = 'inv-1';
const seed = () => createFakeSupabase({
  orders: [
    { id: INVOICE, business_id: BIZ, order_type: 'room_stay' },
    { id: 'o-mine', business_id: BIZ, subtotal: 250, grand_total: 250 },
    { id: 'o-mine-2', business_id: BIZ, subtotal: 100, grand_total: 100 },
    { id: 'o-shared', business_id: BIZ, subtotal: 400, grand_total: 400 },
    { id: 'o-walkin', business_id: BIZ, subtotal: 100, grand_total: 100 },
  ],
  order_items: [
    { id: 'i1', order_id: 'o-mine', guest_handle: '@asha' }, { id: 'i2', order_id: 'o-mine', guest_handle: '@asha' },
    { id: 'i6', order_id: 'o-mine-2', guest_handle: '@asha' },
    { id: 'i3', order_id: 'o-shared', guest_handle: '@asha' }, { id: 'i4', order_id: 'o-shared', guest_handle: '@vikram' },
    { id: 'i5', order_id: 'o-walkin', guest_handle: null },
  ],
  guest_wallets: [{ id: 'w1', guest_id: '@asha', business_id: BIZ, cafe_id: BIZ, balance: 10, total_cashback_earned: 10 }],
  wallet_transactions: [],
});
const orders = (db: any) => db.tables.orders.filter((o: any) => o.id !== INVOICE).map((o: any) => ({ id: o.id, subtotal: o.subtotal, grand_total: o.grand_total }));

describe('cashback on food charged to a room', () => {
  it('credits 7% of the orders one guest ordered whole, as one entry against the stay invoice; never a shared order or a walk-in', async () => {
    const db = seed();
    const result = await creditRoomDiningCashback(db, { businessId: BIZ, roomNumber: '101', invoiceOrderId: INVOICE, orders: orders(db) });
    expect(result).toMatchObject({ total: 24.5, handle: '@asha', credited: [{ handle: '@asha', amount: 24.5, orders: ['o-mine', 'o-mine-2'] }] });
    expect(db.tables.guest_wallets[0]).toMatchObject({ balance: 34.5, total_cashback_earned: 34.5 });
    expect(db.tables.wallet_transactions).toHaveLength(1);
    expect(db.tables.wallet_transactions[0]).toMatchObject({ order_id: INVOICE, transaction_type: 'CASHBACK', amount: 24.5, balance_before: 10, balance_after: 34.5, table_number: 'ROOM 101' });
  });

  it('credits a stay once: a retried checkout finds the entry and leaves the wallet alone', async () => {
    const db = seed();
    await creditRoomDiningCashback(db, { businessId: BIZ, roomNumber: '101', invoiceOrderId: INVOICE, orders: orders(db) });
    const again = await creditRoomDiningCashback(db, { businessId: BIZ, roomNumber: '101', invoiceOrderId: INVOICE, orders: orders(db) });
    expect(again).toMatchObject({ total: 0, credited: [] });
    expect(db.tables.guest_wallets[0].balance).toBe(34.5);
    expect(db.tables.wallet_transactions).toHaveLength(1);
  });

  it('opens a wallet for a guest who has none at this venue, and stamps the bill as theirs', async () => {
    const db = createFakeSupabase({
      orders: [{ id: INVOICE, business_id: BIZ }, { id: 'o1', business_id: BIZ, subtotal: 100 }],
      order_items: [{ id: 'i1', order_id: 'o1', guest_handle: '@meera' }],
      guest_wallets: [], wallet_transactions: [],
    });
    const result = await creditRoomDiningCashback(db, { businessId: BIZ, roomNumber: '7', invoiceOrderId: INVOICE, orders: [{ id: 'o1', subtotal: 100 }] });
    expect(result.total).toBe(7);
    expect(db.tables.guest_wallets[0]).toMatchObject({ guest_id: '@meera', business_id: BIZ, balance: 7 });
    await stampBillOwner(db, BIZ, [INVOICE], '@meera');
    expect(db.tables.orders[0].guest_handle).toBe('@meera');
  });
});
