// lib/services/wallet/redemption-store.util.ts
import { randomInt } from 'node:crypto';

export type RedemptionStatus = 'pending' | 'verified' | 'redeemed' | 'cancelled' | 'expired';

export interface RedemptionRecord {
  id: string;
  code: string;
  wallet_id?: string;
  guest_id: string;
  guest_handle?: string;
  guest_phone?: string;
  guest_name?: string;
  business_id: string;
  cafe_id: string;
  table_number?: string;
  amount: number;
  status: RedemptionStatus;
  verified_at?: string;
  redeemed_at?: string;
  order_id?: string;
  created_at: string;
  expires_at: string;
}

/** 6 digits from the OS CSPRNG. Uniqueness is enforced by the DB (wallet_redemptions.code UNIQUE) with a retry. */
export function generateRedemptionCode(): string {
  return `QC-RDM-${randomInt(100000, 1000000)}`;
}
