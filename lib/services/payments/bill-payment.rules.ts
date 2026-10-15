// The pure rules of a table's bill payment, kept apart from the database so they can be tested on their own.

export type PaymentMethod = 'UPI' | 'CASH' | 'CARD';
export type PaymentStatus = 'chosen' | 'claimed' | 'verified' | 'settled' | 'cancelled';

export const METHODS: readonly PaymentMethod[] = ['UPI', 'CASH', 'CARD'];
/**
 * What is still owed once part of the bill has already been paid and confirmed. When a guest adds to their order after paying,
 * only the new part is due: never the whole bill again, and never "paid" for items that were not.
 */
export function remainingToPay(billTotal: number, paidSoFar: number): number {
  const bill = Math.max(0, Number(billTotal) || 0);
  const paid = Math.max(0, Number(paidSoFar) || 0);
  return Math.max(0, Math.round((bill - paid + Number.EPSILON) * 100) / 100);
}

/** True when a confirmed payment no longer covers the bill, because the order grew after it was paid. */
export function billGrewAfterPayment(billTotal: number, paidSoFar: number): boolean {
  return paidSoFar > 0 && remainingToPay(billTotal, paidSoFar) > 0.5;
}

/** A payment in one of these states is still live: there is one per table at most. */
export const LIVE_STATUSES: readonly PaymentStatus[] = ['chosen', 'claimed', 'verified'];

export interface BillPayment {
  id: string;
  business_id: string;
  session_id: string | null;
  order_id: string | null;
  table_number: string;
  guest_handle: string | null;
  method: PaymentMethod;
  amount: number;
  wallet_amount: number;
  status: PaymentStatus;
  claimed_at: string | null;
  verified_at: string | null;
  verified_by: string | null;
  settled_at: string | null;
  created_at: string;
  updated_at: string;
  /** Not stored: what was already paid and confirmed earlier on this bill, added when payments are listed for staff. */
  paid_before?: number;
}

/** "T-01", "Table 1", "1" and "01" are the same table, so a payment finds its table however either was written. */
export const paymentTableKey = (raw: string | null | undefined): string =>
  String(raw ?? '').replace(/^(table|t-)\s*/i, '').trim().toUpperCase().replace(/^0+(?=\d)/, '');

export function parseMethod(raw: unknown): PaymentMethod | null {
  const m = String(raw ?? '').trim().toUpperCase();
  return (METHODS as readonly string[]).includes(m) ? (m as PaymentMethod) : null;
}

const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * What is left to pay after the wallet the guest set aside. The wallet can never be more than the bill, and the
 * server decides the bill, so a tampered figure from the phone changes nothing.
 */
export function payableAfterWallet(total: number, walletAmount: number): { amount: number; wallet: number } {
  const bill = Math.max(0, round2(Number(total) || 0));
  const wallet = Math.min(bill, Math.max(0, round2(Number(walletAmount) || 0)));
  return { amount: round2(bill - wallet), wallet };
}

const NEXT: Record<PaymentStatus, readonly PaymentStatus[]> = {
  chosen: ['claimed', 'verified', 'cancelled'],
  claimed: ['verified', 'cancelled'],
  verified: ['settled', 'cancelled'],
  settled: [],
  cancelled: [],
};

/** A payment only ever moves forward (or is cancelled): a confirmed payment cannot go back to "claimed". */
export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return NEXT[from]?.includes(to) ?? false;
}

/** The words a guest sees for where their payment is. */
export function guestPaymentLine(p: Pick<BillPayment, 'method' | 'status'>): string {
  if (p.status === 'verified') return 'Payment confirmed. Your bill will be settled in a moment.';
  if (p.status === 'claimed') return 'Thank you. Our staff are confirming your payment now.';
  if (p.method === 'CASH') return 'Your waiter has been told you will pay by cash, and will be with you shortly.';
  if (p.method === 'CARD') return 'Your waiter has been told you will pay by card, and will bring the machine.';
  return 'Pay with your UPI app, then tell us once it is done.';
}
