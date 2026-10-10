import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { invoicesToCsv, parseInvoiceFilters, queryGuestInvoices, invoiceNumber } from '@/lib/services/guest-auth/guest-bills.service';

const VENUE_A = 'aaaaaaaa-1111-4222-8333-444444444444';
const VENUE_B = 'bbbbbbbb-1111-4222-8333-444444444444';
const W_A = '10000000-1111-4222-8333-444444444444';
const W_B = '20000000-1111-4222-8333-444444444444';
const W_RAVI = '30000000-1111-4222-8333-444444444444';
const O1 = 'f92eb682-f580-449b-b0a2-9abca0aa5c2a'; // Bombay Rasoi, UPI, via session
const O2 = 'e3ac61d5-7eaa-47f6-a922-2514c50bcd91'; // Venus Cafe, CARD, via session
const O3 = '11111111-1111-4222-8333-444444444444'; // Ravi's bill
const O4 = '22222222-1111-4222-8333-444444444444'; // Venus Cafe, no session, cashback only
const O5 = '33333333-1111-4222-8333-444444444444'; // still open, not settled

function seed() {
  return createFakeSupabase({
    businesses: [
      { id: VENUE_A, business_name: 'Bombay Rasoi', gst_number: '27abcde1234f1z5' },
      { id: VENUE_B, business_name: 'Venus Cafe', gst_number: null },
    ],
    locations: [{ business_id: VENUE_A, branch_name: 'Andheri', address_line1: '12 Link Road', city: 'Mumbai', state: 'MH', pincode: '400053', created_at: '2026-01-01T00:00:00Z' }],
    guest_wallets: [
      { id: W_A, guest_id: '@asha', business_id: VENUE_A, cafe_id: VENUE_A, balance: 14, wallet_code: 'QW-AAAA1111' },
      { id: W_B, guest_id: '@asha', business_id: VENUE_B, cafe_id: VENUE_B, balance: 37, wallet_code: 'QW-BBBB2222' },
      { id: W_RAVI, guest_id: '@ravi', business_id: VENUE_A, cafe_id: VENUE_A, balance: 500, wallet_code: 'QW-RAVI0000' },
    ],
    dine_in_sessions: [
      { id: 'sess-asha-a', business_id: VENUE_A, guest_handle: '@asha' },
      { id: 'sess-asha-b', business_id: VENUE_B, guest_handle: '@asha' },
      { id: 'sess-ravi', business_id: VENUE_A, guest_handle: '@ravi' },
    ],
    orders: [
      { id: O1, business_id: VENUE_A, session_id: 'sess-asha-a', status: 'settled', table_number: 'T-01', subtotal: 200, tax_amount: 10, discount_amount: 0, grand_total: 210, payment_method: 'UPI', created_at: '2026-10-08T09:00:00.000Z', updated_at: '2026-10-08T09:30:00.000Z', items: [{ name: 'Misal Pav', price: 200, qty: 1 }] },
      { id: O2, business_id: VENUE_B, session_id: 'sess-asha-b', status: 'settled', table_number: 'T-03', subtotal: 480, tax_amount: 20, discount_amount: 0, grand_total: 500, payment_method: 'CARD', created_at: '2026-10-07T12:00:00.000Z', updated_at: '2026-10-07T12:40:00.000Z', items: [] },
      { id: O3, business_id: VENUE_A, session_id: 'sess-ravi', status: 'settled', table_number: 'T-09', subtotal: 290, tax_amount: 10, discount_amount: 0, grand_total: 300, payment_method: 'CASH', created_at: '2026-10-08T10:00:00.000Z', updated_at: '2026-10-08T10:20:00.000Z', items: [] },
      { id: O4, business_id: VENUE_B, session_id: null, status: 'settled', table_number: 'T-02', subtotal: 95, tax_amount: 5, discount_amount: 0, grand_total: 100, payment_method: 'UPI', created_at: '2026-10-06T08:00:00.000Z', updated_at: '2026-10-06T08:20:00.000Z', items: [] },
      { id: O5, business_id: VENUE_A, session_id: 'sess-asha-a', status: 'open', table_number: 'T-01', subtotal: 50, tax_amount: 0, discount_amount: 0, grand_total: 50, payment_method: null, created_at: '2026-10-08T11:00:00.000Z', updated_at: '2026-10-08T11:00:00.000Z', items: [] },
    ],
    order_items: [
      { id: 'li-1', order_id: O2, item_name: 'Thali', quantity: 2, price: 240 },
    ],
    wallet_transactions: [
      { id: 't1', wallet_id: W_A, order_id: O1, transaction_type: 'CASHBACK', amount: 14, balance_after: 14, created_at: '2026-10-08T09:30:00.000Z' },
      { id: 't2', wallet_id: W_B, order_id: O2, transaction_type: 'CASHBACK', amount: 30, balance_after: 30, created_at: '2026-10-07T12:40:00.000Z' },
      { id: 't3', wallet_id: W_B, order_id: O4, transaction_type: 'CASHBACK', amount: 7, balance_after: 37, created_at: '2026-10-06T08:20:00.000Z' },
      { id: 't4', wallet_id: W_RAVI, order_id: O3, transaction_type: 'CASHBACK', amount: 15, balance_after: 500, created_at: '2026-10-08T10:20:00.000Z' },
    ],
  });
}

