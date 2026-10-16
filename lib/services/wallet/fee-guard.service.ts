import type { FeeGuardAction, FeeGuardResult } from '@/types/wallet';
import { getOrProvisionVenueWallet } from './venue-wallet.service';
import { planState } from './subscription-state';
import { PAYG_BILL_FEE } from './plans';
import { adminDb } from '@/lib/supabase/admin';

// ── Fee schedule ─────────────────────────────────────────────────────────────
// Pay as you go pays ₹3 per settled bill and nothing else. Menu items, rooms and add-ons are free to add.
// A paid plan waives the bill fee too.
const FEE: Record<FeeGuardAction, (subscribed: boolean) => number> = {
  bill_generate:       (s) => (s ? 0 : PAYG_BILL_FEE),
  menu_addon:          () => 0,
  menu_addon_creation: () => 0,
  room_accommodation:  () => 0,
  menu_item_creation:  () => 0,
  room_creation:       () => 0,
  onboarding_free_tier:() => 0,
};

/** What one action costs: ₹3 for a settled bill on pay as you go, nothing else, and nothing on a paid plan. */
export function feeFor(actionType: FeeGuardAction, subscribed: boolean): number {
  return FEE[actionType]?.(subscribed) ?? 0;
}

/** Generate QC-YYYY-XXXX when no real order ID is available */
export function generateInvoiceRef(): string {
  const yr = new Date().getFullYear();
  const seq = Math.floor(1000 + Math.random() * 9000);
  return `QC-${yr}-${seq}`;
}

/** Derive a consistent invoice ref from a raw UUID order/session ID */
export function invoiceRefFromId(rawId: string): string {
  const yr = new Date().getFullYear();
  const short = rawId.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `QC-${yr}-${short}`;
}

function actionLabel(a: FeeGuardAction, ref: string): string {
  if (a === 'bill_generate')       return `POS Bill Settlement (${ref})`;
  if (a === 'menu_addon')          return `Menu Add-on Ingestion (${ref})`;
  if (a === 'menu_item_creation')  return `Menu Item Creation (${ref})`;
  if (a === 'menu_addon_creation') return `Menu Add-on Creation (${ref})`;
  if (a === 'room_creation')       return `Room / Accommodation Creation (${ref})`;
  if (a === 'onboarding_free_tier')return `Onboarding Free Tier Setup (${ref})`;
  return `Room Stay Ingestion (${ref})`;
}

/**
 * evaluateFeeGuard
 *
 * PATH A — wallet balance sufficient:
 *   1. Atomic RPC `deduct_venue_wallet_credits` (row-locked, once per invoiceRef)
 *   2. If it refuses or fails → recorded as an outstanding bill (never a hand-written balance)
 *   → allowed: true, method: 'wallet_deduction'
 *
 * PATH B — wallet balance insufficient:
 *   1. Insert into `venue_outstanding_bills` with exact invoiceRef & status 'unpaid'
 *   → allowed: true, method: 'outstanding_fallback'  ← POS is NEVER blocked
 *
 * Both paths emit a console.log for terminal traceability.
 */
