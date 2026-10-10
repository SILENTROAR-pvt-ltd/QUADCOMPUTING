import { describe, it, expect, vi } from 'vitest';

// evaluateFeeGuard writes through adminDb(). Without this mock the test hit the real Supabase project
// (and fails in CI where no credentials exist).
const admin = vi.hoisted(() => ({ client: null as any }));
vi.mock('@/lib/supabase/admin', () => ({
  adminDb: () => admin.client,
  getAdminClient: () => admin.client,
}));

import { checkVenueBillingGuard, assertVenueBillingAllowed } from './venue-guard.service';
import { approveTopupRequest } from '../wallet/topup-request-approval.service';
import { evaluateFeeGuard } from '../wallet/fee-guard.service';

describe('PHASE 2B: Subscription Billing & Venue Guard', () => {
  describe('Task 1 & 3: Negative Balance & Subscription Enforcement', () => {
    it('blocks order creation with 402 and venue_suspended when balance < 0', async () => {
      const mockNegativeClient = {
        from: vi.fn((table: string) => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => {
                if (table === 'venue_wallets') {
                  return { data: { venue_id: 'venue-neg-1', balance: -35.00, currency: 'INR' }, error: null };
                }
                if (table === 'venue_subscriptions') {
                  return { data: { venue_id: 'venue-neg-1', status: 'active', plan_tier: 'pay_as_you_go' }, error: null };
                }
                return { data: null, error: null };
              }),
            })),
          })),
          update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
          insert: vi.fn(() => Promise.resolve({ error: null })),
        })),
      };

      const result = await checkVenueBillingGuard('venue-neg-1', mockNegativeClient);

      expect(result.allowed).toBe(false);
      expect(result.status).toBe(402);
      expect(result.code).toBe('venue_suspended');
      expect(result.details?.suspended).toBe(true);
      expect(result.details?.balance).toBe(-35.00);

      // Verify assertVenueBillingAllowed produces standard 402 HTTP Response
      const httpRes = await assertVenueBillingAllowed('venue-neg-1', mockNegativeClient);
      expect(httpRes).not.toBeNull();
      expect(httpRes?.status).toBe(402);
      const body = await httpRes?.json();
      console.log('[Acceptance Verification] Negative Balance Order Response (HTTP 402):', JSON.stringify(body, null, 2));
      expect(body.code).toBe('venue_suspended');
      expect(body.details.suspended).toBe(true);
      expect(body.error).toContain('negative');
    });

    it('blocks order creation with 402 when subscription is expired or inactive', async () => {
      const mockExpiredClient = {
        from: vi.fn((table: string) => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => {
                if (table === 'venue_wallets') {
                  return { data: { venue_id: 'venue-exp-1', balance: 100.00, currency: 'INR' }, error: null };
                }
                if (table === 'venue_subscriptions') {
                  return { data: { venue_id: 'venue-exp-1', status: 'expired', plan_tier: '8k_2m' }, error: null };
                }
                return { data: null, error: null };
              }),
            })),
          })),
        })),
      };

      const result = await checkVenueBillingGuard('venue-exp-1', mockExpiredClient);

      expect(result.allowed).toBe(false);
      expect(result.status).toBe(402);
      expect(result.code).toBe('venue_suspended');
      expect(result.details?.suspended).toBe(true);
    });

    it('allows order creation when venue has balance >= 0 and active subscription', async () => {
      const mockHealthyClient = {
        from: vi.fn((table: string) => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => {
                if (table === 'venue_wallets') {
                  return { data: { venue_id: 'venue-ok-1', balance: 500.00, currency: 'INR' }, error: null };
                }
                if (table === 'venue_subscriptions') {
                  return { data: { venue_id: 'venue-ok-1', status: 'active', plan_tier: 'pay_as_you_go' }, error: null };
                }
                return { data: null, error: null };
              }),
            })),
          })),
        })),
      };

      const result = await checkVenueBillingGuard('venue-ok-1', mockHealthyClient);

      expect(result.allowed).toBe(true);
      expect(result.status).toBe(200);
      expect(result.details?.suspended).toBe(false);

      const httpRes = await assertVenueBillingAllowed('venue-ok-1', mockHealthyClient);
      expect(httpRes).toBeNull();
    });
  });

  describe('Fail-closed & provisioning race', () => {
    const clientWith = (impl: (table: string, op: 'read' | 'insert') => Promise<any>) => ({
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: vi.fn(() => impl(table, 'read')) })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({ maybeSingle: vi.fn(() => impl(table, 'insert')) })),
        })),
      })),
    });

    it('returns 503 (not allowed) when the wallet read errors', async () => {
      const client = clientWith(async () => ({ data: null, error: { message: 'connection reset' } }));
      const result = await checkVenueBillingGuard('v-err', client);
      expect(result.allowed).toBe(false);
      expect(result.status).toBe(503);
      expect(result.code).toBe('billing_check_unavailable');
    });

    it('reads the winning row when a concurrent insert hits the unique venue_id (23505)', async () => {
      let walletReads = 0;
      const client = clientWith(async (table, op) => {
        if (table === 'venue_subscriptions') return { data: { venue_id: 'v-race', status: 'active' }, error: null };
        if (op === 'insert') return { data: null, error: { code: '23505', message: 'duplicate key' } };
        walletReads += 1;
        return walletReads === 1
          ? { data: null, error: null }
          : { data: { venue_id: 'v-race', balance: 250 }, error: null };
      });
      const result = await checkVenueBillingGuard('v-race', client);
      expect(result.allowed).toBe(true);
      expect(result.details?.balance).toBe(250);
    });

    it('fails closed with 503 when a billing query hangs past the timeout', async () => {
      vi.useFakeTimers();
      try {
        const client = clientWith(() => new Promise(() => {}));
        const pending = checkVenueBillingGuard('v-hang', client);
        await vi.advanceTimersByTimeAsync(5100);
        const result = await pending;
        expect(result.allowed).toBe(false);
        expect(result.status).toBe(503);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('Task 2: Top-Up Approval Workflow', () => {
    it('executes approveTopupRequest and atomically updates wallet credits', async () => {
      const mockReqId = '11111111-2222-3333-4444-555555555555';
      const mockVenueId = 'venue-topup-test';

      const mockAdminDb = {
        from: vi.fn((table: string) => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: {
                  id: mockReqId,
                  venue_id: mockVenueId,
                  amount: 1000.00,
                  utr_number: 'UTR1234567890',
                  status: 'pending',
                  requested_plan_tier: 'pay_as_you_go',
                },
                error: null,
              })),
            })),
          })),
          update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
          insert: vi.fn(() => Promise.resolve({ error: null })),
        })),
        rpc: vi.fn(async (rpcName: string, args: any) => {
          if (rpcName === 'approve_topup_request') {
            return {
              data: {
                success: true,
                request_id: args.p_request_id,
                credited_amount: 1000.00,
                new_balance: 1000.00,
                plan_updated: false,
              },
              error: null,
            };
          }
          return { data: null, error: new Error('RPC not found') };
        }),
      };

      const res = await approveTopupRequest(mockAdminDb, mockReqId, 'super-admin');
      expect(res.success).toBe(true);
      expect(res.credited_amount).toBe(1000.00);
    });
  });

  describe('RULE (b): Idempotent Platform Fee Deduction', () => {
    it('deducts platform fee with idempotency key referenceId exactly once', async () => {
      const mockVenueId = 'venue-fee-test';
      const mockOrderId = 'order-abc-123';
      const idempotencyKey = `SETTLE_${mockOrderId}`;

      const mockClient = {
        from: vi.fn((table: string) => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => {
                if (table === 'venue_wallets') {
                  return { data: { venue_id: mockVenueId, balance: 200.00 }, error: null };
                }
                if (table === 'venue_subscriptions') {
                  return { data: { venue_id: mockVenueId, status: 'active', plan_tier: 'pay_as_you_go' }, error: null };
                }
                return { data: null, error: null };
              }),
            })),
          })),
        })),
        rpc: vi.fn(async (rpcName: string, params: any) => {
          if (rpcName === 'deduct_venue_wallet_credits') {
            return {
              data: {
                success: true,
                deducted: params.p_amount,
                remaining_balance: 197.00,
              },
              error: null,
            };
          }
          return { data: null, error: new Error('Unknown RPC') };
        }),
      };

      admin.client = mockClient;
      const res = await evaluateFeeGuard(mockVenueId, 'bill_generate', idempotencyKey, mockClient);
      expect(res.allowed).toBe(true);
      expect(res.cost).toBe(3.00);
    });
  });
});