const f = (over: Partial<Parameters<typeof queryGuestInvoices>[2]> = {}) => ({
  venueId: null, from: null, to: null, payment: 'ALL' as const, orderId: null, before: null, limit: 20, ...over,
});

describe('Bills: request validation', () => {
  it('accepts an empty request with defaults', () => {
    const r = parseInvoiceFilters(new URLSearchParams());
    expect(r.ok && r.filters.limit).toBe(20);
  });

  it('rejects malformed venue, order, payment, dates and cursor', () => {
    expect(parseInvoiceFilters(new URLSearchParams('venue_id=x')).ok).toBe(false);
    expect(parseInvoiceFilters(new URLSearchParams('order_id=../../etc')).ok).toBe(false);
    expect(parseInvoiceFilters(new URLSearchParams('payment=BITCOIN')).ok).toBe(false);
    expect(parseInvoiceFilters(new URLSearchParams('from=2026-10-09&to=2026-10-01')).ok).toBe(false);
    expect(parseInvoiceFilters(new URLSearchParams('from=2020-01-01&to=2026-10-01')).ok).toBe(false);
    expect(parseInvoiceFilters(new URLSearchParams('before=never')).ok).toBe(false);
  });
});

describe('Bills: every venue the guest paid at, and only theirs', () => {
  it('returns the guest\'s settled bills across venues, newest first', async () => {
    const res = await queryGuestInvoices(seed(), ['@asha'], f());
    expect(res.invoices.map((i) => i.id)).toEqual([O1, O2, O4]);
    expect(res.invoices.map((i) => i.venue_name)).toEqual(['Bombay Rasoi', 'Venus Cafe', 'Venus Cafe']);
  });

  it('excludes other guests\' bills and bills that are not settled', async () => {
    const res = await queryGuestInvoices(seed(), ['@asha'], f());
    expect(res.invoices.some((i) => i.id === O3)).toBe(false);
    expect(res.invoices.some((i) => i.id === O5)).toBe(false);
  });

  it('does not show a bill by id unless it is the guest\'s', async () => {
    const mine = await queryGuestInvoices(seed(), ['@asha'], f({ orderId: O1 }));
    expect(mine.invoices.map((i) => i.id)).toEqual([O1]);
    const theirs = await queryGuestInvoices(seed(), ['@asha'], f({ orderId: O3 }));
    expect(theirs.invoices).toEqual([]);
  });

  it('returns nothing for a handle the device does not own', async () => {
    const res = await queryGuestInvoices(seed(), [], f());
    expect(res.invoices).toEqual([]);
    expect(res.venues).toEqual([]);
  });
});

