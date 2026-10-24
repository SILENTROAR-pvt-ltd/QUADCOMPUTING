import { PER_BILL_PLAN, PLANS, VIBEY_ADDON, type Feature, type PlanInfo } from '@/lib/services/wallet/plans';

// The landing page's savings calculator: what a year costs on each plan for a venue's own volume and needs, read from the
// same catalogue checkout prices from. Pure, so the numbers on the page are tested, not eyeballed.

/** What a venue needs beyond the café and kitchen flow every plan has. */
export type Need = Extract<Feature, 'events' | 'delivery' | 'rooms' | 'vibey'>;

export interface Usage {
  billsPerDay: number;
  daysPerMonth: number;
  /** The average settled bill, in rupees (for the fee as a share of a bill). */
  avgBill: number;
  needs: Need[];
}

export interface PlanQuote {
  plan: PlanInfo;
  /** Covers every need (the Vibey add-on counts on M¹/M²). */
  eligible: boolean;
  /** Needs this plan cannot cover. */
  missing: Need[];
  /** What twelve months cost on this plan, setup aside (it is the same ₹599 on every plan). */
  yearly: number;
  /** The Vibey add-on included in `yearly`, when it was needed. */
  addon: number;
  perDay: number;
  /** Bills a day at which this yearly plan costs the same as ₹3 a bill; null for the per-bill plan. */
  breakEvenPerDay: number | null;
}

export const billsPerYear = (u: Pick<Usage, 'billsPerDay' | 'daysPerMonth'>) => Math.round(u.billsPerDay * u.daysPerMonth * 12);

export function quote(plan: PlanInfo, u: Usage): PlanQuote {
  const perBill = plan.perBillFee > 0;
  const addonNeeded = u.needs.includes('vibey') && !plan.unlocks.includes('vibey') && VIBEY_ADDON.forPlans.includes(plan.id);
  const missing = u.needs.filter((n) => !plan.unlocks.includes(n) && !(n === 'vibey' && addonNeeded));
  const addon = addonNeeded ? VIBEY_ADDON.price : 0;
  const yearly = perBill ? plan.perBillFee * billsPerYear(u) : plan.price + addon;
  const feePerBillDay = PER_BILL_PLAN.perBillFee * u.daysPerMonth * 12;
  return {
    plan, eligible: missing.length === 0, missing, yearly, addon, perDay: yearly / 365,
    breakEvenPerDay: perBill || feePerBillDay <= 0 ? null : yearly / feePerBillDay,
  };
}

export interface PricingResult {
  quotes: PlanQuote[];
  /** The cheapest plan that covers every need (You earn, we earn covers all, so there always is one). */
  best: PlanQuote;
  perBill: PlanQuote;
  /** Rupees a year the best plan keeps against the runner-up choice (₹3 a bill, or the cheapest yearly plan). */
  saving: number;
  /** The ₹3 fee as a percentage of the average bill. */
  feeShare: number;
}

export function priceFor(u: Usage): PricingResult {
  const quotes = [PER_BILL_PLAN, ...PLANS].map((p) => quote(p, u));
  const eligible = quotes.filter((q) => q.eligible);
  const best = eligible.reduce((a, q) => (q.yearly < a.yearly ? q : a));
  const perBill = quotes[0];
  const yearlies = eligible.filter((q) => q !== perBill);
  const runnerUp = best === perBill ? (yearlies.length ? Math.min(...yearlies.map((q) => q.yearly)) : perBill.yearly) : perBill.yearly;
  return {
    quotes, best, perBill, saving: Math.max(0, runnerUp - best.yearly),
    feeShare: u.avgBill > 0 ? (PER_BILL_PLAN.perBillFee / u.avgBill) * 100 : 0,
  };
}
