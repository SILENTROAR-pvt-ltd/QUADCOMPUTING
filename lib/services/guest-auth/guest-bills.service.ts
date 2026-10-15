// A guest's settled bills (invoices) across every venue they have paid at.
//
// A bill belongs to the guest only on evidence written for that guest when the bill was settled:
//   - a cashback or redemption entry for the bill on one of the guest's own wallets, or
//   - the bill's guest_handle, stamped at settlement (column added by migration 20261010000017).
// The dine-in session's guest_handle is NOT evidence: it is shared by everyone at the table and
// used to be overwritten by whoever scanned last, which showed one guest another guest's bills.
// The invoice is the same receipt the host prints: it is built from the settled order row.
//
// The caller must already have proved ownership of the handles (wallet claim). Nothing here
// reads outside that set.
import type { InvoiceData, InvoiceItem } from '@/lib/utils/receipt-adapter';
import { istRangeBounds, validDay } from '@/lib/services/wallet/wallet-history.service';
import { csvDocument } from '@/lib/utils/csv';

export const SETTLED_STATUSES = ['settled', 'SETTLED', 'completed', 'COMPLETED', 'paid', 'PAID'];
export const PAYMENTS = ['UPI', 'CASH', 'CARD', 'SPLIT', 'WALLET'] as const;
export const MAX_PAGE = 50;
export const MAX_EXPORT = 2000;
const MAX_RANGE_DAYS = 370;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Venue identity printed on the invoice. The venue UPI is deliberately not included. */
export interface GuestVenue {
  name: string;
  gstin: string | null;
  address: string | null;
}

export interface InvoiceLedgerEntry {
  id: string;
  wallet_code: string | null;
  venue_id: string;
  venue_name: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  created_at: string;
}

export interface GuestInvoice {
  id: string;
  invoice_no: string;
  venue_id: string;
  venue_name: string;
  venue: GuestVenue;
  created_at: string;
  table_number: string | null;
  payment_method: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  grand_total: number;
  /** Cashback credited for this bill, and the wallet it went to. */
  cashback: number;
  cashback_wallet_code: string | null;
  /** The wallet entries that belong to this bill: its cashback and any redemption. */
  ledger: InvoiceLedgerEntry[];
  /** The receipt, in the shape the host's receipt component renders. */
  invoice: InvoiceData;
}

export interface InvoiceFilters {
  venueId: string | null;
  from: string | null;
  to: string | null;
  payment: 'ALL' | (typeof PAYMENTS)[number];
  orderId: string | null;
  before: string | null;
  limit: number;
}

export interface VenueInvoiceStats {
  id: string;
  name: string;
  count: number;
  paid: number;
  cashback: number;
  balance: number;
  wallet_code: string | null;
}

export interface InvoiceResult {
  invoices: GuestInvoice[];
  venues: VenueInvoiceStats[];
  summary: { count: number; paid: number; cashback: number };
  has_more: boolean;
  next_before: string | null;
}

export type ParseInvoiceResult = { ok: true; filters: InvoiceFilters } | { ok: false; error: string };

export function parseInvoiceFilters(params: URLSearchParams): ParseInvoiceResult {
  const get = (k: string) => (params.get(k) ?? '').trim();

  const venue = get('venue_id');
  if (venue && !UUID.test(venue)) return { ok: false, error: 'venue_id must be a venue id.' };
  const order = get('order_id');
  if (order && !UUID.test(order)) return { ok: false, error: 'order_id must be an invoice id.' };

  const payment = (get('payment') || 'ALL').toUpperCase();
  if (payment !== 'ALL' && !(PAYMENTS as readonly string[]).includes(payment)) {
    return { ok: false, error: 'payment must be ALL, UPI, CASH, CARD, SPLIT or WALLET.' };
  }

  const from = get('from') || null;
  const to = get('to') || null;
  if ((from && !validDay(from)) || (to && !validDay(to))) return { ok: false, error: 'Dates must be YYYY-MM-DD.' };
  if (from && to) {
    if (from > to) return { ok: false, error: '"From" must be on or before "To".' };
    const span = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
    if (span > MAX_RANGE_DAYS) return { ok: false, error: 'Choose a range of at most a year.' };
  }

  const before = get('before') || null;
  if (before && Number.isNaN(Date.parse(before))) return { ok: false, error: 'before must be a timestamp.' };

  const rawLimit = Number(get('limit') || 20);
  if (!Number.isInteger(rawLimit) || rawLimit < 1) return { ok: false, error: 'limit must be a positive whole number.' };

  return {
    ok: true,
    filters: {
      venueId: venue || null,
      from,
      to,
      payment: payment as InvoiceFilters['payment'],
      orderId: order || null,
      before,
      limit: Math.min(rawLimit, MAX_PAGE),
    },
  };
}