describe('Bills: each invoice says where it was paid and where its cashback went', () => {
  it('names the venue, its GSTIN and address, and the table and payment', async () => {
    const [o1] = (await queryGuestInvoices(seed(), ['@asha'], f({ orderId: O1 }))).invoices;
    expect(o1.invoice_no).toBe(invoiceNumber(O1));
    expect(o1.venue).toEqual({ name: 'Bombay Rasoi', gstin: '27ABCDE1234F1Z5', address: '12 Link Road, Mumbai, MH, 400053' });
    expect(o1.table_number).toBe('T-01');
    expect(o1.payment_method).toBe('UPI');
    expect(o1.grand_total).toBe(210);
  });

  it('shows the cashback and the wallet it was credited to', async () => {
    const [o1] = (await queryGuestInvoices(seed(), ['@asha'], f({ orderId: O1 }))).invoices;
    expect(o1.cashback).toBe(14);
    expect(o1.cashback_wallet_code).toBe('QW-AAAA1111');
  });

  it('lists the wallet entries the bill produced, in order, with the wallet they hit', async () => {
    const [o2] = (await queryGuestInvoices(seed(), ['@asha'], f({ orderId: O2 }))).invoices;
    expect(o2.ledger).toEqual([expect.objectContaining({
      transaction_type: 'CASHBACK', amount: 30, wallet_code: 'QW-BBBB2222', venue_name: 'Venus Cafe', balance_after: 30,
    })]);
  });

  it('takes line items from the order\'s own rows when the order has no item list', async () => {
    const [o2] = (await queryGuestInvoices(seed(), ['@asha'], f({ orderId: O2 }))).invoices;
    expect(o2.invoice.items).toEqual([expect.objectContaining({ name: 'Thali', qty: 2, price: 240 })]);
  });

  it('a bill with cashback but no session is still the guest\'s', async () => {
    const [o4] = (await queryGuestInvoices(seed(), ['@asha'], f({ orderId: O4 }))).invoices;
    expect(o4.venue_name).toBe('Venus Cafe');
    expect(o4.cashback).toBe(7);
  });
});

describe('Bills: filters, paging and analysis', () => {
  it('filters to one venue', async () => {
    const res = await queryGuestInvoices(seed(), ['@asha'], f({ venueId: VENUE_B }));
    expect(res.invoices.map((i) => i.id)).toEqual([O2, O4]);
  });

  it('filters by payment method', async () => {
    const res = await queryGuestInvoices(seed(), ['@asha'], f({ payment: 'CARD' }));
    expect(res.invoices.map((i) => i.id)).toEqual([O2]);
  });

  it('filters by IST calendar day', async () => {
    const res = await queryGuestInvoices(seed(), ['@asha'], f({ from: '2026-10-07', to: '2026-10-07' }));
    expect(res.invoices.map((i) => i.id)).toEqual([O2]);
  });

  it('pages newest first with a cursor', async () => {
    const db = seed();
    const first = await queryGuestInvoices(db, ['@asha'], f({ limit: 2 }));
    expect(first.invoices.map((i) => i.id)).toEqual([O1, O2]);
    expect(first.has_more).toBe(true);
    const second = await queryGuestInvoices(db, ['@asha'], f({ limit: 2, before: first.next_before }));
    expect(second.invoices.map((i) => i.id)).toEqual([O4]);
    expect(second.has_more).toBe(false);
  });

  it('totals and the venue breakdown cover the whole filter, not just the page', async () => {
    const res = await queryGuestInvoices(seed(), ['@asha'], f({ limit: 1 }));
    expect(res.invoices).toHaveLength(1);
    expect(res.summary).toEqual({ count: 3, paid: 810, cashback: 51 });
    expect(res.venues.map((v) => [v.name, v.count, v.paid, v.cashback])).toEqual([
      ['Bombay Rasoi', 1, 210, 14],
      ['Venus Cafe', 2, 600, 37],
    ]);
  });

  it('shows each venue\'s wallet balance for the venue chips', async () => {
    const res = await queryGuestInvoices(seed(), ['@asha'], f());
    expect(res.venues.map((v) => [v.name, v.balance, v.wallet_code])).toEqual([
      ['Bombay Rasoi', 14, 'QW-AAAA1111'],
      ['Venus Cafe', 37, 'QW-BBBB2222'],
    ]);
  });
});

describe('Bills: CSV export', () => {
  it('writes one row per bill with venue, payment, totals and the wallet it credited', async () => {
    const res = await queryGuestInvoices(seed(), ['@asha'], f());
    const csv = invoicesToCsv(res.invoices);
    const [header, first] = csv.trim().split('\r\n');
    expect(header).toBe('Date (IST),Venue,Invoice,Table,Payment,Subtotal,Discount,GST,Total paid,Cashback,Wallet ID');
    expect(first).toContain('Bombay Rasoi');
    expect(first).toContain(',UPI,200,0,10,210,14,QW-AAAA1111');
  });
});
