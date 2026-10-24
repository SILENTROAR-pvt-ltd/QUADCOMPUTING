import { planById, type PlanInfo } from './plans';

export type PlanPhase = 'payg' | 'active' | 'expiring' | 'grace' | 'expired';

export interface PlanState {
  phase: PlanPhase;
  plan: PlanInfo | null;
  /** True while a yearly plan, its trial or its grace week is in force: no per-bill fee. */
  feesWaived: boolean;
  /** The plan in force is a free trial. */
  onTrial: boolean;
  /** When the plan (or trial) ends, or ended. */
  endsAt: string | null;
  /** Days until the plan ends; in grace, days of grace left. */
  daysLeft: number | null;
}

const DAY = 86_400_000;
/** A paid plan keeps working this many days after its end date, so a venue can renew without losing anything. */
export const GRACE_DAYS = 7;

/**
 * Where a venue's subscription stands. A yearly plan (or its free trial) is in force only until it ends: a status that
 * still says "active" after the end date is treated as ended. A paid plan then has a grace week (features and no fee,
 * with a reminder to renew); a trial does not. After that the venue is back on Rhodium Pro per bill.
 */
export function planState(sub: { plan_tier?: unknown; status?: unknown; expires_at?: unknown; trial_ends_at?: unknown } | null, now = Date.now()): PlanState {
  const plan = planById(sub?.plan_tier);
  if (!plan) return { phase: 'payg', plan: null, feesWaived: false, onTrial: false, endsAt: null, daysLeft: null };
  const onTrial = sub?.status === 'trial';
  const end = typeof sub?.expires_at === 'string' ? sub.expires_at : typeof sub?.trial_ends_at === 'string' ? sub.trial_ends_at : null;
  const endMs = end ? Date.parse(end) : NaN;
  const statusOk = sub?.status === 'active' || onTrial;
  if (!statusOk || !Number.isFinite(endMs) || endMs <= now) {
    const graceEnd = endMs + GRACE_DAYS * DAY;
    if (sub?.status === 'active' && typeof sub?.expires_at === 'string' && Number.isFinite(endMs) && graceEnd > now) {
      return { phase: 'grace', plan, feesWaived: true, onTrial: false, endsAt: end, daysLeft: Math.ceil((graceEnd - now) / DAY) };
    }
    return { phase: 'expired', plan, feesWaived: false, onTrial: false, endsAt: end, daysLeft: 0 };
  }
  const daysLeft = Math.ceil((endMs - now) / DAY);
  return { phase: daysLeft <= 15 ? 'expiring' : 'active', plan, feesWaived: true, onTrial, endsAt: end, daysLeft };
}

/** A paid plan with months still to run: not a trial, not the grace week after it ended. */
export const paidPlanRunning = (s: PlanState) => s.feesWaived && !s.onTrial && s.phase !== 'grace';