/** Mirrors the number ThermalReceiptView prints as "Invoice No". */
export function invoiceNumber(orderId: string) {
  return orderId.includes('-') ? orderId.split('-')[0].toUpperCase() : orderId.slice(0, 10).toUpperCase();
}

const num = (v: unknown) => Number(v) || 0;
const r2 = (n: number) => Math.round(n * 100) / 100;
const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

function inList(ids: string[]) {
  return `(${ids.map((id) => `"${id}"`).join(',')})`;
}

const MISSING_COLUMN = new Set(['42703', 'PGRST204']);

/** True once migration 20261010000017 has added orders.guest_handle (the guest a bill was settled to). */
export async function hasBillOwnerColumn(db: any): Promise<boolean> {
  const { error } = await db.from('orders').select('guest_handle').limit(1);
  if (!error) return true;
  if (MISSING_COLUMN.has(error.code)) return false;
  throw error;
}

function itemsFromOrderJson(order: any): InvoiceItem[] {
  if (!Array.isArray(order.items) || order.items.length === 0) return [];
  return order.items.map((i: any) => ({
    id: i.id,
    name: String(i.name || i.item_name || 'Item'),
    price: num(i.price) || num(i.unit_price),
    qty: num(i.qty) || num(i.quantity) || 1,
    notes: text(i.notes) || undefined,
    section: text(i.section) || undefined,
  }));
}

function itemsFromOrderRows(rows: any[]): InvoiceItem[] {
  return rows.map((r) => ({
    id: r.id,
    name: String(r.item_name || r.name || 'Item'),
    price: num(r.price) || num(r.unit_price),
    qty: num(r.quantity) || num(r.qty) || 1,
  }));
}

