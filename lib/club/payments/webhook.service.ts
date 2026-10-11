// Razorpay webhooks. The signature is checked over the raw body before anything is read. Capture is
// idempotent, so the event is processed first and recorded after (a retried delivery is harmless).
import { fail, must } from '../http';
import { capturePayment, failPayment } from './capture.service';
import type { PaymentGateway } from './razorpay';

export async function handleWebhook(db: any, gateway: PaymentGateway | null, rawBody: string, signature: string | null, eventId: string | null) {
  if (!gateway) fail(503, 'Payments are not configured.');
  if (!signature || !gateway.verifyWebhook(rawBody, signature)) fail(401, 'Invalid signature.');
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    fail(400, 'Invalid payload.');
  }
  const kind = String(event?.event || '');
  const entity = event?.payload?.payment?.entity;
  const orderId = entity?.order_id as string | undefined;

  if ((kind === 'payment.captured' || kind === 'order.paid') && orderId && entity?.id) {
    if (entity.currency && entity.currency !== 'INR') fail(409, 'Unexpected currency.');
    const known = must(await db.from('club_payments').select('id').eq('gateway_order_id', orderId).maybeSingle());
    if (known) await capturePayment(db, orderId, entity.id, Number(entity.amount));
  } else if (kind === 'payment.failed' && orderId) {
    await failPayment(db, orderId);
  }

  const id = eventId || `${kind}:${entity?.id || orderId || 'unknown'}`;
  const res = await db.from('club_webhook_events').insert({ id: id.slice(0, 200), kind });
  if (res.error && res.error.code !== '23505') throw res.error;
  return { kind };
}
