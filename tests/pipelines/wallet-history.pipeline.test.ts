import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import {
  historyToCsv, istRangeBounds, parseHistoryFilters, queryWalletHistory, MAX_PAGE,
} from '@/lib/services/wallet/wallet-history.service';

const VENUE_A = 'aaaaaaaa-1111-4222-8333-444444444444';
const VENUE_B = 'bbbbbbbb-1111-4222-8333-444444444444';
const W_A = '10000000-1111-4222-8333-444444444444';
const W_B = '20000000-1111-4222-8333-444444444444';
const W_RAVI = '30000000-1111-4222-8333-444444444444';

const tx = (id: string, wallet: string, type: string, amount: number, when: string, extra: Record<string, unknown> = {}) => ({
  id, wallet_id: wallet, transaction_type: type, amount, balance_before: 0, balance_after: amount,
  table_number: 'T-05', order_id: null, description: `${type} row`, rate: '7%', created_at: when, ...extra,
});

function seed() {
  return createFakeSupabase({
    businesses: [
      { id: VENUE_A, business_name: 'Bombay Rasoi' },
      { id: VENUE_B, business_name: 'Venus Cafe' },
    ],
    guest_wallets: [
      { id: W_A, guest_id: '@asha', business_id: VENUE_A, cafe_id: VENUE_A, balance: 14, total_cashback_earned: 40, wallet_code: 'QW-AAAA1111' },
      { id: W_B, guest_id: '@asha', business_id: VENUE_B, cafe_id: VENUE_B, balance: 30, total_cashback_earned: 30, wallet_code: 'QW-BBBB2222' },
      { id: W_RAVI, guest_id: '@ravi', business_id: VENUE_A, cafe_id: VENUE_A, balance: 500, total_cashback_earned: 500, wallet_code: 'QW-RAVI0000' },
    ],
    wallet_transactions: [
      tx('a1', W_A, 'CASHBACK', 14, '2026-10-08T09:00:00.000Z', { description: '7% Cashback on Table T-05' }),
      tx('a2', W_A, 'REDEMPTION', 14, '2026-10-08T10:00:00.000Z', { description: 'Redeemed ₹14 with code QC-RDM-111111', table_number: 'T-05' }),
      tx('b1', W_B, 'CASHBACK', 30, '2026-10-07T12:00:00.000Z', { description: '7% Cashback on Table T-02', table_number: 'T-02' }),
      tx('r1', W_RAVI, 'CASHBACK', 500, '2026-10-08T11:00:00.000Z', { description: 'someone else' }),
    ],
  });
}

const filters = (overrides: Partial<Parameters<typeof queryWalletHistory>[2]> = {}) => ({
  venueId: null, type: 'ALL' as const, from: null, to: null, q: null, before: null, limit: 25, ...overrides,
});

describe('Wallet history: request validation', () => {
  it('accepts an empty request with sensible defaults', () => {
    const r = parseHistoryFilters(new URLSearchParams());
    expect(r).toEqual({ ok: true, filters: { venueId: null, type: 'ALL', from: null, to: null, q: null, before: null, limit: 25 } });
  });

  it('rejects malformed venue, type, dates and search text', () => {
    expect(parseHistoryFilters(new URLSearchParams('venue_id=not-a-uuid')).ok).toBe(false);
    expect(parseHistoryFilters(new URLSearchParams('type=DROP')).ok).toBe(false);
    expect(parseHistoryFilters(new URLSearchParams('from=2026-02-31')).ok).toBe(false);
    expect(parseHistoryFilters(new URLSearchParams('from=2026-10-09&to=2026-10-01')).ok).toBe(false);
    expect(parseHistoryFilters(new URLSearchParams('from=2024-01-01&to=2026-10-01')).ok).toBe(false);
    expect(parseHistoryFilters(new URLSearchParams('q=a,b(c)')).ok).toBe(false);
    expect(parseHistoryFilters(new URLSearchParams('before=yesterday')).ok).toBe(false);
  });

  it('caps the page size and rejects a non-positive limit', () => {
    const big = parseHistoryFilters(new URLSearchParams('limit=500'));
    expect(big.ok && big.filters.limit).toBe(MAX_PAGE);
    expect(parseHistoryFilters(new URLSearchParams('limit=0')).ok).toBe(false);
  });
});

describe('Wallet history: IST day bounds', () => {
  it('a single IST day runs from its local midnight to the next one (UTC shifted by 5:30)', () => {
    expect(istRangeBounds('2026-10-08', '2026-10-08')).toEqual({
      gte: '2026-10-07T18:30:00.000Z',
      lt: '2026-10-08T18:30:00.000Z',
    });
  });

  it('open-ended ranges leave the other bound null', () => {
    expect(istRangeBounds(null, '2026-10-08').gte).toBeNull();
    expect(istRangeBounds('2026-10-08', null).lt).toBeNull();
  });
});