export async function evaluateFeeGuard(
  venueId: string,
  actionType: FeeGuardAction,
  referenceId?: string,
  supabaseClient?: any,
  overrideCost?: number,
): Promise<FeeGuardResult> {
  if (!supabaseClient) {
    console.warn('[FeeGuard] No supabaseClient provided — skipping fee check');
    return { allowed: true, cost: 0 };
  }

  const data = await getOrProvisionVenueWallet(supabaseClient, venueId);
  if (!data) return { allowed: true, cost: 0 };

  const { subscription, wallet } = data;
  // A paid plan waives fees until it ends, and no longer: an "active" row past its end date pays fees.
  const isSubscribed = planState(subscription).feesWaived;

  // The schedule above is the only price. A caller's overrideCost (the old free-tier amounts) is ignored.
  void overrideCost;
  const cost = feeFor(actionType, isSubscribed);

  // Subscribed plans or free items — bill settlement is free
  if (cost === 0) {
    console.log('[FeeGuard Executed]', { venueId, actionType, invoiceRef: referenceId || 'n/a', cost: 0, method: 'free_tier' });
    return { allowed: true, cost: 0, planTier: subscription.plan_tier };
  }

  const currentBalance = Number(wallet.balance ?? 0);
  const invoiceRef = referenceId
    ? (referenceId.startsWith('QC-') || referenceId.startsWith('TOPUP_') || referenceId.startsWith('SETTLE_')
        ? referenceId
        : invoiceRefFromId(referenceId))
    : generateInvoiceRef();

  console.log('[FeeGuard Executed]', { venueId, actionType, invoiceRef, cost, currentBalance, planTier: subscription.plan_tier });

  const writeClient = adminDb();

  const dbItemType = (['bill_generate', 'menu_addon', 'room_accommodation'].includes(actionType))
    ? actionType
    : (actionType === 'room_creation' ? 'room_accommodation' : (actionType === 'menu_item_creation' || actionType === 'menu_addon_creation' ? 'menu_addon' : 'other'));

  // Fail-safe: record the fee as an outstanding bill. Used both by PATH B
  // (insufficient balance) and as the last resort if PATH A's RPC+fallback both
  // fail — the fee must never simply vanish with only a console.error.
  // Never throws — evaluateFeeGuard's contract is that the POS flow is never
  // blocked by a fee-accounting failure. Returns whether the record landed.
  async function logOutstanding(reason: string): Promise<boolean> {
    try {
      // A retry for the same invoice must not bill the venue twice.
      const { data: already, error: dupErr } = await writeClient
        .from('venue_outstanding_bills')
        .select('id')
        .eq('venue_id', venueId)
        .eq('reference_id', invoiceRef)
        .limit(1)
        .maybeSingle();
      if (dupErr) throw dupErr;
      if (already) {
        console.log('[FeeGuard] Outstanding bill already recorded, skipping duplicate', { invoiceRef, reason });
        return true;
      }

      const { error: insErr } = await writeClient.from('venue_outstanding_bills').insert({
        venue_id: venueId,
        reference_id: invoiceRef,
        description: actionLabel(actionType, invoiceRef),
        item_type: dbItemType,
        amount: cost,
        status: 'unpaid',
      });
      if (insErr) throw insErr;
      console.log('[FeeGuard] Outstanding bill inserted OK', { invoiceRef, amount: cost, reason });
      return true;
    } catch (insErr) {
      console.error('[FeeGuard] CRITICAL — Failed to log outstanding bill after', reason, insErr);
      return false;
    }
  }

  // ── PATH A: sufficient balance → deduct atomically ───────────────────────
  if (currentBalance >= cost) {
    const newBalance = currentBalance - cost;

    // Only the row-locked RPC moves the balance. It refuses (success: false) when a concurrent fee
    // has already used the balance read above; writing `newBalance` by hand from that stale read
    // would overwrite the other deduction, so a refusal or failure is billed as outstanding instead.
    try {
      const { data: rpcRes, error: rpcErr } = await writeClient.rpc(
        'deduct_venue_wallet_credits',
        { p_venue_id: venueId, p_amount: cost, p_action_type: actionType, p_reference_id: invoiceRef },
      );
      if (!rpcErr && rpcRes?.success === true) {
        const remaining = Number(rpcRes.remaining_balance ?? newBalance);
        console.log('[FeeGuard] PATH A — RPC deduction successful', { invoiceRef, remaining });
        wallet.balance = remaining;
        return { allowed: true, cost, remainingBalance: remaining, planTier: subscription.plan_tier, invoiceRef };
      }
      console.warn('[FeeGuard] PATH A — RPC did not deduct:', rpcErr?.message || rpcRes?.error);
    } catch (rpcErr) {
      console.error('[FeeGuard] PATH A RPC threw:', rpcErr);
    }

    const logged = await logOutstanding('PATH A deduction not applied');
    return {
      allowed: true,
      cost,
      remainingBalance: currentBalance,
      planTier: subscription.plan_tier,
      invoiceRef,
      message: logged
        ? `Wallet deduction failed; ₹${cost.toFixed(2)} added to outstanding (${invoiceRef}).`
        : `CRITICAL: Wallet deduction and outstanding-bill fallback both failed for ₹${cost.toFixed(2)} (${invoiceRef}). Needs manual reconciliation.`,
    };
  }

  // ── PATH B: insufficient → log to outstanding (POS never blocked) ─────────
  console.log('[FeeGuard] PATH B — Insufficient balance, logging to outstanding_bills', { invoiceRef, cost, currentBalance });
  const loggedB = await logOutstanding('PATH B insufficient balance');

  return {
    allowed: true,
    cost,
    remainingBalance: currentBalance,
    planTier: subscription.plan_tier,
    invoiceRef,
    message: loggedB
      ? `Wallet ₹${currentBalance.toFixed(2)} < ₹${cost.toFixed(2)}. Added to outstanding (${invoiceRef}).`
      : `CRITICAL: Insufficient wallet balance and outstanding-bill fallback failed for ₹${cost.toFixed(2)} (${invoiceRef}). Needs manual reconciliation.`,
  };
}

/**
 * processVenueFee
 * Convenience wrapper adhering to requested pipeline signature:
 * processVenueFee(venueId, actionType, cost, referenceId, supabaseClient)
 */
export async function processVenueFee(
  venueId: string,
  actionType: FeeGuardAction,
  cost?: number,
  referenceId?: string,
  supabaseClient?: any,
): Promise<FeeGuardResult> {
  let client = supabaseClient;
  if (!client) {
    try {
      const { createClient } = await import('@/lib/supabase/server');
      client = await createClient();
    } catch {}
  }
  return evaluateFeeGuard(venueId, actionType, referenceId, client, cost);
}
