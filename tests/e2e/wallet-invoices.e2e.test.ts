/**
 * Live test of the wallet's invoice history: real settled orders and fees in the database give the right revenue,
 * the right fee per bill, and complete, non-overlapping pages.
 *
 * It writes real rows, so it is OFF unless E2E_LIVE=1. Everything belongs to one disposable venue
 * ("ZZ E2E Invoice Venue"), and every row of that venue is removed at the end.
 *
 *   $env:E2E_LIVE='1'; npx vitest run --config vitest.e2e.config.ts tests/e2e/wallet-invoices.e2e.test.ts
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { cleanUp, liveEnv } from './support';
import { fetchInvoicePage, fetchInvoiceSummary } from '@/lib/services/wallet/invoice-history.service';
import { feeReferenceFor } from '@/lib/services/wallet/invoice-history.util';
import { fetchDaySlips } from '@/lib/services/wallet/day-slips.service';

const LIVE = process.env.E2E_LIVE === '1';
const ENV = liveEnv();

// Seven settled bills of ₹100 to ₹700, one open bill and one cancelled bill that must not count as revenue.
const AMOUNTS = [100, 200, 300, 400, 500, 600, 700];

describe.skipIf(!LIVE)('Wallet invoices: real settled orders, fees and paging', () => {
  const db = createClient(ENV.NEXT_PUBLIC_SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  let biz = '';
  const settledIds: string[] = [];

  beforeAll(async () => {
    const slug = `zz-e2e-invoice-${Date.now().toString(36)}`;
    const { data: b, error } = await db.from('businesses').insert({ business_name: 'ZZ E2E Invoice Venue', name: 'ZZ E2E Invoice Venue', slug, categories: ['Cafe'] }).select('id').single();
    if (error) throw new Error(`could not create the test venue: ${error.message}`);
    biz = b.id;

    const base = Date.parse('2026-10-01T10:00:00.000Z');
    const rows = AMOUNTS.map((amount, i) => ({
      business_id: biz, table_number: `T-0${i + 1}`, status: 'settled', order_type: 'pos', subtotal: amount, tax_amount: 0, grand_total: amount,
      total_amount: amount, customer_name: i === 0 ? 'Asha' : 'Guest', payment_method: 'UPI', items: [], created_at: new Date(base + i * 3_600_000).toISOString(),
    }));
    rows.push({ ...rows[0], table_number: 'T-10', status: 'open', grand_total: 999, subtotal: 999, total_amount: 999, created_at: new Date(base + 9 * 3_600_000).toISOString() });
    rows.push({ ...rows[0], table_number: 'T-11', status: 'cancelled', grand_total: 888, subtotal: 888, total_amount: 888, created_at: new Date(base + 10 * 3_600_000).toISOString() });
    const ins = await db.from('orders').insert(rows).select('id, status, grand_total');
    if (ins.error) throw new Error(`orders: ${ins.error.message}`);
    for (const o of ins.data!) if (o.status === 'settled') settledIds.push(o.id);

    // Fees: the first two bills are still due (one of them cleared), the third was taken from credit, the rest were free.
    const fees = await db.from('venue_outstanding_bills').insert([
      { venue_id: biz, reference_id: feeReferenceFor(settledIds[0]), description: 'POS Bill Settlement', item_type: 'bill_generate', amount: 3, status: 'unpaid' },
      { venue_id: biz, reference_id: feeReferenceFor(settledIds[1]), description: 'POS Bill Settlement', item_type: 'bill_generate', amount: 3, status: 'paid' },
    ]);
    if (fees.error) throw new Error(`dues: ${fees.error.message}`);
    const ledger = await db.from('usage_ledger').insert({ venue_id: biz, action_type: 'bill_generate', cost: 3, reference_id: feeReferenceFor(settledIds[2]) });
    if (ledger.error) throw new Error(`ledger: ${ledger.error.message}`);
  }, 60_000);

  afterAll(async () => { await cleanUp(db, ENV, biz); }, 120_000);

  it('totals revenue from settled bills only, like analytics', async () => {
    const s = await fetchInvoiceSummary(db, biz);
    expect(s.revenue).toBe(2800);
    expect(s.invoiceCount).toBe(7);
    expect(s.truncated).toBe(false);
  });

  it('totals the fees charged and the fees still due', async () => {
    const s = await fetchInvoiceSummary(db, biz);
    expect(s).toMatchObject({ feesCharged: 9, feesDue: 3, dueCount: 1 });
  });

  it('lists every settled bill newest first, with the fee and its status', async () => {
    const { invoices, nextCursor } = await fetchInvoicePage(db, biz, null, 25);
    expect(nextCursor).toBeNull();
    expect(invoices.map((i) => i.grand_total)).toEqual([700, 600, 500, 400, 300, 200, 100]);
    const byAmount = Object.fromEntries(invoices.map((i) => [i.grand_total, i]));
    expect(byAmount[100]).toMatchObject({ fee: 3, fee_status: 'due', guest: 'Asha', where: 'T-01', payment_method: 'UPI' });
    expect(byAmount[200]).toMatchObject({ fee: 3, fee_status: 'cleared' });
    expect(byAmount[300]).toMatchObject({ fee: 3, fee_status: 'deducted' });
    expect(byAmount[400]).toMatchObject({ fee: 0, fee_status: 'none' });
    expect(invoices[0].invoice_number).toMatch(/^QC-2026-[0-9A-F]{8}$/);
  });

  it('pages through the whole history with no bill repeated or missed', async () => {
    const seen: number[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page = await fetchInvoicePage(db, biz, cursor, 3);
      seen.push(...page.invoices.map((i) => i.grand_total));
      cursor = page.nextCursor;
      pages += 1;
    } while (cursor && pages < 10);
    expect(pages).toBe(3);
    expect(seen).toEqual([700, 600, 500, 400, 300, 200, 100]);
  });

  it("makes the day's due slip from the same bills, with filters", async () => {
    // All seven bills are on 1 Oct between 3:30 PM and 9:30 PM IST, inside the 10 AM to 10 PM window.
    const all = await fetchDaySlips(db, biz, { from: '2026-10-01', to: '2026-10-01' }, { fee: 'all', payment: 'all', q: '' });
    expect(all.days.map((d) => d.day)).toEqual(['2026-10-01']);
    expect(all.totals).toMatchObject({ bills: 7, revenue: 2800, fees: 9, feesDue: 3, feesPaid: 6, afterHours: 0 });

    const due = await fetchDaySlips(db, biz, { from: '2026-10-01', to: '2026-10-01' }, { fee: 'due', payment: 'all', q: '' });
    expect(due.totals).toMatchObject({ bills: 1, revenue: 100 });
    const asha = await fetchDaySlips(db, biz, { from: null, to: null }, { fee: 'all', payment: 'UPI', q: 'asha' });
    expect(asha.totals.bills).toBe(1);

    const nextDay = await fetchDaySlips(db, biz, { from: '2026-10-02', to: '2026-10-02' }, { fee: 'all', payment: 'all', q: '' });
    expect(nextDay.totals.bills).toBe(0);
  });

  it('refuses a malformed page position', async () => {
    await expect(fetchInvoicePage(db, biz, 'not-a-cursor', 3)).rejects.toMatchObject({ status: 400 });
  });
});
