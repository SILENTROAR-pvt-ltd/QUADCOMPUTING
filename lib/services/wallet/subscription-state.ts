import { planById, type PlanInfo } from './plans';

export type PlanPhase = 'payg' | 'active' | 'expiring' | 'expired';

export interface PlanState {
  phase: PlanPhase;
  plan: PlanInfo | null;
  /** True while a paid plan is in force: fees are waived. */
  feesWaived: boolean;
  endsAt: string | null;
  daysLeft: number | null;
}

const DAY = 86_400_000;

/**
 * Where a venue's subscription stands. A paid plan waives fees only until it ends: a status that
 * still says "active" after the end date is treated as expired, so fees resume on time.
 */
export function planState(sub: { plan_tier?: unknown; status?: unknown; expires_at?: unknown; trial_ends_at?: unknown } | null, now = Date.now()): PlanState {
  const plan = planById(sub?.plan_tier);
  if (!plan) return { phase: 'payg', plan: null, feesWaived: false, endsAt: null, daysLeft: null };
  const end = typeof sub?.expires_at === 'string' ? sub.expires_at : typeof sub?.trial_ends_at === 'string' ? sub.trial_ends_at : null;
  const endMs = end ? Date.parse(end) : NaN;
  const statusOk = sub?.status === 'active' || sub?.status === 'trial';
  if (!statusOk || !Number.isFinite(endMs) || endMs <= now) {
    return { phase: 'expired', plan, feesWaived: false, endsAt: end, daysLeft: 0 };
  }
  const daysLeft = Math.ceil((endMs - now) / DAY);
  return { phase: daysLeft <= 15 ? 'expiring' : 'active', plan, feesWaived: true, endsAt: end, daysLeft };
}
