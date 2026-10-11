import { adminDb } from '@/lib/supabase/admin';
import { clubApi, ok } from '@/lib/club/http';
import { handleWebhook } from '@/lib/club/payments/webhook.service';
import { razorpayGateway } from '@/lib/club/payments/razorpay';

export const dynamic = 'force-dynamic';

/** POST /api/club/payments/webhook — Razorpay events, checked against RAZORPAY_WEBHOOK_SECRET over the raw body. */
export const POST = clubApi('PaymentWebhook', async (request) => {
  const raw = await request.text();
  const result = await handleWebhook(
    adminDb(), razorpayGateway(), raw, request.headers.get('x-razorpay-signature'), request.headers.get('x-razorpay-event-id'),
  );
  return ok(result);
});
