// Capturing a payment, from the checkout callback or the gateway webhook (whichever comes first).
// Every step is idempotent, so a retry or a duplicate webhook changes nothing:
//   1. post the capture journal (keyed by payment id);
//   2. mark the payment captured (only from 'created');
//   3. sync what the payment unlocks (deposit → agreement paid and plan verified; instalment →
//      participant's paid total recomputed from captured payments).
import { fail, must } from '../http';
import { getSettings } from '../settings';
import { notify } from '../notifications.service';
import { loadEvent } from '../events/events.service';
import { CASH, REVENUE, ensureAccount, escrowOf, postJournal } from '../ledger/journal';
import { captureLines } from '../ledger/postings';

export async function capturePayment(db: any, orderId: string, paymentId: string, gatewayAmount?: number) {
  const payment = must(await db.from('club_payments').select('*').eq('gateway_order_id', orderId).maybeSingle()) as any;
  if (!payment) fail(404, 'Payment not found.');
  if (gatewayAmount != null && gatewayAmount !== Number(payment.amount)) fail(409, 'The paid amount does not match this payment.', 'amount_mismatch');
  if (payment.status === 'failed') fail(409, 'This payment failed. Start a new one.');

  const event = await loadEvent(db, payment.event_id);
  const settings = await getSettings(db);
  const [cash, escrow, revenue] = await Promise.all([ensureAccount(db, CASH), ensureAccount(db, escrowOf(event.id)), ensureAccount(db, REVENUE)]);
  const { lines } = captureLines({ cash, escrow, revenue }, Number(payment.amount), event.fee_bps ?? settings.platform_fee_bps);
  const journalId = await postJournal(db, {
    key: `capture:${payment.id}`, kind: 'payment_captured', eventId: event.id, memo: payment.label, actorId: payment.payer_id, lines,
  });

  const moved = must(await db.from('club_payments').update({
    status: 'captured', gateway_payment_id: paymentId, captured_at: new Date().toISOString(), journal_id: journalId,
  }).eq('id', payment.id).eq('status', 'created').select('id')) as any[];

  await syncAfterCapture(db, payment);
  if (moved.length > 0) {
    await notify(db, [payment.payer_id], { kind: 'payment', title: 'Payment received', body: payment.label, link: `/club/events/${event.id}` });
  }
  return { journalId, newlyCaptured: moved.length > 0 };
}

async function syncAfterCapture(db: any, payment: any) {
  if (payment.purpose === 'deposit' && payment.agreement_id) {
    const paid = must(await db.from('club_agreements').update({ status: 'deposit_paid' })
      .eq('id', payment.agreement_id).eq('status', 'awaiting_deposit').select('owner_id, invoice_number')) as any[];
    must(await db.from('club_events').update({ verified: true, verified_at: new Date().toISOString() }).eq('id', payment.event_id).eq('verified', false));
    if (paid[0]) await notify(db, [paid[0].owner_id], { kind: 'deal', title: 'Deposit received: deal locked', body: paid[0].invoice_number, link: `/club/events/${payment.event_id}` });
    return;
  }
  const captured = must(await db.from('club_payments').select('amount').eq('event_id', payment.event_id).eq('payer_id', payment.payer_id)
    .eq('purpose', 'participant').eq('status', 'captured')) as any[];
  const paid = captured.reduce((sum, p) => sum + Number(p.amount), 0);
  const row = must(await db.from('club_event_participants').select('total_due').eq('event_id', payment.event_id).eq('user_id', payment.payer_id).maybeSingle()) as any;
  if (!row) return;
  must(await db.from('club_event_participants').update({ paid, ...(paid >= Number(row.total_due) ? { status: 'confirmed' } : {}) })
    .eq('event_id', payment.event_id).eq('user_id', payment.payer_id));
}

export async function failPayment(db: any, orderId: string) {
  must(await db.from('club_payments').update({ status: 'failed' }).eq('gateway_order_id', orderId).eq('status', 'created'));
}
