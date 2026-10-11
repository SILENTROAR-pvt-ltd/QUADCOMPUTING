// Starting a payment: the creator's deal deposit, or a participant's next instalment. Each start is
// keyed, so pressing Pay twice reuses the same gateway order instead of charging twice.
import { fail, must } from '../http';
import { loadAgreement } from '../marketplace/agreements.service';
import { loadEvent } from '../events/events.service';
import { nextInstallment } from '../events/participation.service';
import type { PaymentGateway } from './razorpay';
import type { ViberProfile } from '../types';

const PAYMENT_COLUMNS = 'id, event_id, agreement_id, payer_id, purpose, installment, label, amount, status, gateway_order_id, idempotency_key, created_at';

interface Start { eventId: string; agreementId: string | null; payer: ViberProfile; purpose: 'deposit' | 'participant'; installment: number; label: string; amount: number; key: string }

async function start(db: any, gateway: PaymentGateway | null, s: Start) {
  if (!gateway) fail(503, 'Online payments are not configured yet.', 'payments_not_configured');
  const existing = must(await db.from('club_payments').select(PAYMENT_COLUMNS).eq('idempotency_key', s.key).maybeSingle()) as any;
  if (existing?.status === 'captured') fail(409, 'This payment is already done.', 'already_paid');
  if (existing?.status === 'created' && existing.gateway_order_id) return { payment: existing, keyId: gateway.keyId };

  const { orderId } = await gateway.createOrder(s.amount, s.key, { event_id: s.eventId, purpose: s.purpose });
  const row = { gateway_order_id: orderId, status: 'created', amount: s.amount, label: s.label };
  const payment = existing
    ? must(await db.from('club_payments').update(row).eq('id', existing.id).select(PAYMENT_COLUMNS).single())
    : must(await db.from('club_payments').insert({
        ...row, event_id: s.eventId, agreement_id: s.agreementId, payer_id: s.payer.user_id, purpose: s.purpose,
        installment: s.installment, idempotency_key: s.key,
      }).select(PAYMENT_COLUMNS).single());
  return { payment, keyId: gateway.keyId };
}

export async function startDeposit(db: any, gateway: PaymentGateway | null, payer: ViberProfile, agreementId: string) {
  const a = await loadAgreement(db, agreementId);
  if (a.creator_id !== payer.user_id) fail(403, 'Only the plan creator pays the deposit.');
  if (a.status !== 'awaiting_deposit') fail(409, 'This deposit is already paid.', 'already_paid');
  return start(db, gateway, {
    eventId: a.event_id, agreementId: a.id, payer, purpose: 'deposit', installment: 1, label: `Deposit ${a.invoice_number}`,
    amount: a.deposit_amount, key: `deposit:${a.id}`,
  });
}

export async function startInstallment(db: any, gateway: PaymentGateway | null, payer: ViberProfile, eventId: string) {
  const event = await loadEvent(db, eventId);
  if (event.status !== 'approved') fail(409, 'This plan is not taking payments.');
  const p = must(await db.from('club_event_participants').select('status, total_due, paid').eq('event_id', eventId).eq('user_id', payer.user_id).maybeSingle()) as any;
  if (!p || p.status === 'cancelled') fail(409, 'Reserve a spot first.');
  const next = nextInstallment(event, Number(p.total_due), Number(p.paid));
  if (!next) fail(409, 'You have paid in full.', 'already_paid');
  return start(db, gateway, {
    eventId, agreementId: null, payer, purpose: 'participant', installment: next.index, label: `${next.label} (${next.index}/${next.of})`,
    amount: next.amount, key: `participant:${eventId}:${payer.user_id}:${next.index}:${p.paid}`,
  });
}
