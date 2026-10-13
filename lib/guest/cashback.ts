// What a guest sees about cashback before ordering. The amount must match what the settlement function credits:
// round(bill subtotal × 7%, 2) (supabase/migrations/20261009000003_cashback_on_full_bill.sql), so it is worked out
// by the same rule the wallet ledger uses, never rounded to whole rupees for show.
import { calculateCashback } from '@/lib/services/wallet/cashback-ledger.util';

/** The share of the bill subtotal that comes back to a signed-in guest's wallet. */
export const CASHBACK_PERCENT = 7;

/** Cashback on an order subtotal, to the paisa. */
export const cashbackFor = (subtotal: number): number => calculateCashback(subtotal);

/** "₹3", "₹2.80", "₹1,250.50": paise shown only when there are any. */
export function rupees(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const whole = Math.abs(n % 1) < 0.005;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 })}`;
}
