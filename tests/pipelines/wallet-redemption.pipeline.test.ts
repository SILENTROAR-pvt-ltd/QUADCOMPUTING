import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';

const codes = vi.hoisted(() => ({ queue: [] as string[], fallback: 0 }));
vi.mock('@/lib/services/wallet/redemption-store.util', () => ({
  generateRedemptionCode: () => codes.queue.shift() ?? `QC-RDM-9${String(codes.fallback++).padStart(5, '0')}`,
}));

import { createRedemptionRequest, verifyRedemptionCode } from '@/lib/services/wallet/redemption.service';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const OTHER_BIZ = 'cccccccc-1111-4222-8333-444444444444';
const WALLET_A = '10000000-1111-4222-8333-444444444444';
const WALLET_B = '20000000-1111-4222-8333-444444444444';

function newDb() {
  return createFakeSupabase(
    {
      businesses: [{ id: BIZ, business_name: 'Venus Cafe' }],
      guest_wallets: [
        { id: WALLET_A, guest_id: '@asha', business_id: BIZ, cafe_id: BIZ, balance: 120, total_cashback_earned: 120 },
        { id: WALLET_B, guest_id: '@ravi', business_id: BIZ, cafe_id: BIZ, balance: 80, total_cashback_earned: 80 },
      ],
      wallet_transactions: [],
      wallet_redemptions: [],
    },
    {
      unique: {
        wallet_redemptions: [
          ['code'],
          { cols: ['business_id', 'guest_id'], where: (r) => r.status === 'pending' }, // uq_pending_redemption_per_guest
        ],
      },
    }
  );
}

let db: ReturnType<typeof newDb>;
const create = (guest: string, extra: Record<string, unknown> = {}) =>
  createRedemptionRequest(db, { guest_id: guest, guest_handle: guest, business_id: BIZ, table_number: 'T-04', ...extra });

describe('Wallet redemption pipeline (create -> verify, DB is the source of truth)', () => {
  beforeEach(() => {
    db = newDb();
    codes.queue = [];
    codes.fallback = 0;
  });

  it('creates one pending code for the full balance', async () => {
    codes.queue = ['QC-RDM-111111'];
    const res: any = await create('@asha');

    expect(res.success).toBe(true);
    expect(res.redemption).toMatchObject({ code: 'QC-RDM-111111', amount: 120, status: 'pending', business_id: BIZ, guest_id: '@asha' });
    expect(db.tables.wallet_redemptions).toHaveLength(1);
  });

  it('asking again returns the same live code instead of minting another', async () => {
    const first: any = await create('@asha');
    const second: any = await create('@asha', { amount: 50 });

    expect(second.is_existing).toBe(true);
    expect(second.redemption.code).toBe(first.redemption.code);
    expect(second.redemption.amount).toBe(50);
    expect(db.tables.wallet_redemptions).toHaveLength(1);
  });

  it('never redeems more than the wallet holds, and refuses an empty wallet', async () => {
    const big: any = await create('@asha', { amount: 99999 });
    expect(big.redemption.amount).toBe(120);

    db.tables.guest_wallets[1].balance = 0;
    const empty: any = await create('@ravi');
    expect(empty.success).toBe(false);
  });

  it('an expired pending code is retired so the guest can get a new one', async () => {
    codes.queue = ['QC-RDM-111111', 'QC-RDM-222222'];
    await create('@asha');
    db.tables.wallet_redemptions[0].expires_at = new Date(Date.now() - 1000).toISOString();

    const fresh: any = await create('@asha');
    expect(fresh.redemption.code).toBe('QC-RDM-222222');
    const statuses = db.tables.wallet_redemptions.map((r: any) => r.status).sort();
    expect(statuses).toEqual(['expired', 'pending']);
  });

  it('two guests drawing the same random code both succeed with different codes (collision retry)', async () => {
    codes.queue = ['QC-RDM-111111', 'QC-RDM-111111', 'QC-RDM-222222'];
    const a: any = await create('@asha');
    const b: any = await create('@ravi');

    expect(a.redemption.code).toBe('QC-RDM-111111');
    expect(b.redemption.code).toBe('QC-RDM-222222');
    expect(b.redemption.guest_id).toBe('@ravi');
    // the first guest's record was not overwritten
    expect(db.tables.wallet_redemptions.find((r: any) => r.code === 'QC-RDM-111111')?.guest_id).toBe('@asha');
  });

  it('host verification marks the code verified and is repeatable', async () => {
    codes.queue = ['QC-RDM-111111'];
    await create('@asha');

    const ok: any = await verifyRedemptionCode(db, { code: 'qc-rdm-111111', business_id: BIZ, table_number: 'T-09' });
    expect(ok.success).toBe(true);
    expect(ok.amount).toBe(120);
    expect(db.tables.wallet_redemptions[0]).toMatchObject({ status: 'verified', table_number: 'T-09' });

    const again: any = await verifyRedemptionCode(db, { code: 'QC-RDM-111111', business_id: BIZ });
    expect(again.success).toBe(true);
  });

  it("another venue's host cannot verify the code", async () => {
    codes.queue = ['QC-RDM-111111'];
    await create('@asha');
    const res: any = await verifyRedemptionCode(db, { code: 'QC-RDM-111111', business_id: OTHER_BIZ });

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/not valid for this venue/i);
    expect(db.tables.wallet_redemptions[0].status).toBe('pending');
  });

  it('rejects unknown, expired, cancelled and already-redeemed codes', async () => {
    codes.queue = ['QC-RDM-111111'];
    await create('@asha');
    const row = db.tables.wallet_redemptions[0] as any;

    expect(((await verifyRedemptionCode(db, { code: 'QC-RDM-000000', business_id: BIZ })) as any).success).toBe(false);

    row.status = 'redeemed';
    expect(((await verifyRedemptionCode(db, { code: row.code, business_id: BIZ })) as any).already_redeemed).toBe(true);

    row.status = 'cancelled';
    expect(((await verifyRedemptionCode(db, { code: row.code, business_id: BIZ })) as any).success).toBe(false);

    row.status = 'pending';
    row.expires_at = new Date(Date.now() - 1000).toISOString();
    const expired: any = await verifyRedemptionCode(db, { code: row.code, business_id: BIZ });
    expect(expired.success).toBe(false);
    expect(row.status).toBe('expired');
  });

  it('refuses to verify if the wallet no longer covers the code', async () => {
    codes.queue = ['QC-RDM-111111'];
    await create('@asha');
    db.tables.guest_wallets[0].balance = 10;

    const res: any = await verifyRedemptionCode(db, { code: 'QC-RDM-111111', business_id: BIZ });
    expect(res.success).toBe(false);
    expect(db.tables.wallet_redemptions[0].status).toBe('pending');
  });
});
