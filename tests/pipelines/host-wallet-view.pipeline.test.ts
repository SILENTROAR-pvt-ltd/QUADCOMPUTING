import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { HANDLE_PATTERN, loadGuestWalletForHost } from '@/lib/services/wallet/host-wallet-view.service';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const OTHER = 'cccccccc-1111-4222-8333-444444444444';
const WALLET = '10000000-1111-4222-8333-444444444444';
const OTHER_WALLET = '20000000-1111-4222-8333-444444444444';
const NOW = new Date('2026-10-08T10:00:00Z');
const inOneHour = new Date(NOW.getTime() + 60 * 60 * 1000).toISOString();
const anHourAgo = new Date(NOW.getTime() - 60 * 60 * 1000).toISOString();

function seed(extra: Record<string, any[]> = {}) {
  return createFakeSupabase({
    guest_wallets: [
      { id: WALLET, guest_id: '@asha', business_id: BIZ, cafe_id: BIZ, balance: 14, total_cashback_earned: 40, wallet_code: 'QW-94BC1DA2' },
      { id: OTHER_WALLET, guest_id: '@asha', business_id: OTHER, cafe_id: OTHER, balance: 999, total_cashback_earned: 999, wallet_code: 'QW-OTHER000' },
    ],
    wallet_transactions: [
      { id: 't1', wallet_id: WALLET, transaction_type: 'CASHBACK', amount: 14, balance_after: 14, table_number: 'T-05', created_at: '2026-10-08T09:00:00Z' },
      { id: 't2', wallet_id: OTHER_WALLET, transaction_type: 'CASHBACK', amount: 999, balance_after: 999, table_number: 'T-09', created_at: '2026-10-08T09:30:00Z' },
    ],
    wallet_redemptions: [],
    ...extra,
  });
}

describe('Host wallet view (billing screen, one venue only)', () => {
  it('returns the venue wallet with its unique code and recent history', async () => {
    const view = await loadGuestWalletForHost(seed(), BIZ, '@asha', 8, NOW);
    expect(view.wallet).toMatchObject({ id: WALLET, wallet_code: 'QW-94BC1DA2', balance: 14, total_cashback_earned: 40 });
    expect(view.transactions.map((t) => t.id)).toEqual(['t1']);
    expect(view.transactions[0]).toMatchObject({ transaction_type: 'CASHBACK', amount: 14, table_number: 'T-05' });
  });

  it("never returns another venue's wallet or ledger", async () => {
    const view = await loadGuestWalletForHost(seed(), BIZ, '@asha', 8, NOW);
    expect(view.wallet?.wallet_code).not.toBe('QW-OTHER000');
    expect(view.transactions.some((t) => t.id === 't2')).toBe(false);
  });

  it('a guest with no wallet at this venue gets an empty view, not another venue balance', async () => {
    const view = await loadGuestWalletForHost(seed(), BIZ, '@nobody', 8, NOW);
    expect(view.wallet).toBeNull();
    expect(view.transactions).toEqual([]);
    expect(view.active_redemption).toBeNull();
  });

  it('shows the open redemption code only while it is pending or verified and unexpired', async () => {
    const db = seed({
      wallet_redemptions: [
        { code: 'QC-RDM-111111', guest_id: '@asha', business_id: BIZ, cafe_id: BIZ, amount: 14, status: 'pending', expires_at: inOneHour, created_at: '2026-10-08T09:50:00Z' },
      ],
    });
    const view = await loadGuestWalletForHost(db, BIZ, '@asha', 8, NOW);
    expect(view.active_redemption).toMatchObject({ code: 'QC-RDM-111111', amount: 14, status: 'pending' });
  });

  it('does not show expired, redeemed or other-venue codes', async () => {
    const db = seed({
      wallet_redemptions: [
        { code: 'QC-RDM-222222', guest_id: '@asha', business_id: BIZ, cafe_id: BIZ, amount: 14, status: 'pending', expires_at: anHourAgo, created_at: '2026-10-08T08:00:00Z' },
        { code: 'QC-RDM-333333', guest_id: '@asha', business_id: BIZ, cafe_id: BIZ, amount: 14, status: 'redeemed', expires_at: inOneHour, created_at: '2026-10-08T09:40:00Z' },
        { code: 'QC-RDM-444444', guest_id: '@asha', business_id: OTHER, cafe_id: OTHER, amount: 14, status: 'pending', expires_at: inOneHour, created_at: '2026-10-08T09:45:00Z' },
      ],
    });
    const view = await loadGuestWalletForHost(db, BIZ, '@asha', 8, NOW);
    expect(view.active_redemption).toBeNull();
  });

  it('caps the history at the requested number of rows', async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      id: `h${i}`, wallet_id: WALLET, transaction_type: 'CASHBACK', amount: 1, balance_after: i,
      table_number: 'T-05', created_at: new Date(Date.UTC(2026, 9, 8, 8, i)).toISOString(),
    }));
    const view = await loadGuestWalletForHost(seed({ wallet_transactions: many }), BIZ, '@asha', 5, NOW);
    expect(view.transactions).toHaveLength(5);
  });
});

describe('Guest handle format (host query parameter)', () => {
  it('accepts canonical handles and rejects anything else', () => {
    expect(HANDLE_PATTERN.test('@qacash0810')).toBe(true);
    expect(HANDLE_PATTERN.test('qacash0810')).toBe(false);
    expect(HANDLE_PATTERN.test('@a')).toBe(false);
    expect(HANDLE_PATTERN.test('@bad handle')).toBe(false);
    expect(HANDLE_PATTERN.test("@x' or 1=1")).toBe(false);
  });
});
