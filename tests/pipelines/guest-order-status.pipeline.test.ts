import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';

// A guest phone asks for its table's order status every few seconds, so this read is the most-run query in the app.
// These tests pin what it returns, and that the venue lookup behind it is remembered instead of repeated.
const ctx = vi.hoisted(() => ({ db: null as any, venueReads: 0 }));
vi.mock('@/lib/supabase/admin', () => ({ adminDb: () => ctx.db, getAdminClient: () => ctx.db }));

import { getGuestActiveOrder } from '@/lib/services/guest-order/get-order.service';
import { resolveBusinessId, clearBusinessCache } from '@/lib/services/guest-order/business-resolver.service';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const ORDER = 'bbbbbbbb-1111-4222-8333-444444444444';
const url = (table = 'T-01') => `http://localhost/api/guest/order?table=${table}&cafe_id=${BIZ}`;

function db(over: Record<string, any[]> = {}) {
  return createFakeSupabase({
    businesses: [{ id: BIZ, business_name: 'Bombay Rasoi' }],
    orders: [{ id: ORDER, business_id: BIZ, table_number: 'T-01', status: 'open', subtotal: 300, grand_total: 300, items: [], created_at: '2026-10-14T10:00:00Z' }],
    order_items: [
      { id: 'i1', order_id: ORDER, item_name: 'Cold Coffee', price: 150, quantity: 1, kot_status: 'pending', created_at: '2026-10-14T10:00:01Z' },
      { id: 'i2', order_id: ORDER, item_name: 'Farm House Pizza', price: 150, quantity: 1, kot_status: 'pending', created_at: '2026-10-14T10:00:02Z' },
    ],
    kitchen_tickets: [
      { id: 'k-old', business_id: BIZ, order_id: ORDER, ticket_number: 'KOT-1111', status: 'READY', created_at: '2026-10-14T10:00:03Z' },
      { id: 'k-new', business_id: BIZ, order_id: ORDER, ticket_number: 'KOT-2222-ADD', status: 'PREPARING', created_at: '2026-10-14T10:05:00Z' },
    ],
    dine_in_sessions: [{ id: 's1', business_id: BIZ, table_number: 'T-01', status: 'bill_requested', updated_at: '2026-10-14T10:06:00Z' }],
    ...over,
  });
}

describe('Guest order status (the read every phone repeats)', () => {
  beforeEach(() => { ctx.db = db(); });

  it('returns the live order, its dishes, the newest kitchen ticket and the bill-requested flag', async () => {
    const r = await getGuestActiveOrder(url(), ctx.db);
    expect(r.success).toBe(true);
    expect(r.has_active_order).toBe(true);
    expect(r.order.id).toBe(ORDER);
    expect(r.items.map((i: any) => i.name || i.item_name)).toEqual(expect.arrayContaining(['Cold Coffee', 'Farm House Pizza']));
    expect(r.ticket.id).toBe('k-new');
    expect(r.kot_status).toBe('PREPARING');
    expect(r.is_bill_requested).toBe(true);
    expect(r.is_settled).toBe(false);
  });

  it('reports an empty table: no order, no ticket, and no kitchen status', async () => {
    ctx.db = db({ orders: [], order_items: [], kitchen_tickets: [], dine_in_sessions: [] });
    const r = await getGuestActiveOrder(url(), ctx.db);
    expect(r).toMatchObject({ has_active_order: false, order: null, ticket: null, kot_status: null, is_bill_requested: false, is_settled: false });
    expect(r.items).toEqual([]);
  });

  it('does not show another table\'s order', async () => {
    const r = await getGuestActiveOrder(url('T-09'), ctx.db);
    expect(r.has_active_order).toBe(false);
    expect(r.order).toBeNull();
  });

  it('fails loudly, not with an empty table, when a read errors', async () => {
    ctx.db = createFakeSupabase(
      { businesses: [{ id: BIZ }], orders: [], order_items: [], kitchen_tickets: [], dine_in_sessions: [{ id: 's1', business_id: BIZ, table_number: 'T-01', status: 'open' }] },
      { failOn: { 'dine_in_sessions.select': () => true } }
    );
    await expect(getGuestActiveOrder(url(), ctx.db)).rejects.toBeTruthy();
  });
});

describe('Venue lookup behind every guest request', () => {
  const realEnv = process.env.NODE_ENV;
  beforeEach(() => {
    (process.env as any).NODE_ENV = 'production'; // the memory is off under test; turn it on to test it
    clearBusinessCache();
    ctx.venueReads = 0;
    const inner = db();
    ctx.db = { ...inner, calls: inner.calls, rpc: inner.rpc.bind(inner), from: (t: string) => { if (t === 'businesses') ctx.venueReads++; return inner.from(t); } };
  });
  afterEach(() => { (process.env as any).NODE_ENV = realEnv; clearBusinessCache(); });

  it('remembers a venue found by id, so repeated polls do not re-read it', async () => {
    const a = await resolveBusinessId(BIZ);
    const b = await resolveBusinessId(BIZ.toUpperCase());
    expect(a.success && b.success).toBe(true);
    expect(ctx.venueReads).toBe(1);
  });

  it('hands every caller its own copy of the venue, so one cannot change what another sees', async () => {
    const a = await resolveBusinessId(BIZ);
    if (!a.success) throw new Error('expected success');
    a.business.business_name = 'Changed by a caller';
    const b = await resolveBusinessId(BIZ);
    if (!b.success) throw new Error('expected success');
    expect(b.business.business_name).toBe('Bombay Rasoi');
  });

  it('reads the venue again after the memory is cleared, and remembers a miss for a minute without reading again', async () => {
    await resolveBusinessId(BIZ);
    clearBusinessCache();
    await resolveBusinessId(BIZ);
    expect(ctx.venueReads).toBe(2);

    // An identifier that matches nothing used to cost a service-role read on every request, with no limit in front
    // of it. The miss is now remembered: the second request answers 404 from memory.
    const before = ctx.venueReads;
    const missing = await resolveBusinessId('99999999-9999-4999-8999-999999999999');
    expect(missing.success).toBe(false);
    const again = await resolveBusinessId('99999999-9999-4999-8999-999999999999');
    expect(again.success).toBe(false);
    expect(again.error!.status).toBe(404);
    expect(ctx.venueReads).toBe(before + 1);

    // Clearing the memory forgets the miss too, so a venue created moments later is found.
    clearBusinessCache();
    await resolveBusinessId('99999999-9999-4999-8999-999999999999');
    expect(ctx.venueReads).toBe(before + 2);
  });
});
