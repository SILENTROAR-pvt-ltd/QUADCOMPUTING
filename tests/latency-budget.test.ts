/**
 * Latency Budget – in-process overhead guards
 *
 * These tests verify that the JavaScript processing overhead of hot-path
 * service functions stays within tight time budgets. The fake DB resolves
 * instantly (no I/O), so only pure application logic is benchmarked.
 *
 * Thresholds are deliberately generous for CI variance (~10× the real
 * production expectation) but still catch accidentally O(n) loops or heavy
 * synchronous work introduced into the request path.
 *
 * For real end-to-end latency measurements against a live deployment, see
 * scripts/load/guest-polling.mjs.
 */

import { describe, it, expect } from 'vitest';

// ── Shared constants ─────────────────────────────────────────────────────────
const BIZ   = 'aaaaaaaa-1111-4222-8333-444444444444';
const ITEM  = '0b0f2f1e-2d3c-4b5a-8c7d-9e0f1a2b3c4d';
const TABLE = 'T-04';

// ── Lightweight fake supabase ─────────────────────────────────────────────────
// Resolves every query synchronously inside a resolved Promise so only JS
// overhead is measured, not event-loop scheduling noise.
function fastDb() {
  const catalogItem = {
    id: ITEM, business_id: BIZ, name: 'Cold Coffee', price: 150,
    item_type: 'food', category: 'Beverage', metadata: null, station: null,
  };

  const chain = (data: any, error: any = null): any => {
    const methods = ['select','eq','neq','not','in','or','limit','order','maybeSingle','single'];
    const q: any = { data, error };
    methods.forEach(m => { q[m] = () => chain(data, error); });
    // make it awaitable
    q.then  = (onFulfilled: any) => Promise.resolve({ data, error }).then(onFulfilled);
    q.catch = (onRejected: any) => Promise.resolve({ data, error }).catch(onRejected);
    return q;
  };

  return {
    from: (table: string) => ({
      select: () => chain(
        table === 'businesses'          ? { id: BIZ }        :
        table === 'catalog_items'       ? [catalogItem]      :
        table === 'orders'              ? []                 :
        table === 'order_items'         ? []                 :
        table === 'dine_in_sessions'    ? null               :
        table === 'venue_wallets'       ? { venue_id: BIZ, balance: 500 }          :
        table === 'venue_subscriptions' ? { venue_id: BIZ, status: 'active', plan_tier: 'pay_as_you_go' } :
        null
      ),
      insert: () => chain(null),
      update: () => chain(null),
      upsert: () => chain(null),
    }),
    rpc: (_fn: string, args: any) => Promise.resolve({
      data: {
        success: true,
        order_id: args?.p_order_id ?? 'ord-new',
        ticket_number: args?.p_ticket_number ?? 'KOT-9999',
        is_duplicate: false,
        is_addon: false,
        session_id: null,
      },
      error: null,
    }),
  };
}

