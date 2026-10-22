import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { saveActiveOrder, type ActiveOrderRecord } from '@/lib/store/active-order-store';
import { getDetailedHostSession } from '@/lib/services/session/detailed-session.service';
import { releaseTable } from '@/lib/services/session/release-table.service';
import { deriveTableOccupancy } from '@/lib/services/table/table-occupancy.util';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const OTHER = 'bbbbbbbb-1111-4222-8333-444444444444';
const now = new Date().toISOString();
const bill = (table: string) => `http://x/api/host/sessions?table_number=${table}&business_id=${BIZ}`;

describe('A table shows only what is live in the database', () => {
  it('ignores a stale in-memory order left behind by a previous guest', async () => {
    const stale = {
      id: 'ord-stale', business_id: BIZ, table_number: 'T-11', session_id: 'sess-stale', status: 'open',
      subtotal: 500, tax_amount: 0, grand_total: 500, total_amount: 500, customer_name: 'Previous guest',
      items: [], raw_items: [], created_at: now, updated_at: now,
    } as ActiveOrderRecord;
    saveActiveOrder(stale);
    const db = createFakeSupabase({ dine_in_sessions: [], orders: [], order_items: [] });

    const r = await getDetailedHostSession(bill('T-11'), db, BIZ);
    expect(r.session).toBeNull();
    expect(r.order).toBeNull();
  });

  it('returns nothing for a table whose session was closed and whose order was settled', async () => {
    const db = createFakeSupabase({
      dine_in_sessions: [{ id: 's1', business_id: BIZ, table_number: 'T-01', status: 'closed', guest_handle: '@babaaps' }],
      orders: [{ id: 'o1', business_id: BIZ, table_number: 'T-01', session_id: 's1', status: 'settled' }],
      order_items: [],
    });
    const r = await getDetailedHostSession(bill('T-01'), db, BIZ);
    expect(r).toMatchObject({ session: null, order: null, items: [] });
  });

  it('shows the live session, its order and its items', async () => {
    const db = createFakeSupabase({
      dine_in_sessions: [{ id: 's2', business_id: BIZ, table_number: 'T-02', status: 'open', guest_handle: '@ravi', created_at: now }],
      orders: [{ id: 'o2', business_id: BIZ, table_number: 'T-02', session_id: 's2', status: 'open', subtotal: 300, grand_total: 300 }],
      order_items: [{ id: 'i1', order_id: 'o2', item_name: 'Tea', price: 100, quantity: 3, kot_status: 'pending', created_at: now }],
    });
    const r = await getDetailedHostSession(bill('T-02'), db, BIZ);
    expect(r.session).toMatchObject({ id: 's2', guest_handle: '@ravi' });
    expect(r.order).toMatchObject({ id: 'o2' });
    expect(r.items).toHaveLength(1);
  });

  it('never reads another venue’s table', async () => {
    const db = createFakeSupabase({
      dine_in_sessions: [{ id: 's3', business_id: OTHER, table_number: 'T-03', status: 'open', guest_handle: '@someone' }],
      orders: [{ id: 'o3', business_id: OTHER, table_number: 'T-03', session_id: 's3', status: 'open' }],
      order_items: [],
    });
    const r = await getDetailedHostSession(bill('T-03'), db, BIZ);
    expect(r).toMatchObject({ session: null, order: null });
  });
});

describe('Table tiles agree with the database', () => {
  it('a stored OCCUPIED with no live order reads as vacant; a live order makes it occupied', () => {
    const tables = [
      { id: 't1', table_number: 'T-01', status: 'OCCUPIED' },
      { id: 't2', table_number: 'T-02', status: 'VACANT' },
      { id: 't3', table_number: 'T-03', status: 'OCCUPIED' },
      { id: 't4', table_number: 'T-04', status: 'RESERVED' },
    ];
    const live = [{ id: 'o3', table_number: 'T-03', subtotal: 200, grand_total: 200, status: 'open' }];
    const db = createFakeSupabase({ restaurant_tables: tables.map((t) => ({ ...t })) });
    const out = deriveTableOccupancy(tables, live, db);
    expect(out.map((t: any) => t.status)).toEqual(['VACANT', 'VACANT', 'OCCUPIED', 'RESERVED']);
    expect(out[2]).toMatchObject({ active_order_id: 'o3', running_subtotal: 200 });
  });
});

describe('Freeing a table from the live board', () => {
  const seeded = () => createFakeSupabase({
    orders: [{ id: 'o4', business_id: BIZ, table_number: 'T-04', session_id: 's4', status: 'open' }],
    order_items: [{ id: 'i4', order_id: 'o4', kot_status: 'preparing' }],
    dine_in_sessions: [{ id: 's4', business_id: BIZ, table_number: 'T-04', status: 'open' }],
    restaurant_tables: [{ id: 'rt4', business_id: BIZ, table_number: 'T-04', status: 'OCCUPIED' }],
  });

  it('refuses once the kitchen has started a line, and changes nothing', async () => {
    const db = seeded();
    const r = await releaseTable({ table_number: 'T-04' }, db, BIZ);
    expect(r).toMatchObject({ ok: false, status: 409 });
    expect(db.tables.orders[0].status).toBe('open');
    expect(db.tables.dine_in_sessions[0].status).toBe('open');
    expect(db.tables.restaurant_tables[0].status).toBe('OCCUPIED');
  });

  it('cancels unstarted items, closes the session and frees the table', async () => {
    const db = seeded();
    db.tables.order_items[0].kot_status = 'pending';
    const r = await releaseTable({ table_number: 'T-04' }, db, BIZ);
    expect(r).toMatchObject({ ok: true, status: 'VACANT' });
    expect(db.tables.orders[0].status).toBe('cancelled');
    expect(db.tables.dine_in_sessions[0].status).toBe('closed');
    expect(db.tables.restaurant_tables[0].status).toBe('VACANT');
  });

  it('needs a table to be named', async () => {
    const r = await releaseTable({}, seeded(), BIZ);
    expect(r).toMatchObject({ ok: false, status: 400 });
  });

  it('still refuses when the seated party\'s own order was cancelled after the kitchen cooked it', async () => {
    const db = seeded();
    db.tables.orders[0].status = 'cancelled';
    db.tables.order_items[0].kot_status = 'served';
    const r = await releaseTable({ table_number: 'T-04' }, db, BIZ);
    expect(r).toMatchObject({ ok: false, status: 409 });
  });

  it('frees the table when the only cooked food was on an earlier party\'s cancelled order', async () => {
    const db = createFakeSupabase({
      orders: [{ id: 'old', business_id: BIZ, table_number: 'T-04', session_id: 'gone', status: 'cancelled' }],
      order_items: [{ id: 'iold', order_id: 'old', kot_status: 'served' }],
      dine_in_sessions: [{ id: 'gone', business_id: BIZ, table_number: 'T-04', status: 'closed' }],
      restaurant_tables: [{ id: 'rt4', business_id: BIZ, table_number: 'T-04', status: 'OCCUPIED' }],
    });
    const r = await releaseTable({ table_number: 'T-04' }, db, BIZ);
    expect(r).toMatchObject({ ok: true, status: 'VACANT' });
    expect(db.tables.restaurant_tables[0].status).toBe('VACANT');
  });
});
