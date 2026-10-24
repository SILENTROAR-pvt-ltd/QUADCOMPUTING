import type { PurchaseId, TopupRequestType } from '@/types/wallet';
import { planCharge, purchasablePlan, topupSetupDue, TOPUP_LIMITS, VIBEY_ADDON } from './plans';

export interface TopupInput { amount: number; utrNumber: string; requestType: TopupRequestType; requestedPlanTier: PurchaseId | null; notes: string | null }

// UPI references are 12 digits; NEFT/IMPS/RTGS references run up to 22 letters and digits.
const UTR = /^[A-Z0-9]{12,22}$/;

/** The line a top-up carrying the setup is filed with, so the admin desk can show the split. */
export const setupNote = (setup: number) => `Includes the ₹${setup} one-time setup.`;
/** The setup a filed top-up carries, read back from its note; 0 when none. */
export const setupInNote = (notes: unknown) => Number(String(notes ?? '').match(/Includes the ₹(\d+) one-time setup/)?.[1] ?? 0);

/**
 * A payment the venue says it made: a wallet top-up of its chosen amount (the first one also covering the one-time
 * setup, if still owed), a plan purchase whose amount is the plan's price plus any setup still owed, or the Vibey add-on
 * at its price (whatever the browser sent). The admin then checks it against the bank.
 */
export function parseTopup(body: any, sub?: { setup_fee_paid_at?: string | null } | null): { ok: true; value: TopupInput } | { ok: false; error: string } {
  const utrNumber = String(body?.utrNumber || '').replace(/\s/g, '').toUpperCase();
  if (!UTR.test(utrNumber)) return { ok: false, error: 'Enter the UTR / reference from your payment app: 12 digits for UPI.' };
  const notes = typeof body?.notes === 'string' && body.notes.trim() ? body.notes.trim().slice(0, 240) : null;

  if (body?.planTier === VIBEY_ADDON.id) {
    return { ok: true, value: { amount: VIBEY_ADDON.price, utrNumber, requestType: 'plan_subscription', requestedPlanTier: VIBEY_ADDON.id, notes } };
  }
  const plan = purchasablePlan(body?.planTier);
  if (body?.requestType === 'plan_subscription' || plan) {
    if (!plan) return { ok: false, error: 'Choose a plan.' };
    return { ok: true, value: { amount: planCharge(plan, sub).total, utrNumber, requestType: 'plan_subscription', requestedPlanTier: plan.id, notes } };
  }

  // A venue that still owes the one-time setup pays it out of this top-up, so the top-up must cover it and some credit.
  const setup = topupSetupDue(sub);
  const min = TOPUP_LIMITS.min + setup;
  const amount = Math.round(Number(body?.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount < min || amount > TOPUP_LIMITS.max) {
    return { ok: false, error: setup
      ? `Your first top-up includes the one-time ₹${setup} setup: top up at least ₹${min}.`
      : `Top up between ₹${TOPUP_LIMITS.min} and ₹${TOPUP_LIMITS.max.toLocaleString('en-IN')}.` };
  }
  const withSetup = setup ? [setupNote(setup), notes].filter(Boolean).join(' ') : notes;
  return { ok: true, value: { amount, utrNumber, requestType: 'wallet_topup', requestedPlanTier: null, notes: withSetup } };
}
