// Razorpay over its REST API (no SDK). Keys come from the environment; without them payments report
// "not configured" instead of failing silently. Signatures are checked in constant time.
import { hmacMatches } from '../secrets';

export interface PaymentGateway {
  keyId: string;
  createOrder(amount: number, receipt: string, notes: Record<string, string>): Promise<{ orderId: string }>;
  verifyCheckout(orderId: string, paymentId: string, signature: string): boolean;
  verifyWebhook(rawBody: string, signature: string): boolean;
}

export function razorpayGateway(env: Record<string, string | undefined> = process.env): PaymentGateway | null {
  const keyId = env.RAZORPAY_KEY_ID, keySecret = env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET || '';
  const auth = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;

  return {
    keyId,
    async createOrder(amount, receipt, notes) {
      const res = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency: 'INR', receipt: receipt.slice(0, 40), notes }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.id) throw Object.assign(new Error('The payment gateway refused the order.'), { status: 502 });
      return { orderId: data.id as string };
    },
    verifyCheckout: (orderId, paymentId, signature) => hmacMatches(keySecret, `${orderId}|${paymentId}`, signature),
    verifyWebhook: (rawBody, signature) => Boolean(webhookSecret) && hmacMatches(webhookSecret, rawBody, signature),
  };
}
