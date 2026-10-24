import { PER_BILL_PLAN, PLANS, VIBEY_ADDON, type Feature, type PlanInfo } from './plans';

// The plan comparison, shared by the Wallet's table and the landing page's, so the two can never list different things.

/** You earn, we earn first, then the yearly plans. */
export const COMPARE_COLUMNS: PlanInfo[] = [PER_BILL_PLAN, ...PLANS];

/** A row is either a feature (ticked where a plan unlocks it) or a value read from each plan. */
export type CompareRow = { label: string; feature: Feature } | { label: string; text: (p: PlanInfo) => string };

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/** Whether a plan includes a feature, offers it as the Vibey add-on, or does not have it. */
export function featureState(plan: PlanInfo, feature: Feature): 'included' | 'addon' | 'none' {
  if (plan.unlocks.includes(feature)) return 'included';
  if (VIBEY_ADDON.unlocks.includes(feature) && VIBEY_ADDON.forPlans.includes(plan.id)) return 'addon';
  return 'none';
}

export const ADDON_LABEL = `Add-on · ${inr(VIBEY_ADDON.price)}/yr`;

export const FEATURE_ROWS: CompareRow[] = [
  { label: 'Digital menu, ordering, chef and service portals', feature: 'core' },
  { label: 'Bill request, 7% cashback and lobby reviews', feature: 'core' },
  { label: 'Inventory, purchase list, finance and expense reports', feature: 'core' },
  { label: 'Events, offers and buffet reservations', feature: 'events' },
  { label: 'Local delivery with radius and minimum order', feature: 'delivery' },
  { label: 'Retention and repeat-visit boosters', feature: 'retention' },
  { label: 'Rooms and stays', feature: 'rooms' },
  { label: 'Viber Connect and Viber Club', feature: 'viber_connect' },
  { label: 'Vibey AI in every guest’s language', feature: 'vibey' },
];

export const PRICE_ROWS: CompareRow[] = [
  { label: 'Fee per settled bill', text: (p) => (p.perBillFee ? inr(p.perBillFee) : '—') },
  { label: 'Free trial', text: (p) => (p.trialDays ? `${Math.round(p.trialDays / 30)} month` : '—') },
  { label: 'One-time setup', text: (p) => (p.setupFee ? inr(p.setupFee) : '—') },
];

export const COMPARE_ROWS: CompareRow[] = [...FEATURE_ROWS, ...PRICE_ROWS];
