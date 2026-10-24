// The free month: a venue may try M¹-Pro or M²-Pro once, at no charge and with no per-bill fee. It never replaces a
// paid plan that is still running, and a venue that has used its trial cannot start another (not even by racing two
// taps: the update only lands while trial_used_at is still empty). When the month ends the venue is back on Rhodium
// per bill until it buys a plan.
import { purchasablePlan } from './plans';
import { paidPlanRunning, planState } from './subscription-state';

export type TrialResult = { ok: true; plan: string; endsAt: string } | { ok: false; status: number; error: string };

const DAY = 86_400_000;
/** The trial columns arrive with migration 20261024000001; before it, a trial cannot be recorded. */
const MISSING_COLUMN = new Set(['42703', 'PGRST204']);
const NOT_READY: TrialResult = { ok: false, status: 503, error: 'Free trials open once the new plans are switched on. Please try again soon.' };

export async function startTrial(db: any, venueId: string, planId: unknown, now = Date.now()): Promise<TrialResult> {
  const plan = purchasablePlan(planId);
  if (!plan || plan.trialDays <= 0) return { ok: false, status: 400, error: 'This plan has no free trial.' };

  const { data: sub, error } = await db.from('venue_subscriptions').select('*').eq('venue_id', venueId).maybeSingle();
  if (error) throw error;
  if (sub && !('trial_used_at' in sub)) return NOT_READY;
  if (sub?.trial_used_at) return { ok: false, status: 409, error: 'Your venue has already used its free month.' };
  const state = planState(sub, now);
  if (paidPlanRunning(state)) return { ok: false, status: 409, error: `Your ${state.plan?.name} plan is already running.` };

  const at = new Date(now).toISOString();
  const endsAt = new Date(now + plan.trialDays * DAY).toISOString();
  const patch = { plan_tier: plan.id, status: 'trial', trial_ends_at: endsAt, expires_at: null, trial_used_at: at, updated_at: at };

  const write = sub
    ? db.from('venue_subscriptions').update(patch).eq('venue_id', venueId).is('trial_used_at', null).select('venue_id')
    : db.from('venue_subscriptions').insert({ venue_id: venueId, ...patch }).select('venue_id');
  const { data: rows, error: writeErr } = await write;
  if (writeErr) {
    if (MISSING_COLUMN.has(writeErr.code)) return NOT_READY;
    throw writeErr;
  }
  if (!rows?.length) return { ok: false, status: 409, error: 'Your venue has already used its free month.' };
  return { ok: true, plan: plan.id, endsAt };
}
