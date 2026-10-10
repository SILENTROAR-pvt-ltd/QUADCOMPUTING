import { csvDocument } from '@/lib/utils/csv';

// A guest's wallet history across every venue they have a wallet at, for the Me tab.
// Each row names its venue. Filters: venue, type, date range (venue-local days, IST), text
// search, and cursor paging. The caller must already have proved ownership of the handle
// (wallet claim); this module only reads what that proof covers.

export const HISTORY_TYPES = ['CASHBACK', 'REDEMPTION', 'ADJUSTMENT'] as const;
export type HistoryType = (typeof HISTORY_TYPES)[number];
export type HistoryTypeFilter = 'ALL' | HistoryType;

export interface HistoryFilters {
  venueId: string | null;
  type: HistoryTypeFilter;
  from: string | null; // YYYY-MM-DD, venue day in IST
  to: string | null;   // YYYY-MM-DD, inclusive
  q: string | null;
  before: string | null; // cursor: created_at of the last row shown
  limit: number;
}

export const MAX_PAGE = 50;
export const MAX_EXPORT = 2000;
const MAX_RANGE_DAYS = 370;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
// Search text is limited to characters that cannot break a PostgREST filter expression.
const SAFE_SEARCH = /^[A-Za-z0-9 ._@#\-₹]{1,60}$/;

export type ParseResult = { ok: true; filters: HistoryFilters } | { ok: false; error: string };

export function parseHistoryFilters(params: URLSearchParams): ParseResult {
  const get = (k: string) => (params.get(k) ?? '').trim();

  const venue = get('venue_id');
  if (venue && !UUID.test(venue)) return { ok: false, error: 'venue_id must be a venue id.' };

  const type = (get('type') || 'ALL').toUpperCase();
  if (type !== 'ALL' && !(HISTORY_TYPES as readonly string[]).includes(type)) {
    return { ok: false, error: 'type must be ALL, CASHBACK, REDEMPTION or ADJUSTMENT.' };
  }

  const from = get('from') || null;
  const to = get('to') || null;
  if ((from && !validDay(from)) || (to && !validDay(to))) return { ok: false, error: 'Dates must be YYYY-MM-DD.' };
  if (from && to) {
    if (from > to) return { ok: false, error: '"From" must be on or before "To".' };
    const span = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
    if (span > MAX_RANGE_DAYS) return { ok: false, error: 'Choose a range of at most a year.' };
  }

  const q = get('q') || null;
  if (q && !SAFE_SEARCH.test(q)) return { ok: false, error: 'Search can use letters, numbers, spaces and . _ @ # - ₹ only.' };

  const before = get('before') || null;
  if (before && Number.isNaN(Date.parse(before))) return { ok: false, error: 'before must be a timestamp.' };

  const rawLimit = Number(get('limit') || 25);
  if (!Number.isInteger(rawLimit) || rawLimit < 1) return { ok: false, error: 'limit must be a positive whole number.' };

  return {
    ok: true,
    filters: {
      venueId: venue || null,
      type: type as HistoryTypeFilter,
      from,
      to,
      q,
      before,
      limit: Math.min(rawLimit, MAX_PAGE),
    },
  };
}

export function validDay(day: string): boolean {
  if (!DAY.test(day)) return false;
  const t = Date.parse(`${day}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === day;
}

/** [start, end) of an IST calendar range, as UTC ISO strings. */
export function istRangeBounds(from: string | null, to: string | null): { gte: string | null; lt: string | null } {
  const gte = from ? new Date(Date.parse(`${from}T00:00:00+05:30`)).toISOString() : null;
  const lt = to ? new Date(Date.parse(`${to}T00:00:00+05:30`) + 86_400_000).toISOString() : null;
  return { gte, lt };
}

export interface HistoryRow {
  id: string;
  venue_id: string;
  venue_name: string;
  wallet_code: string | null;
  transaction_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  table_number: string | null;
  order_id: string | null;
  description: string | null;
  rate: string | null;
  created_at: string;
}

export interface HistoryVenue {
  id: string;
  name: string;
  wallet_code: string | null;
  balance: number;
  total_cashback_earned: number;
}

export interface HistoryResult {
  transactions: HistoryRow[];
  venues: HistoryVenue[];
  has_more: boolean;
  next_before: string | null;
  summary: { count: number; earned: number; used: number; adjusted: number };
}

const EMPTY_SUMMARY = { count: 0, earned: 0, used: 0, adjusted: 0 };

const r2 = (n: number) => Math.round(n * 100) / 100;

export async function queryWalletHistory(db: any, guestIds: string[], filters: HistoryFilters): Promise<HistoryResult> {
  const empty: HistoryResult = { transactions: [], venues: [], has_more: false, next_before: null, summary: { ...EMPTY_SUMMARY } };
  if (guestIds.length === 0) return empty;

  // 1. Every wallet this guest has, across venues.
  const { data: wallets, error: walletErr } = await db
    .from('guest_wallets')
    .select('id, guest_id, business_id, cafe_id, balance, total_cashback_earned, wallet_code')
    .in('guest_id', guestIds);
  if (walletErr) throw walletErr;
  const allWallets: any[] = wallets || [];
  if (allWallets.length === 0) return empty;

  const venueOf = (w: any): string => String(w.business_id || w.cafe_id || '');
  const venueIds = Array.from(new Set(allWallets.map(venueOf).filter(Boolean)));

  const { data: businesses, error: bizErr } = await db.from('businesses').select('id, business_name').in('id', venueIds);
  if (bizErr) throw bizErr;
  const nameOf = new Map<string, string>((businesses || []).map((b: any) => [String(b.id), b.business_name || 'Venue']));

  const venues: HistoryVenue[] = venueIds
    .map((id) => {
      const mine = allWallets.filter((w) => venueOf(w) === id);
      return {
        id,
        name: nameOf.get(id) || 'Venue',
        wallet_code: mine[0]?.wallet_code ?? null,
        balance: r2(mine.reduce((s, w) => s + Number(w.balance || 0), 0)),
        total_cashback_earned: r2(mine.reduce((s, w) => s + Number(w.total_cashback_earned || 0), 0)),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // 2. Scope to the venue filter, if one was chosen.
  const scoped = filters.venueId ? allWallets.filter((w) => venueOf(w) === filters.venueId) : allWallets;
  if (scoped.length === 0) return { ...empty, venues };
  const walletIds: string[] = scoped.map((w) => w.id);
  const walletById = new Map<string, any>(scoped.map((w) => [w.id, w]));

  const { gte, lt } = istRangeBounds(filters.from, filters.to);
  const applyFilters = (q: any) => {
    q = q.in('wallet_id', walletIds);
    if (filters.type !== 'ALL') q = q.eq('transaction_type', filters.type);
    if (gte) q = q.gte('created_at', gte);
    if (lt) q = q.lt('created_at', lt);
    if (filters.q) q = q.or(`description.ilike.*${filters.q}*,table_number.ilike.*${filters.q}*`);
    return q;
  };

  // 3. One page, newest first, plus one extra row to know whether another page exists.
  let pageQuery = applyFilters(
    db.from('wallet_transactions')
      .select('id, wallet_id, transaction_type, amount, balance_before, balance_after, table_number, order_id, description, rate, created_at')
  ).order('created_at', { ascending: false }).limit(filters.limit + 1);
  if (filters.before) pageQuery = pageQuery.lt('created_at', filters.before);

  // 4. Totals for the same filter (no paging), capped at the export size.
  const summaryQuery = applyFilters(db.from('wallet_transactions').select('transaction_type, amount')).limit(MAX_EXPORT);

  const [pageRes, summaryRes] = await Promise.all([pageQuery, summaryQuery]);
  if (pageRes.error) throw pageRes.error;
  if (summaryRes.error) throw summaryRes.error;

  const rows: any[] = pageRes.data || [];
  const hasMore = rows.length > filters.limit;
  const page = hasMore ? rows.slice(0, filters.limit) : rows;

  const transactions: HistoryRow[] = page.map((t) => {
    const w = walletById.get(t.wallet_id);
    const venue = w ? venueOf(w) : '';
    return {
      id: t.id,
      venue_id: venue,
      venue_name: nameOf.get(venue) || 'Venue',
      wallet_code: w?.wallet_code ?? null,
      transaction_type: t.transaction_type,
      amount: Number(t.amount || 0),
      balance_before: Number(t.balance_before || 0),
      balance_after: Number(t.balance_after || 0),
      table_number: t.table_number ?? null,
      order_id: t.order_id ?? null,
      description: t.description ?? null,
      rate: t.rate ?? null,
      created_at: t.created_at,
    };
  });

  const summary = { count: 0, earned: 0, used: 0, adjusted: 0 };
  for (const row of (summaryRes.data as any[]) || []) {
    const amount = Number(row.amount || 0);
    summary.count += 1;
    if (row.transaction_type === 'CASHBACK') summary.earned += amount;
    else if (row.transaction_type === 'REDEMPTION') summary.used += amount;
    else summary.adjusted += amount;
  }

  return {
    transactions,
    venues,
    has_more: hasMore,
    next_before: hasMore && transactions.length ? transactions[transactions.length - 1].created_at : null,
    summary: { count: summary.count, earned: r2(summary.earned), used: r2(summary.used), adjusted: r2(summary.adjusted) },
  };
}

const CSV_HEADER = ['Date (IST)', 'Venue', 'Wallet ID', 'Type', 'Table', 'Description', 'Amount', 'Balance after', 'Order'];

export function historyToCsv(rows: HistoryRow[]): string {
  const when = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return csvDocument(CSV_HEADER, rows.map((r) => [
    when(r.created_at), r.venue_name, r.wallet_code, r.transaction_type, r.table_number, r.description,
    // Money out is negative; written as a plain number so spreadsheets read it as a value.
    Number((r.transaction_type === 'REDEMPTION' ? -Math.abs(r.amount) : r.amount).toFixed(2)),
    Number(r.balance_after.toFixed(2)), r.order_id,
  ]));
}