export async function loadVenueIdentity(db: any, businessId: string): Promise<GuestVenue> {
  const [bizRes, locRes] = await Promise.all([
    db.from('businesses').select('business_name, gst_number').eq('id', businessId).maybeSingle(),
    db.from('locations').select('*').eq('business_id', businessId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const biz = bizRes?.data || {};
  const loc = locRes?.data || {};
  const address = [loc.address || loc.address_line1 || loc.street, loc.city, loc.state, loc.pincode || loc.postal_code]
    .map(text)
    .filter(Boolean)
    .join(', ');
  return {
    name: text(biz.business_name) || text(loc.branch_name) || 'Venue',
    gstin: text(biz.gst_number)?.toUpperCase() || null,
    address: address || null,
  };
}

/** Invoices for the guest's handles across venues, newest first, with the venue breakdown. */
export async function queryGuestInvoices(db: any, guestIds: string[], filters: InvoiceFilters): Promise<InvoiceResult> {
  const empty: InvoiceResult = { invoices: [], venues: [], summary: { count: 0, paid: 0, cashback: 0 }, has_more: false, next_before: null };
  if (guestIds.length === 0) return empty;

  // 1. The guest's wallets across venues, and whether bills carry their settled guest (migration 20261010000017).
  const [walletsRes, ownerColumn] = await Promise.all([
    db.from('guest_wallets').select('id, guest_id, business_id, cafe_id, balance, wallet_code').in('guest_id', guestIds),
    hasBillOwnerColumn(db),
  ]);
  if (walletsRes.error) throw walletsRes.error;

  const wallets: any[] = walletsRes.data || [];
  const walletIds = wallets.map((w) => w.id);
  const venueOf = (w: any): string => String(w.business_id || w.cafe_id || '');
  const walletCodeById = new Map<string, string | null>(wallets.map((w) => [w.id, w.wallet_code ?? null]));
  const walletVenueById = new Map<string, string>(wallets.map((w) => [w.id, venueOf(w)]));
  const venueIds = Array.from(new Set(wallets.map(venueOf).filter(Boolean)));

  const nameOf = new Map<string, string>();
  if (venueIds.length) {
    const { data: businesses, error } = await db.from('businesses').select('id, business_name').in('id', venueIds);
    if (error) throw error;
    for (const b of businesses || []) nameOf.set(String(b.id), b.business_name || 'Venue');
  }

  // 2. The guest's own wallet entries for bills: cashback (and where it went) and redemptions.
  const cashbackByOrder = new Map<string, { amount: number; wallet_id: string }>();
  const ledgerOrderIds = new Set<string>();
  if (walletIds.length) {
    const { data: ledgerRows, error } = await db
      .from('wallet_transactions')
      .select('order_id, wallet_id, amount, transaction_type')
      .in('wallet_id', walletIds)
      .in('transaction_type', ['CASHBACK', 'REDEMPTION'])
      .limit(5000);
    if (error) throw error;
    for (const row of ledgerRows || []) {
      if (!row.order_id) continue;
      ledgerOrderIds.add(row.order_id);
      if (row.transaction_type !== 'CASHBACK') continue;
      const prev = cashbackByOrder.get(row.order_id);
      cashbackByOrder.set(row.order_id, { amount: (prev?.amount || 0) + num(row.amount), wallet_id: prev?.wallet_id || row.wallet_id });
    }
  }

  // 3. A bill is the guest's if their wallet holds an entry for it, or it was settled to their handle.
  const clauses: string[] = [];
  if (ledgerOrderIds.size) clauses.push(`id.in.${inList(Array.from(ledgerOrderIds))}`);
  if (ownerColumn) clauses.push(`guest_handle.in.${inList(guestIds)}`);

  const venueStats = new Map<string, VenueInvoiceStats>();
  for (const id of venueIds) {
    const mine = wallets.filter((w) => venueOf(w) === id);
    venueStats.set(id, {
      id, name: nameOf.get(id) || 'Venue', count: 0, paid: 0, cashback: 0,
      balance: r2(mine.reduce((s, w) => s + num(w.balance), 0)),
      wallet_code: mine[0]?.wallet_code ?? null,
    });
  }
  const venuesOut = () => Array.from(venueStats.values()).map((v) => ({ ...v, paid: r2(v.paid), cashback: r2(v.cashback) })).sort((a, b) => a.name.localeCompare(b.name));
  if (clauses.length === 0) return { ...empty, venues: venuesOut() };

  // Filters shared by the totals query and the page query.
  const { gte, lt } = istRangeBounds(filters.from, filters.to);
  const candidates = (cols: string) => {
    let q = db.from('orders').select(cols).in('status', SETTLED_STATUSES).or(clauses.join(','));
    if (filters.venueId) q = q.eq('business_id', filters.venueId);
    if (filters.payment !== 'ALL') q = q.eq('payment_method', filters.payment);
    if (filters.orderId) q = q.eq('id', filters.orderId);
    if (gte) q = q.gte('created_at', gte);
    if (lt) q = q.lt('created_at', lt);
    return q;
  };

  const [summaryRes, pageRes] = await Promise.all([
    candidates('id, business_id, grand_total, created_at').order('created_at', { ascending: false }).limit(MAX_EXPORT),
    (filters.before ? candidates('*').lt('created_at', filters.before) : candidates('*'))
      .order('created_at', { ascending: false })
      .limit(filters.limit + 1),
  ]);
  if (summaryRes.error) throw summaryRes.error;
  if (pageRes.error) throw pageRes.error;

  // 4. Totals and the venue breakdown for the same filter.
  const summary = { count: 0, paid: 0, cashback: 0 };
  for (const o of (summaryRes.data as any[]) || []) {
    const paid = num(o.grand_total);
    const cb = cashbackByOrder.get(o.id)?.amount || 0;
    summary.count += 1;
    summary.paid += paid;
    summary.cashback += cb;
    const venueId = String(o.business_id);
    if (!venueStats.has(venueId)) {
      // A bill at a venue where the guest has no wallet (cashback was off there).
      venueStats.set(venueId, { id: venueId, name: 'Venue', count: 0, paid: 0, cashback: 0, balance: 0, wallet_code: null });
    }
    const venue = venueStats.get(venueId)!;
    venue.count += 1;
    venue.paid += paid;
    venue.cashback += cb;
  }

  // Names for every venue shown, including those found only through bills.
  const unnamed = Array.from(venueStats.keys()).filter((id) => !nameOf.has(id));
  if (unnamed.length) {
    const { data: extra, error } = await db.from('businesses').select('id, business_name').in('id', unnamed);
    if (error) throw error;
    for (const b of extra || []) nameOf.set(String(b.id), b.business_name || 'Venue');
    venueStats.forEach((v, id) => { v.name = nameOf.get(id) || 'Venue'; });
  }

  // 5. The page, with line items, venue identity and the bill's ledger entries.
  const rows: any[] = pageRes.data || [];
  const hasMore = rows.length > filters.limit;
  const page = hasMore ? rows.slice(0, filters.limit) : rows;
  const pageIds = page.map((o) => o.id);

  const needRows = page.filter((o) => itemsFromOrderJson(o).length === 0).map((o) => o.id);
  const rowsByOrder = new Map<string, any[]>();
  const ledgerByOrder = new Map<string, InvoiceLedgerEntry[]>();
  const [itemRes, ledgerRes] = await Promise.all([
    needRows.length
      ? db.from('order_items').select('*').in('order_id', needRows)
      : Promise.resolve({ data: [], error: null }),
    pageIds.length && walletIds.length
      ? db.from('wallet_transactions')
          .select('id, wallet_id, order_id, transaction_type, amount, balance_after, created_at')
          .in('wallet_id', walletIds)
          .in('order_id', pageIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (itemRes.error) throw itemRes.error;
  if (ledgerRes.error) throw ledgerRes.error;
  for (const r of (itemRes.data as any[]) || []) rowsByOrder.set(r.order_id, [...(rowsByOrder.get(r.order_id) || []), r]);
  for (const t of (ledgerRes.data as any[]) || []) {
    const venue = walletVenueById.get(t.wallet_id) || '';
    const entry: InvoiceLedgerEntry = {
      id: t.id,
      wallet_code: walletCodeById.get(t.wallet_id) ?? null,
      venue_id: venue,
      venue_name: nameOf.get(venue) || 'Venue',
      transaction_type: t.transaction_type,
      amount: num(t.amount),
      balance_after: num(t.balance_after),
      created_at: t.created_at,
    };
    ledgerByOrder.set(t.order_id, [...(ledgerByOrder.get(t.order_id) || []), entry]);
  }

  const venueIdentity = new Map<string, GuestVenue>();
  const pageVenues = Array.from(new Set(page.map((o) => String(o.business_id)).filter(Boolean)));
  await Promise.all(pageVenues.map(async (id) => venueIdentity.set(id, await loadVenueIdentity(db, id))));

  const invoices: GuestInvoice[] = page.map((o) => {
    const venueId = String(o.business_id);
    const items = itemsFromOrderJson(o);
    const lineItems = items.length ? items : itemsFromOrderRows(rowsByOrder.get(o.id) || []);
    const grandTotal = num(o.grand_total) || num(o.total_amount);
    const cb = cashbackByOrder.get(o.id);
    const venue = venueIdentity.get(venueId) || { name: nameOf.get(venueId) || 'Venue', gstin: null, address: null };
    const name = nameOf.get(venueId) || venue.name;
    return {
      id: o.id,
      invoice_no: invoiceNumber(o.id),
      venue_id: venueId,
      venue_name: name,
      venue: { ...venue, name },
      created_at: o.created_at,
      table_number: text(o.table_number),
      payment_method: text(o.payment_method) || 'SETTLED',
      subtotal: num(o.subtotal),
      discount_amount: num(o.discount_amount),
      tax_amount: num(o.tax_amount),
      grand_total: grandTotal,
      cashback: r2(cb?.amount || 0),
      cashback_wallet_code: cb ? walletCodeById.get(cb.wallet_id) ?? null : null,
      ledger: (ledgerByOrder.get(o.id) || []).sort((a, b) => a.created_at.localeCompare(b.created_at)),
      invoice: {
        id: o.id,
        created_at: o.created_at,
        guest_name: text(o.customer_name) || undefined,
        guest_phone: text(o.customer_phone) || undefined,
        table_number: text(o.table_number) || undefined,
        payment_method: text(o.payment_method) || 'SETTLED',
        items: lineItems,
        subtotal: num(o.subtotal),
        discountType: o.discount_type === 'percentage' ? 'percentage' : 'flat',
        discountValue: num(o.discount_value),
        discountAmount: num(o.discount_amount),
        taxAmount: num(o.tax_amount),
        grandTotal,
        isReadOnly: true,
      },
    };
  });

  return {
    invoices,
    venues: venuesOut(),
    summary: { count: summary.count, paid: r2(summary.paid), cashback: r2(summary.cashback) },
    has_more: hasMore,
    next_before: hasMore && invoices.length ? invoices[invoices.length - 1].created_at : null,
  };
}

export interface SettledOrderBill {
  id: string;
  invoice_no: string;
  venue: GuestVenue;
  created_at: string;
  table_number: string | null;
  payment_method: string;
  grand_total: number;
  invoice: InvoiceData;
}

const tableKey = (v: unknown) => String(v ?? '').toLowerCase().replace(/^table\s*/, '').replace(/[^a-z0-9]/g, '');

/** How long after settling a device may still fetch its own bill. */
export const SETTLED_BILL_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * The bill the venue generated for one settled order, in the shape the host's receipt renders (same items, discount, GST and
 * invoice number). Only a device that can name the order id gets it, and only for the venue and table it asks about, so the
 * next party at a table cannot read the previous party's bill. The guest's phone number is left off.
 */
export async function loadSettledOrderBill(db: any, businessId: string, orderId: string, table: string, now: Date = new Date()): Promise<SettledOrderBill | null> {
  if (!UUID.test(orderId)) return null;
  const { data: o, error } = await db.from('orders').select('*').eq('id', orderId).eq('business_id', businessId).maybeSingle();
  if (error) throw error;
  if (!o || !SETTLED_STATUSES.includes(String(o.status))) return null;
  if (tableKey(o.table_number) !== tableKey(table)) return null;
  const settledAt = Date.parse(o.updated_at || o.created_at);
  if (Number.isFinite(settledAt) && now.getTime() - settledAt > SETTLED_BILL_WINDOW_MS) return null;

  let items = itemsFromOrderJson(o);
  if (items.length === 0) {
    const { data: rows, error: itemErr } = await db.from('order_items').select('*').eq('order_id', orderId);
    if (itemErr) throw itemErr;
    items = itemsFromOrderRows(rows || []);
  }
  const venue = await loadVenueIdentity(db, businessId);
  const grandTotal = num(o.grand_total) || num(o.total_amount);
  return {
    id: o.id,
    invoice_no: invoiceNumber(o.id),
    venue,
    created_at: o.created_at,
    table_number: text(o.table_number),
    payment_method: text(o.payment_method) || 'SETTLED',
    grand_total: grandTotal,
    invoice: {
      id: o.id,
      created_at: o.created_at,
      guest_name: text(o.customer_name) || undefined,
      table_number: text(o.table_number) || undefined,
      payment_method: text(o.payment_method) || 'SETTLED',
      items,
      subtotal: num(o.subtotal),
      discountType: o.discount_type === 'percentage' ? 'percentage' : 'flat',
      discountValue: num(o.discount_value),
      discountAmount: num(o.discount_amount),
      taxAmount: num(o.tax_amount),
      grandTotal,
      isReadOnly: true,
    },
  };
}
const CSV_HEADER = ['Date (IST)', 'Venue', 'Invoice', 'Table', 'Payment', 'Subtotal', 'Discount', 'GST', 'Total paid', 'Cashback', 'Wallet ID'];

export function invoicesToCsv(invoices: GuestInvoice[]): string {
  const when = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return csvDocument(CSV_HEADER, invoices.map((i) => [
    when(i.created_at), i.venue_name, i.invoice_no, i.table_number, i.payment_method,
    r2(i.subtotal), r2(i.discount_amount), r2(i.tax_amount), r2(i.grand_total), r2(i.cashback), i.cashback_wallet_code,
  ]));
}
