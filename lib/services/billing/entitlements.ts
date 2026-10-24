// What a venue may use right now, from its subscription row. A yearly plan or its free trial unlocks that plan's
// features while it is in force; at any other time the venue is on Pay as you go, which unlocks everything and
// costs ₹3 a settled bill. So a venue is never locked out: the only thing a plan can take away is a feature the
// cheaper plan does not include (M¹-Pro has no events or delivery, only Rhodium has rooms, Viber Connect, Club, Vibey).
// An M¹-Pro or M²-Pro venue can add Vibey for a year with the add-on (vibey_until).
import { cheapestPlanFor, PER_BILL_PLAN, VIBEY_ADDON, type Feature, type PlanInfo } from '@/lib/services/wallet/plans';
import { planState, type PlanState } from '@/lib/services/wallet/subscription-state';

export interface Entitlements {
  /** The plan whose features apply now. */
  plan: PlanInfo;
  state: PlanState;
  /** Paying ₹3 per settled bill (no yearly plan or trial in force). */
  perBill: boolean;
  features: ReadonlySet<Feature>;
  /** End of a running Vibey add-on, else null. */
  vibeyUntil: string | null;
}

type SubRow = { plan_tier?: unknown; status?: unknown; expires_at?: unknown; trial_ends_at?: unknown; vibey_until?: unknown } | null;

export function entitlementsOf(sub: SubRow, now = Date.now()): Entitlements {
  const state = planState(sub, now);
  const plan = state.feesWaived && state.plan ? state.plan : PER_BILL_PLAN;
  const features = new Set<Feature>(plan.unlocks);
  const addon = typeof sub?.vibey_until === 'string' && Date.parse(sub.vibey_until) > now ? sub.vibey_until : null;
  if (addon) VIBEY_ADDON.unlocks.forEach((f) => features.add(f));
  return { plan, state, perBill: !state.feesWaived, features, vibeyUntil: addon };
}

export const canUse = (e: Entitlements, feature: Feature) => e.features.has(feature);

/** The plan in force can take the Vibey add-on: M¹-Pro or M²-Pro, trial or paid. Buying it again extends it. */
export const canBuyVibeyAddon = (e: Entitlements) => !e.perBill && VIBEY_ADDON.forPlans.includes(e.plan.id);

/** Why a feature is unavailable, and which plan brings it, for a 402 or an "Available on …" card. Null when allowed. */
export function featureBlock(e: Entitlements, feature: Feature): { code: 'plan_required'; feature: Feature; plan: PlanInfo['id']; message: string } | null {
  if (canUse(e, feature)) return null;
  const needed = cheapestPlanFor(feature);
  const addon = feature === 'vibey' && canBuyVibeyAddon(e) ? ` or add Vibey for ₹${VIBEY_ADDON.price.toLocaleString('en-IN')} a year` : '';
  return { code: 'plan_required', feature, plan: needed.id, message: `This is part of ${needed.name}. Upgrade your plan${addon} in Wallet to use it.` };
}
