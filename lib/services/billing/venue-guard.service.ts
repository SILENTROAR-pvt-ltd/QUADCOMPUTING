import { NextResponse } from 'next/server';
import { adminDb } from '../../supabase/admin';

export interface VenueGuardCheckResult {
  allowed: boolean;
  status: number;
  code?: 'venue_suspended' | 'venue_not_found' | 'billing_check_unavailable';
  reason?: string;
  details?: {
    balance?: number;
    subscription_status?: string;
    suspended?: boolean;
    venue_id?: string;
  };
}

const BILLING_QUERY_TIMEOUT_MS = 5000;

function withTimeout<T>(work: PromiseLike<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`billing query timed out after ${ms}ms`)), ms);
  });
  return Promise.race([Promise.resolve(work), timeout]).finally(() => clearTimeout(timer));
}

/**
 * Insert a default row; if a concurrent request won the race (unique venue_id -> 23505),
 * read the winner's row instead of fabricating one.
 */
async function provisionRow(client: any, table: string, venueId: string, defaults: Record<string, unknown>) {
  const { data, error } = await client
    .from(table)
    .insert({ venue_id: venueId, ...defaults })
    .select('*')
    .maybeSingle();
  if (data) return data;
  if (error && error.code !== '23505') throw error;

  const { data: existing, error: readErr } = await client.from(table).select('*').eq('venue_id', venueId).maybeSingle();
  if (readErr) throw readErr;
  if (!existing) throw new Error(`${table} row missing after provisioning for ${venueId}`);
  return existing;
}

/**
 * Checks venue wallet balance and subscription status.
 * RULES:
 *  - Zero guest checkout / order creation if venue wallet balance < 0 or subscription is inactive.
 *  - Flags venue status as suspended when balance drops below ₹0.
 *  - Standardized 402 Payment Required response with code: 'venue_suspended'.
 */
export async function checkVenueBillingGuard(
  venueId: string,
  supabaseClient?: any
): Promise<VenueGuardCheckResult> {
  if (!venueId) {
    return {
      allowed: false,
      status: 400,
      reason: 'Missing venueId for billing verification',
    };
  }

  const client = supabaseClient || adminDb();

  let wallet: any;
  let subscription: any;
  try {
    // 1. Fetch wallet & subscription records (bounded: a hung query must not hang every order)
    const [walletRes, subRes] = await withTimeout(
      Promise.all([
        client.from('venue_wallets').select('*').eq('venue_id', venueId).maybeSingle(),
        client.from('venue_subscriptions').select('*').eq('venue_id', venueId).maybeSingle(),
      ]),
      BILLING_QUERY_TIMEOUT_MS
    );
    if (walletRes.error) throw walletRes.error;
    if (subRes.error) throw subRes.error;

    wallet = walletRes.data;
    subscription = subRes.data;

    // Auto-provision default wallet & trial subscription if none exist yet
    if (!wallet) {
      wallet = await withTimeout(
        provisionRow(client, 'venue_wallets', venueId, { balance: 0.0, currency: 'INR' }),
        BILLING_QUERY_TIMEOUT_MS
      );
    }
    if (!subscription) {
      subscription = await withTimeout(
        provisionRow(client, 'venue_subscriptions', venueId, { plan_tier: 'pay_as_you_go', status: 'trial' }),
        BILLING_QUERY_TIMEOUT_MS
      );
    }
  } catch (err: any) {
    // Fail closed: if we cannot read the wallet we cannot prove the venue is in good standing.
    console.error('[VenueGuard] Billing state unavailable — blocking operation:', { venueId, error: err?.message || err });
    return {
      allowed: false,
      status: 503,
      code: 'billing_check_unavailable',
      reason: 'Billing status is temporarily unavailable. Please retry in a moment.',
      details: { venue_id: venueId },
    };
  }

  const currentBalance = Number(wallet?.balance ?? 0);

  // 2. ENFORCE: Check venue_wallets.balance >= 0 (wallet.balance < 0 blocks operations)
  if (wallet.balance < 0) {
    // Automated low balance flag: update subscription status to suspended if not already
    if (subscription && subscription.status !== 'suspended') {
      try {
        await client
          .from('venue_subscriptions')
          .update({ status: 'suspended', updated_at: new Date().toISOString() })
          .eq('venue_id', venueId);

        // Automated notification alert
        await client.from('staff_notifications').insert({
          business_id: venueId,
          notification_type: 'WALLET_SUSPENDED_LOW_BALANCE',
          message: `Venue suspended: Wallet balance ₹${currentBalance.toFixed(2)} is negative. Top-up required immediately.`,
          status: 'PENDING',
          created_at: new Date().toISOString(),
        });
      } catch (alertErr) {
        console.warn('[VenueGuard Suspension Alert Note]:', alertErr);
      }
    }

    return {
      allowed: false,
      status: 402,
      code: 'venue_suspended',
      reason: `Venue operations suspended: wallet balance is negative (₹${currentBalance.toFixed(2)}). Wallet top-up required.`,
      details: {
        balance: currentBalance,
        subscription_status: 'suspended',
        suspended: true,
        venue_id: venueId,
      },
    };
  }

  // 3. ENFORCE: Check venue_subscriptions.status IN ('active', 'trialing', 'trial')
  const subStatus = (subscription?.status || 'trial').toLowerCase();
  const validStatuses = ['active', 'trialing', 'trial'];

  if (!validStatuses.includes(subStatus) || subStatus === 'suspended') {
    return {
      allowed: false,
      status: 402,
      code: 'venue_suspended',
      reason: `Venue operations suspended: Subscription status is '${subscription?.status || 'inactive'}'. Top-up or subscription renewal required.`,
      details: {
        balance: currentBalance,
        subscription_status: subscription?.status || 'inactive',
        suspended: true,
        venue_id: venueId,
      },
    };
  }

  return {
    allowed: true,
    status: 200,
    details: {
      balance: currentBalance,
      subscription_status: subStatus,
      suspended: false,
      venue_id: venueId,
    },
  };
}

/**
 * Standardized guard assertion for route handlers.
 * Returns a 402 NextResponse when venue is suspended/negative, or null when allowed.
 */
export async function assertVenueBillingAllowed(
  venueId: string,
  supabaseClient?: any
): Promise<NextResponse | null> {
  const guard = await checkVenueBillingGuard(venueId, supabaseClient);
  if (!guard.allowed) {
    return NextResponse.json(
      {
        error: guard.reason,
        code: guard.code || 'venue_suspended',
        details: guard.details,
      },
      { status: guard.status || 402 }
    );
  }
  return null;
}
