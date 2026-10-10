import type { PlanTier, TopupRequestType } from '@/types/wallet';
import { planById, TOPUP_LIMITS } from './plans';

export interface TopupInput { amount: number; utrNumber: string; requestType: TopupRequestType; requestedPlanTier: PlanTier | null; notes: string | null }

// UPI references are 12 digits; NEFT/IMPS/RTGS references run up to 22 letters and digits.
const UTR = /^[A-Z0-9]{12,22}$/;

/**
 * A payment the venue says it made: a wallet top-up of its chosen amount, or a plan purchase whose
 * amount is the plan's price (whatever the browser sent). The admin then checks it against the bank.
 */
export function parseTopup(body: any): { ok: true; value: TopupInput } | { ok: false; error: string } {
  const utrNumber = String(body?.utrNumber || '').replace(/\s/g, '').toUpperCase();
  if (!UTR.test(utrNumber)) return { ok: false, error: 'Enter the UTR / reference from your payment app: 12 digits for UPI.' };
  const notes = typeof body?.notes === 'string' && body.notes.trim() ? body.notes.trim().slice(0, 240) : null;

  const plan = planById(body?.planTier);
  if (body?.requestType === 'plan_subscription' || plan) {
    if (!plan) return { ok: false, error: 'Choose a plan.' };
    return { ok: true, value: { amount: plan.price, utrNumber, requestType: 'plan_subscription', requestedPlanTier: plan.id, notes } };
  }

  const amount = Math.round(Number(body?.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount < TOPUP_LIMITS.min || amount > TOPUP_LIMITS.max) {
    return { ok: false, error: `Top up between ₹${TOPUP_LIMITS.min} and ₹${TOPUP_LIMITS.max.toLocaleString('en-IN')}.` };
  }
  return { ok: true, value: { amount, utrNumber, requestType: 'wallet_topup', requestedPlanTier: null, notes } };
}