describe('Wallet history: one guest, every venue they have a wallet at', () => {
  it('returns rows from every venue, each labelled with its venue name and wallet code', async () => {
    const res = await queryWalletHistory(seed(), ['@asha'], filters());
    expect(res.transactions.map((t) => t.id)).toEqual(['a2', 'a1', 'b1']);
    expect(res.transactions.map((t) => t.venue_name)).toEqual(['Bombay Rasoi', 'Bombay Rasoi', 'Venus Cafe']);
    expect(res.transactions[2].wallet_code).toBe('QW-BBBB2222');
  });

  it('never returns another guest\'s activity', async () => {
    const res = await queryWalletHistory(seed(), ['@asha'], filters());
    expect(res.transactions.some((t) => t.id === 'r1')).toBe(false);
    expect(res.venues.map((v) => v.name).sort()).toEqual(['Bombay Rasoi', 'Venus Cafe']);
  });

  it('lists each venue with its balance and earnings for the venue chips', async () => {
    const res = await queryWalletHistory(seed(), ['@asha'], filters());
    expect(res.venues).toEqual([
      { id: VENUE_A, name: 'Bombay Rasoi', wallet_code: 'QW-AAAA1111', balance: 14, total_cashback_earned: 40 },
      { id: VENUE_B, name: 'Venus Cafe', wallet_code: 'QW-BBBB2222', balance: 30, total_cashback_earned: 30 },
    ]);
  });

  it('returns nothing for a guest the device does not own', async () => {
    const res = await queryWalletHistory(seed(), [], filters());
    expect(res.transactions).toEqual([]);
    expect(res.venues).toEqual([]);
  });
});

describe('Wallet history: filters', () => {
  it('filters to one venue', async () => {
    const res = await queryWalletHistory(seed(), ['@asha'], filters({ venueId: VENUE_B }));
    expect(res.transactions.map((t) => t.id)).toEqual(['b1']);
    expect(res.summary.count).toBe(1);
  });

  it('filters by type', async () => {
    const res = await queryWalletHistory(seed(), ['@asha'], filters({ type: 'REDEMPTION' }));
    expect(res.transactions.map((t) => t.id)).toEqual(['a2']);
  });

  it('filters by IST day range', async () => {
    const res = await queryWalletHistory(seed(), ['@asha'], filters({ from: '2026-10-08', to: '2026-10-08' }));
    expect(res.transactions.map((t) => t.id)).toEqual(['a2', 'a1']);
  });

  it('searches description and table text', async () => {
    const byTable = await queryWalletHistory(seed(), ['@asha'], filters({ q: 'T-02' }));
    expect(byTable.transactions.map((t) => t.id)).toEqual(['b1']);
    const byCode = await queryWalletHistory(seed(), ['@asha'], filters({ q: 'qc-rdm-111111' }));
    expect(byCode.transactions.map((t) => t.id)).toEqual(['a2']);
  });

  it('returns no rows, not an error, when nothing matches', async () => {
    const res = await queryWalletHistory(seed(), ['@asha'], filters({ q: 'nothing here' }));
    expect(res.transactions).toEqual([]);
    expect(res.summary.count).toBe(0);
  });
});

describe('Wallet history: paging and totals', () => {
  it('pages by created_at with a cursor and reports when more exist', async () => {
    const db = seed();
    const first = await queryWalletHistory(db, ['@asha'], filters({ limit: 2 }));
    expect(first.transactions.map((t) => t.id)).toEqual(['a2', 'a1']);
    expect(first.has_more).toBe(true);
    expect(first.next_before).toBe('2026-10-08T09:00:00.000Z');

    const second = await queryWalletHistory(db, ['@asha'], filters({ limit: 2, before: first.next_before }));
    expect(second.transactions.map((t) => t.id)).toEqual(['b1']);
    expect(second.has_more).toBe(false);
  });

  it('totals cover the whole filter, not just the page shown', async () => {
    const res = await queryWalletHistory(seed(), ['@asha'], filters({ limit: 1 }));
    expect(res.transactions).toHaveLength(1);
    expect(res.summary).toEqual({ count: 3, earned: 44, used: 14, adjusted: 0 });
  });
});

describe('Wallet history: CSV export', () => {
  const row = (over: Record<string, unknown> = {}) => ({
    id: 'x', venue_id: VENUE_A, venue_name: 'Bombay Rasoi', wallet_code: 'QW-AAAA1111',
    transaction_type: 'REDEMPTION', amount: 14, balance_before: 14, balance_after: 0, table_number: 'T-05',
    order_id: 'order-1', description: 'Redeemed ₹14, code QC-RDM-111111', rate: '100%', created_at: '2026-10-08T10:00:00.000Z',
    ...over,
  });

  it('writes a header and signs redemptions as money out', () => {
    const csv = historyToCsv([row()]);
    const [header, line] = csv.trim().split('\r\n');
    expect(header).toBe('Date (IST),Venue,Wallet ID,Type,Table,Description,Amount,Balance after,Order');
    expect(line).toContain(',REDEMPTION,');
    expect(line).toContain(',-14,0,');
  });

  it('quotes fields that contain commas or quotes', () => {
    const csv = historyToCsv([row({ description: 'Paid "extra", thanks' })]);
    expect(csv).toContain('"Paid ""extra"", thanks"');
  });

  it('neutralises spreadsheet formulas so an exported description cannot run', () => {
    const csv = historyToCsv([row({ description: '=HYPERLINK("http://x")' })]);
    expect(csv).toContain(`'=HYPERLINK`);
    expect(csv).not.toMatch(/(^|,)=HYPERLINK/m);
  });
});
