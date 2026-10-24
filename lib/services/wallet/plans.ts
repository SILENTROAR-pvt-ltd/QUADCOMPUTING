import type { PlanTier } from '@/types/wallet';

// The QC² plan catalogue (Vibers Connect pricing, Oct 2026), shared by the plan cards, the landing page and the server,
// which prices a plan request itself so a request can never be filed for less than the plan costs. The database keeps
// the same prices in `subscription_plans` for the approval function; plans.test.ts checks the two agree.

/** What a plan unlocks. "core" is the cafe and kitchen flow every plan has. */
export type Feature = 'core' | 'events' | 'offers' | 'delivery' | 'retention' | 'rooms' | 'viber_connect' | 'viber_club' | 'vibey';

export interface PlanInfo {
  id: Exclude<PlanTier, 'pay_as_you_go'>;
  name: string;
  /** Yearly price in rupees, GST included. 0 for per bill. */
  price: number;
  /** Months a payment covers. */
  termMonths: number;
  /** Days of free trial a new venue may take, once. */
  trialDays: number;
  /** One-time setup (profile, data entry, design, QR), paid once per venue with its first payment of any kind. */
  setupFee: number;
  /** Rupees per settled bill. 0 on the yearly plans. */
  perBillFee: number;
  badge: string;
  unlocks: Feature[];
  features: string[];
}

/** The one-time setup every plan carries, Pay as you go included (venues that joined before it are exempt). */
export const SETUP_FEE = 599;
const VIBEY_ADDON_LINE = 'Vibey AI as an add-on, ₹7,000 a year';

const CORE: Feature[] = ['core'];
const M2: Feature[] = [...CORE, 'events', 'offers', 'delivery', 'retention'];
const RHODIUM: Feature[] = [...M2, 'rooms', 'viber_connect', 'viber_club', 'vibey'];

const RHODIUM_FEATURES = [
  'Everything in M¹-Pro and M²-Pro, unlimited',
  'Rooms and stays',
  'Viber Connect: lobby posts, venue tour, visitor bookings',
  'Viber Club: travellers and groups book you directly (5% on bookings)',
  'Vibey AI in every guest’s language',
  'Free advanced and future updates',
];

/** The yearly plans a venue can buy. */
export const PLANS: PlanInfo[] = [
  {
    id: 'm1_pro', name: 'QC² M¹-Pro', price: 8999, termMonths: 12, trialDays: 30, setupFee: SETUP_FEE, perBillFee: 0, badge: 'Cafe & kitchen',
    unlocks: CORE,
    features: ['Digital menu, ordering and repeat orders', 'Chef portal and service ring alerts', 'Bill request and 7% guest cashback',
      'Lobby reviews', 'Live inventory, low-stock alerts and purchase list', 'Financial and expense reports', VIBEY_ADDON_LINE],
  },
  {
    id: 'm2_pro', name: 'QC² M²-Pro', price: 14999, termMonths: 12, trialDays: 30, setupFee: SETUP_FEE, perBillFee: 0, badge: 'Events & delivery',
    unlocks: M2,
    features: ['Everything in M¹-Pro', 'Events, offers and buffets with seat reservations', 'Local delivery with radius and minimum order',
      'Retention and repeat-visit boosters', VIBEY_ADDON_LINE],
  },
  {
    id: 'rhodium_annual', name: 'Rhodium Pro', price: 48999, termMonths: 12, trialDays: 0, setupFee: SETUP_FEE, perBillFee: 0, badge: 'Unlimited yearly',
    unlocks: RHODIUM, features: RHODIUM_FEATURES,
  },
];

/**
 * "You earn, we earn" (pay as you go): its own plan, ₹3 a settled bill and no yearly fee, with every feature. It is what a venue is on whenever
 * no yearly plan or trial is running, so no venue is ever locked out. (Its id stays "rhodium_ppb" for stored rows.)
 */
export const PER_BILL_PLAN: PlanInfo = {
  id: 'rhodium_ppb', name: 'You earn, we earn', price: 0, termMonths: 0, trialDays: 0, setupFee: SETUP_FEE, perBillFee: 3, badge: 'Most adopted',
  unlocks: RHODIUM,
  features: ['₹3 per settled bill, whatever its size', 'No bills, no charge: no monthly or yearly fee', 'Every feature: rooms, events, delivery, offers',
    'Viber Connect, Viber Club and Vibey AI', 'Paid from your credit wallet, no expiry'],
};

/** Vibey AI, bought on top of M¹-Pro or M²-Pro for a year (Rhodium already includes it). */
export const VIBEY_ADDON = {
  id: 'vibey_addon', name: 'Vibey AI add-on', price: 7000, termMonths: 12, unlocks: ['vibey'] as Feature[],
  forPlans: ['m1_pro', 'm2_pro'] as PlanInfo['id'][],
} as const;

/** The yearly tiers sold before October 2026. They unlocked everything, and still do for any row that runs one. */
const LEGACY: PlanInfo[] = (
  [['8k_2m', 'Starter', 8000, 14], ['12k_6m', 'Growth', 12000, 18], ['14k_9m', 'Enterprise', 14000, 21]] as const
).map(([id, name, price, termMonths]) => ({
  id, name, price, termMonths, trialDays: 0, setupFee: 0, perBillFee: 0, badge: 'Earlier plan', unlocks: RHODIUM, features: [],
}));

const PER_BILL_IDS = new Set<unknown>(['rhodium_ppb', 'pay_as_you_go']);

/** A yearly plan (current or earlier) by id; null for per bill or anything unknown. */
export const planById = (id: unknown): PlanInfo | null => PLANS.find((p) => p.id === id) || LEGACY.find((p) => p.id === id) || null;

/** A plan a venue can buy now (never an earlier tier). */
export const purchasablePlan = (id: unknown): PlanInfo | null => PLANS.find((p) => p.id === id) || null;

export const isPerBill = (id: unknown) => PER_BILL_IDS.has(id) || !id;

/** The name of anything a payment can be for (a plan or the Vibey add-on), for statements and the admin desk. */
export const purchaseName = (id: unknown) => (id === VIBEY_ADDON.id ? VIBEY_ADDON.name : planById(id)?.name ?? null);

/** What buying a plan costs this venue now: its price, plus the setup fee if this venue has not paid it yet. */
export function planCharge(plan: PlanInfo, sub: { setup_fee_paid_at?: string | null } | null | undefined) {
  const setup = plan.setupFee > 0 && !sub?.setup_fee_paid_at ? plan.setupFee : 0;
  return { price: plan.price, setup, total: plan.price + setup };
}

/**
 * The setup a Pay as you go venue still owes, taken from its first wallet top-up. Zero once paid (or exempt), and zero
 * until the plans migration adds the column, since the approval function only takes it from then on.
 */
export function topupSetupDue(sub: { setup_fee_paid_at?: string | null } | null | undefined): number {
  return sub && 'setup_fee_paid_at' in sub && !sub.setup_fee_paid_at ? PER_BILL_PLAN.setupFee : 0;
}

/** The cheapest plan that unlocks a feature, for "Available on …" prompts. */
export function cheapestPlanFor(feature: Feature): PlanInfo {
  return PLANS.find((p) => p.unlocks.includes(feature)) ?? PER_BILL_PLAN;
}

/** Per bill: the one platform fee, ₹3 for each settled bill, taken from the credit wallet. */
export const PAYG_BILL_FEE = PER_BILL_PLAN.perBillFee;

export const PAYG_FEES = [{ label: 'Each settled bill', amount: PAYG_BILL_FEE }];

export const TOPUP_LIMITS = { min: 100, max: 100000 };
