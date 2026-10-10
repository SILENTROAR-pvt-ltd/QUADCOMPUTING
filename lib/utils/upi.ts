/**
 * UPI Intent URI Generator
 * Constructs NPCI-compliant upi://pay intent strings for direct P2M settlements.
 * Zero payment gateway fees - funds route directly to the merchant's bank account.
 */

export interface UpiPaymentParams {
  /** Merchant VPA (e.g. merchant@oksbi) */
  upiId: string;
  /** Display name shown in UPI app payment screen */
  businessName: string;
  /** Exact amount in INR (will be formatted to 2 decimal places) */
  amount: number;
  /** Optional order reference for transaction note */
  orderId?: string;
}

/**
 * Generates a sanitized, RFC-compliant UPI payment intent URI.
 * Compatible with GPay, PhonePe, Paytm, BHIM, and all UPI apps.
 *
 * @example
 * generateUpiIntentUri({
 *   upiId: 'SINGHHARSHIT1224@OKSBI',
 *   businessName: 'Quad Computing',
 *   amount: 1250,
 *   orderId: 'abc123-def456'
 * })
 * // => "upi://pay?pa=SINGHHARSHIT1224@OKSBI&pn=Quad%20Computing&am=1250.00&cu=INR&tn=Order%20%23def456"
 */
export function generateUpiIntentUri({
  upiId,
  businessName,
  amount,
  orderId,
}: UpiPaymentParams): string {
  if (!upiId || !upiId.includes('@')) {
    throw new Error('Invalid or missing Master UPI Handle');
  }

  const sanitizedUpi = upiId.trim();
  const sanitizedName = encodeURIComponent(
    businessName.trim() || 'Quad Computing'
  );
  const formattedAmount = amount.toFixed(2);
  const note = encodeURIComponent(
    `Order #${orderId?.slice(-6) || 'QUAD'}`
  );

  return `upi://pay?pa=${sanitizedUpi}&pn=${sanitizedName}&am=${formattedAmount}&cu=INR&tn=${note}`;
}
