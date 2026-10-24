/**
 * The QC² plans (Oct 2026): M¹-Pro, M²-Pro, Rhodium Pro yearly and Rhodium Pro per bill. "pay_as_you_go" is the
 * older name for per bill and means the same; the three old yearly tiers are kept only so past rows still read.
 */
export type PlanTier = 'm1_pro' | 'm2_pro' | 'rhodium_annual' | 'rhodium_ppb' | 'pay_as_you_go' | '8k_2m' | '12k_6m' | '14k_9m';
/** What a payment request can be for: a plan, or the Vibey add-on bought on top of M¹-Pro or M²-Pro. */
export type PurchaseId = PlanTier | 'vibey_addon';
export type SubscriptionStatus = 'trial' | 'active' | 'expired';

export interface VenueSubscription {
  id: string;
  venue_id: string;
  plan_tier: PlanTier;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  expires_at: string | null;
  /** When the venue started its one free trial (a venue gets one). */
  trial_used_at?: string | null;
  /** When the one-time setup fee (M¹-Pro) was paid. */
  setup_fee_paid_at?: string | null;
  /** End of the Vibey add-on (M¹-Pro / M²-Pro venues). */
  vibey_until?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface VenueWallet {
  id: string;
  venue_id: string;
  balance: number;
  currency: string;
  created_at?: string;
  updated_at?: string;
}

export interface UsageLedgerItem {
  id: string;
  venue_id: string;
  action_type: string;
  cost: number;
  reference_id: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

export type FeeGuardAction =
  | 'bill_generate'
  | 'menu_addon'
  | 'room_accommodation'
  | 'menu_item_creation'
  | 'menu_addon_creation'
  | 'room_creation'
  | 'onboarding_free_tier';

export type OutstandingBillStatus = 'unpaid' | 'paid';
export type OutstandingBillItemType =
  | 'bill_generate'
  | 'menu_addon'
  | 'room_accommodation'
  | 'menu_item_creation'
  | 'menu_addon_creation'
  | 'room_creation'
  | 'onboarding_free_tier'
  | 'other';

export interface OutstandingBill {
  id: string;
  venue_id: string;
  reference_id: string | null;
  description: string;
  item_type: OutstandingBillItemType;
  amount: number;
  status: OutstandingBillStatus;
  created_at: string;
  updated_at: string;
}

export interface FeeGuardResult {
  allowed: boolean;
  cost: number;
  remainingBalance?: number;
  planTier?: PlanTier;
  message?: string;
  invoiceRef?: string;
}

export type TopupRequestStatus = 'pending' | 'approved' | 'rejected';
export type TopupRequestType = 'wallet_topup' | 'plan_subscription';

export interface VenueTopupRequest {
  id: string;
  venue_id: string;
  venue_name?: string;
  venue_address?: string;
  request_type?: TopupRequestType;
  amount: number;
  utr_number: string;
  payment_method: string;
  requested_plan_tier: PurchaseId | null;
  status: TopupRequestStatus;
  notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