// ── Helper ────────────────────────────────────────────────────────────────────
async function measureMs(fn: () => unknown | Promise<unknown>): Promise<number> {
  const t = performance.now();
  await fn();
  return performance.now() - t;
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('Latency budget – in-process JS overhead', () => {

  // ── 1. calculateOrderTotals ─────────────────────────────────────────────
  describe('calculateOrderTotals (pure math, no I/O)', () => {
    it('computes totals for 1 item in < 5 ms', async () => {
      const { calculateOrderTotals } = await import('@/lib/utils/qr-session');
      const ms = await measureMs(() =>
        calculateOrderTotals([{ price: 150, quantity: 2, tax_rate: 5 }])
      );
      expect(ms).toBeLessThan(5);
    });

    it('computes totals for 50 items in < 10 ms', async () => {
      const { calculateOrderTotals } = await import('@/lib/utils/qr-session');
      const items = Array.from({ length: 50 }, (_, i) => ({ price: 100 + i, quantity: 1, tax_rate: 5 }));
      const ms = await measureMs(() => calculateOrderTotals(items));
      expect(ms).toBeLessThan(10);
    });
  });

  // ── 2. aggregateOrderItems ───────────────────────────────────────────────
  describe('aggregateOrderItems (pure aggregation, no I/O)', () => {
    it('aggregates 100 line items in < 10 ms', async () => {
      const { aggregateOrderItems } = await import('@/lib/utils/qr-session');
      const items = Array.from({ length: 100 }, (_, i) => ({
        id: `item_${i}`, item_id: ITEM, item_name: 'Coffee', name: 'Coffee',
        price: 150, quantity: 1, total_price: 150, tax_rate: 5,
        notes: null, kot_status: 'pending', created_at: new Date().toISOString(),
      }));
      const ms = await measureMs(() => aggregateOrderItems(items));
      expect(ms).toBeLessThan(10);
    });
  });

  // ── 3. CLOSED_STATUSES filter ────────────────────────────────────────────
  describe('CLOSED_STATUSES filter (pure filter, no I/O)', () => {
    it('filters 1 000 orders against CLOSED_STATUSES in < 5 ms', async () => {
      const { CLOSED_STATUSES } = await import('@/lib/services/guest-order/order-utils');
      const statuses = ['open', 'closed', 'settled', 'billed', 'open', 'CANCELLED'];
      const orders = Array.from({ length: 1_000 }, (_, i) => ({
        id: `o-${i}`, status: statuses[i % statuses.length],
      }));
      const ms = await measureMs(() =>
        orders.filter(o => !CLOSED_STATUSES.includes(o.status))
      );
      expect(ms).toBeLessThan(5);
    });
  });

  // ── 4. buildTableOrFilter ────────────────────────────────────────────────
  describe('buildTableOrFilter (pure string, no I/O)', () => {
    it('builds OR filter strings for three table formats in < 2 ms', async () => {
      const { buildTableOrFilter } = await import('@/lib/services/guest-order/order-utils');
      const ms = await measureMs(() => {
        buildTableOrFilter('T-04');
        buildTableOrFilter('table 12');
        buildTableOrFilter('42');
      });
      expect(ms).toBeLessThan(2);
    });
  });

  // ── 5. defaultGstRate lookup ─────────────────────────────────────────────
  describe('defaultGstRate (pure lookup, no I/O)', () => {
    it('resolves GST rate for 500 items in < 5 ms', async () => {
      const { defaultGstRate } = await import('@/lib/utils/gst-rates');
      const kinds = [
        { item_type: 'food',     category: 'Food & Beverage' },
        { item_type: 'service',  category: 'Service'         },
        { item_type: 'beverage', category: 'Bar'             },
        { item_type: undefined,  category: undefined         },
      ];
      const ms = await measureMs(() => {
        for (let i = 0; i < 500; i++) defaultGstRate(kinds[i % kinds.length]);
      });
      // 50 ms: generous for first-call module init + V8 JIT warmup in CI.
      // A true regression (e.g. accidental async DB call here) would be >>100 ms.
      expect(ms).toBeLessThan(50);
    });
  });

  // ── 6. normalizeCumulativeItems ───────────────────────────────────────────
  describe('normalizeCumulativeItems (pure transform, no I/O)', () => {
    it('normalizes 200 raw order items in < 15 ms', async () => {
      const { normalizeCumulativeItems } = await import('@/lib/services/guest-order/order-utils');
      const raw = Array.from({ length: 200 }, (_, i) => ({
        id: `r-${i}`, item_id: ITEM, item_name: 'Coffee', price: 150,
        quantity: 1, notes: null, kot_status: 'pending',
        created_at: new Date().toISOString(),
      }));
      const ms = await measureMs(() => normalizeCumulativeItems(raw));
      expect(ms).toBeLessThan(15);
    });
  });

  // ── 7. submitGuestOrder end-to-end in-process overhead ───────────────────
  describe('submitGuestOrder end-to-end (instant-resolving fake DB, no network)', () => {
    it('places a fresh guest order in < 150 ms', async () => {
      const { submitGuestOrder } = await import('@/lib/services/guest-order/submit-order.service');
      const ms = await measureMs(() =>
        submitGuestOrder({
          business_id: BIZ, cafe_id: BIZ, table_number: TABLE,
          guest_name: 'Latency Tester',
          items: [{ item_id: ITEM, quantity: 1 }],
        }, fastDb())
      );
      expect(ms).toBeLessThan(150);
    });

    it('places 10 sequential guest orders in < 1 500 ms (no O(n) regression)', async () => {
      const { submitGuestOrder } = await import('@/lib/services/guest-order/submit-order.service');
      const ms = await measureMs(async () => {
        for (let i = 0; i < 10; i++) {
          await submitGuestOrder({
            business_id: BIZ, cafe_id: BIZ,
            table_number: `T-${String(i + 1).padStart(2, '0')}`,
            items: [{ item_id: ITEM, quantity: 1 }],
          }, fastDb());
        }
      });
      expect(ms).toBeLessThan(1_500);
    });
  });
});
