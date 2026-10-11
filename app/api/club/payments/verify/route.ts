import { adminDb } from '@/lib/supabase/admin';
import { clubApi, fail, must, ok, readBody } from '@/lib/club/http';
import { requireUser } from '@/lib/club/auth';
import { capturePayment } from '@/lib/club/payments/capture.service';
import { razorpayGateway } from '@/lib/club/payments/razorpay';

export const dynamic = 'force-dynamic';

/**
 * POST /api/club/payments/verify { order_id, payment_id, signature } — the checkout's success callback.
 * The gateway signature proves the payment; the webhook may also arrive, and either one is enough.
 */
export const POST = clubApi('PaymentVerify', async (request) => {
  const user = await requireUser();
  const gateway = razorpayGateway();
  if (!gateway) fail(503, 'Online payments are not configured yet.');
  const body = await readBody(request);
  const orderId = String(body.order_id || ''), paymentId = String(body.payment_id || '');
  if (!orderId || !paymentId || !gateway.verifyCheckout(orderId, paymentId, String(body.signature || ''))) {
    fail(400, 'We could not confirm this payment. If money left your account, it will be matched automatically.');
  }
  const db = adminDb();
  const payment = must(await db.from('club_payments').select('payer_id').eq('gateway_order_id', orderId).maybeSingle()) as any;
  if (!payment || payment.payer_id !== user.id) fail(404, 'Payment not found.');
  await capturePayment(db, orderId, paymentId);
  return ok({ captured: true });
});
