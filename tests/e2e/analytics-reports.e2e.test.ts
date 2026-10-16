/**
 * Live, read-only check of the analytics reports against a real venue: the report's totals must equal an independent
 * sum of the same database rows. Writes nothing. OFF unless E2E_LIVE=1; set E2E_VENUE_ID to the venue to check.
 *
 *   $env:E2E_LIVE='1'; $env:E2E_VENUE_ID='<uuid>'; npx vitest run --config vitest.e2e.config.ts tests/e2e/analytics-reports.e2e.test.ts
 */
import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { liveEnv } from './support';
import { fetchAnalyticsData, fetchCatalogCategories, fetchExpenseData, fetchLedgerGuests } from '@/lib/services/analytics/fetch-data.service';
import { buildProfitAndLoss } from '@/lib/services/analytics/pnl.util';
import { buildReports } from '@/lib/services/analytics/reports.util';

const LIVE = process.env.E2E_LIVE === '1' && Boolean(process.env.E2E_VENUE_ID);
const ENV = liveEnv();
// The ledger read uses the server's service-role client, which reads its keys from process.env.
for (const [k, v] of Object.entries(ENV)) if (process.env[k] === undefined) process.env[k] = v;
const r2 = (n: number) => Math.round(n * 100) / 100;

describe.skipIf(!LIVE)('Analytics reports match the database (read only)', () => {
  const db = createClient(ENV.NEXT_PUBLIC_SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const venue = process.env.E2E_VENUE_ID as string;
  const start = '2020-01-01T00:00:00.000Z';
  const end = new Date(Date.now() + 60_000).toISOString();

  it('totals, channels, hours and categories all reconcile with a direct sum of the rows', async () => {
    const { orders, truncated } = await fetchAnalyticsData(db, venue, start, end);
    expect(truncated).toBe(false);
    const { data: direct, error } = await db.from('orders').select('status, grand_total').eq('business_id', venue).gte('created_at', start).lte('created_at', end).limit(5000);
    expect(error).toBeNull();
    expect(orders.length).toBe(direct!.length);

    const settled = direct!.filter((o: any) => ['settled', 'SETTLED'].includes(o.status));
    const expected = r2(settled.reduce((a: number, o: any) => a + (Number(o.grand_total) || 0), 0));
    const r = buildReports(orders);
    const s = r.summary;

    expect(s.settled_bills).toBe(settled.length);
    expect(s.collected).toBe(expected);
    expect(r2(s.net_sales + s.gst + s.delivery_fees + s.other_charges)).toBe(s.collected);
    expect(r2(r.channels.reduce((a, c) => a + c.sales, 0))).toBe(s.collected);
    expect(r2(r.by_hour.reduce((a, h) => a + h.sales, 0))).toBe(s.collected);
    expect(r2(r.by_weekday.reduce((a, w) => a + w.sales, 0))).toBe(s.collected);
    expect(Math.abs(r2(r.categories.reduce((a, c) => a + c.net_sales, 0)) - s.net_sales)).toBeLessThanOrEqual(0.05 * Math.max(1, r.categories.length));
    console.log('[analytics-reports]', JSON.stringify({ bills: s.settled_bills, collected: s.collected, net: s.net_sales, gst: s.gst, delivery: s.delivery_fees, other: s.other_charges, open: s.open_bills, peak: r.peak_hour?.label }));
  });

  it('reads guests from the My Guests ledger and categories from the menu catalogue', async () => {
    const { orders } = await fetchAnalyticsData(db, venue, start, end);
    const settledIds = orders.filter((o: any) => String(o.status).toLowerCase() === 'settled').map((o: any) => o.id);
    const [categoryOf, guests] = await Promise.all([fetchCatalogCategories(db, venue), fetchLedgerGuests(venue, settledIds, start)]);
    expect(guests).not.toBeNull();
    // Every settled bill is one ledger visit: a known guest's visit or a walk-in bill.
    const { count } = await db.from('ledger_visits').select('*', { count: 'exact', head: true }).eq('business_id', venue).in('order_id', settledIds.slice(0, 150));
    expect(count).toBeGreaterThan(0);
    const r = buildReports(orders, categoryOf);
    const uncategorised = r.categories.find((c) => c.name === 'Uncategorised');
    console.log('[analytics-guests]', JSON.stringify({ known: guests!.known, walk_ins: guests!.walk_ins, new: guests!.new_guests, returning: guests!.returning, top: guests!.top.map((t) => t.name), categories: r.categories.map((c) => `${c.name}:${c.net_sales}`), uncategorised: uncategorised?.net_sales ?? 0 }));
    expect(r.categories.length).toBeGreaterThan(0);
  });

  it('builds a balanced profit and loss from the real expenses, stock and fees', async () => {
    const { orders, stockLogs } = await fetchAnalyticsData(db, venue, start, end);
    const settledIds = orders.filter((o: any) => String(o.status).toLowerCase() === 'settled').map((o: any) => o.id);
    const spend = await fetchExpenseData(db, venue, '2020-01-01', '2099-12-31', settledIds);
    expect(spend.missing).toEqual([]);
    const s = buildReports(orders).summary;
    const p = buildProfitAndLoss({ net_sales: s.net_sales, delivery_fees: s.delivery_fees, other_charges: s.other_charges, gst: s.gst,
      logs: stockLogs, expenses: spend.expenses, salaries: spend.salaries, advances: spend.advances, platform_fees: spend.platform_fees });
    expect(Math.round((p.revenue_total - p.cogs_total - p.opex_total) * 100) / 100).toBe(p.net_profit);
    // ₹3 for each settled bill whose fee is recorded under its bill (65 of them); the one fee saved under a made-up
    // reference (QC-2026-CASH1791) cannot be tied to a bill, so it is not counted against a period.
    expect(spend.platform_fees % 3).toBe(0);
    expect(spend.platform_fees).toBeGreaterThan(0);
    console.log('[analytics-pnl]', JSON.stringify({ revenue: p.revenue_total, cogs: p.cogs_total, gross: p.gross_profit, opex: p.opex.map((l) => `${l.label}:${l.amount}`), net: p.net_profit, bought: p.stock_purchased }));
  });
});
