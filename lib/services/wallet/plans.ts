import type { PlanTier } from '@/types/wallet';

// The plan catalogue, shared by the plan cards and the server (which sets the price of a plan
// request itself, so a request can never be filed for less than the plan costs).

export interface PlanInfo {
  id: Exclude<PlanTier, 'pay_as_you_go'>;
  name: string;
  price: number;
  /** Free months added on top of the 12 paid months. */
  bonusMonths: number;
  badge: string;
  popular?: boolean;
  features: string[];
}

export const PLANS: PlanInfo[] = [
  {
    id: '8k_2m', name: 'Starter', price: 8000, bonusMonths: 2, badge: 'Standard',
    features: ['No fee on POS bills', 'Menu & catalogue', 'Kitchen tickets & table QR', 'Business-hours support'],
  },
  {
    id: '12k_6m', name: 'Growth', price: 12000, bonusMonths: 6, badge: 'Most popular', popular: true,
    features: ['No fee on bills or room stays', 'Menu, add-ons & rooms', 'Multi-station kitchen routing', 'Priority 24/7 support'],
  },
  {
    id: '14k_9m', name: 'Enterprise', price: 14000, bonusMonths: 9, badge: 'Best value',
    features: ['No platform fees at all', 'High-volume rooms & dining', 'Dedicated account manager', 'Full audit logs & custom SLA'],
  },
];

export const planById = (id: unknown) => PLANS.find((p) => p.id === id) || null;

/** Pay as you go: the one platform fee, ₹3 for each settled bill, taken from the credit wallet. Nothing else is charged. */
export const PAYG_BILL_FEE = 3;

export const PAYG_FEES = [{ label: 'Each settled bill', amount: PAYG_BILL_FEE }];

export const TOPUP_LIMITS = { min: 100, max: 100000 };
