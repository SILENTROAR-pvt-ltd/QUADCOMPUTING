import { describe, it, expect, beforeEach } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { assertRedemptionSettleable, RedemptionSettlementError, verifyRedemptionCode } from '@/lib/services/wallet/redemption.service';
import { getGuestWallet, WalletStoreError } from '@/lib/services/wallet/cashback.service';
import { inMemoryWallets } from '@/lib/services/wallet/cashback-ledger.util';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const OTHER_BIZ = 'cccccccc-1111-4222-8333-444444444444';
const WALLET = '10000000-1111-4222-8333-444444444444';
const FUTURE = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();
const PAST = () => new Date(Date.now() - 1000).toISOString();

function seed(redemption: Record<string, unknown> = {}) {
  return createFakeSupabase({
    guest_wallets: [{ id: WALLET, guest_id: '@asha', business_id: BIZ, cafe_id: BIZ, balance: 120, total_cashback_earned: 120, wallet_code: 'QW-3F2A9C1B' }],
    wallet_redemptions: [{
      id: 'r-1', code: 'QC-RDM-111111', wallet_id: WALLET, guest_id: '@asha', guest_handle: '@asha',
      business_id: BIZ, cafe_id: BIZ, amount: 120, status: 'pending', expires_at: FUTURE(), created_at: new Date().toISOString(),
      ...redemption,
    }],
    wallet_transactions: [],
  });
}

const check = (db: any, discountAmount: number, subtotal?: number) =>
  assertRedemptionSettleable(db, { code: 'QC-RDM-111111', businessId: BIZ, discountAmount, subtotal });

async function expectCode(promise: Promise<unknown>, code: string) {
  const err = await promise.then(() => null, (e) => e);
  expect(err).toBeInstanceOf(RedemptionSettlementError);
  expect((err as RedemptionSettlementError).code).toBe(code);
  expect((err as RedemptionSettlementError).status).toBe(409);
}

describe('Redemption settlement guard (checked before the bill is written)', () => {
  let db: ReturnType<typeof seed>;
  beforeEach(() => { db = seed(); });

  it('accepts a discount that is above zero, within the code and within the bill', async () => {
    const { applied, record } = await check(db, 80, 200);
    expect(applied).toBe(80);
    expect(record.code).toBe('QC-RDM-111111');
  });

  it('accepts the full code value', async () => {
    expect((await check(db, 120, 500)).applied).toBe(120);
  });

  it('refuses a bill with no wallet discount applied', async () => {
    await expectCode(check(db, 0, 200), 'REDEMPTION_NOT_APPLIED');
  });

  it('refuses a discount larger than the code is worth', async () => {
    await expectCode(check(db, 121, 500), 'REDEMPTION_EXCEEDS_CODE');
  });

  it('refuses a discount larger than the bill subtotal', async () => {
    await expectCode(check(db, 120, 100), 'REDEMPTION_EXCEEDS_BILL');
  });

  it('refuses an expired code, even while its row still says pending', async () => {
    db = seed({ expires_at: PAST() });
    await expectCode(check(db, 50, 200), 'REDEMPTION_EXPIRED');
  });

  it('refuses a cancelled or expired-status code', async () => {
    db = seed({ status: 'cancelled' });
    await expectCode(check(db, 50, 200), 'REDEMPTION_NOT_USABLE');
    db = seed({ status: 'expired' });
    await expectCode(check(db, 50, 200), 'REDEMPTION_NOT_USABLE');
  });

  it('refuses a code already used on another bill', async () => {
    db = seed({ status: 'redeemed', redeemed_at: new Date().toISOString() });
    await expectCode(check(db, 50, 200), 'REDEMPTION_ALREADY_USED');
  });

  it('a retry of the same order after its own settlement is a replay, not a second use', async () => {
    const ORDER = '55555555-1111-4222-8333-444444444444';
    db = seed({ status: 'redeemed', redeemed_at: new Date().toISOString(), order_id: ORDER, applied_amount: 40 });

    const res = await assertRedemptionSettleable(db, { code: 'QC-RDM-111111', businessId: BIZ, orderId: ORDER, discountAmount: 40 });
    expect(res.replay).toBe(true);
    expect(res.applied).toBe(40);
  });

  it('a redeemed code is still refused for a different order', async () => {
    db = seed({ status: 'redeemed', redeemed_at: new Date().toISOString(), order_id: '55555555-1111-4222-8333-444444444444', applied_amount: 40 });
    await expectCode(
      assertRedemptionSettleable(db, { code: 'QC-RDM-111111', businessId: BIZ, orderId: '66666666-1111-4222-8333-444444444444', discountAmount: 40 }),
      'REDEMPTION_ALREADY_USED'
    );
  });

  it("refuses another venue's code", async () => {
    await expectCode(assertRedemptionSettleable(db, { code: 'QC-RDM-111111', businessId: OTHER_BIZ, discountAmount: 50 }), 'REDEMPTION_NOT_FOUND');
  });

  it('matches the venue id regardless of letter case', async () => {
    const { applied } = await assertRedemptionSettleable(db, { code: 'qc-rdm-111111', businessId: BIZ.toUpperCase(), discountAmount: 50 });
    expect(applied).toBe(50);
  });

  it('does not write anything while checking', async () => {
    await check(db, 50, 200);
    expect(db.tables.wallet_redemptions[0].status).toBe('pending');
    expect(db.tables.guest_wallets[0].balance).toBe(120);
  });
});

describe('Host verification carries the wallet code', () => {
  it('returns the wallet code the host can match against the guest', async () => {
    const db = seed();
    const res: any = await verifyRedemptionCode(db, { code: 'QC-RDM-111111', business_id: BIZ, table_number: 'T-02' });
    expect(res.success).toBe(true);
    expect(res.wallet_code).toBe('QW-3F2A9C1B');
    expect(res.amount).toBe(120);
  });
});

describe('Wallet read is database-only', () => {
  beforeEach(() => inMemoryWallets.clear());

  it('a guest with no wallet row gets an empty wallet, never an in-memory one', async () => {
    inMemoryWallets.set(`@ghost_${BIZ}`, { id: 'mem-1', guest_id: '@ghost', business_id: BIZ, cafe_id: BIZ, balance: 999, total_cashback_earned: 999 } as any);
    const db = createFakeSupabase({ guest_wallets: [], wallet_transactions: [] });

    const res: any = await getGuestWallet(db, '@ghost', BIZ);
    expect(res.wallet.balance).toBe(0);
    expect(res.wallet.id).toBeNull();
    expect(res.wallet.wallet_code).toBeNull();
  });

  it('a read error is thrown, not replaced by a memory balance', async () => {
    inMemoryWallets.set(`@asha_${BIZ}`, { id: 'mem-2', guest_id: '@asha', business_id: BIZ, cafe_id: BIZ, balance: 500, total_cashback_earned: 500 } as any);
    const db = createFakeSupabase(
      { guest_wallets: [{ id: WALLET, guest_id: '@asha', business_id: BIZ, cafe_id: BIZ, balance: 120 }], wallet_transactions: [] },
      { failOn: { 'guest_wallets.select': () => true } }
    );
    await expect(getGuestWallet(db, '@asha', BIZ)).rejects.toBeInstanceOf(WalletStoreError);
  });

  it('returns the stored wallet id and code', async () => {
    const db = seed();
    const res: any = await getGuestWallet(db, '@asha', BIZ);
    expect(res.wallet).toMatchObject({ id: WALLET, wallet_code: 'QW-3F2A9C1B', balance: 120 });
  });
});
