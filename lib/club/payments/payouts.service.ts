// Vendor payouts from a plan's escrow. A payout to a verified property is approved by staff (or
// automatically when the global approval toggle is off); an unverified third-party service always
// needs staff. Approval moves money escrow → payable; marking it paid moves payable → cash.
import { randomUUID } from 'node:crypto';
import { fail, must } from '../http';
import { cleanText } from '../identity/identity-rules';
import { toPaise } from '../money';
import { getSettings } from '../settings';
import { loadEvent } from '../events/events.service';
import { loadProperty } from '../marketplace/properties.service';
import { CASH, ensureAccount, escrowOf, payableOf, postJournal } from '../ledger/journal';
import { allocateLines, payoutLines } from '../ledger/postings';

const PAYOUT_COLUMNS = 'id, event_id, property_id, payee_label, third_party, amount, status, provider, approved_at, paid_reference, paid_at, attempts, last_error, created_at';

export async function requestPayout(db: any, actorId: string, isStaff: boolean, body: Record<string, any>) {
  const event = await loadEvent(db, String(body.event_id || ''));
  if (!isStaff && event.creator_id !== actorId) fail(403, 'Only the plan creator or staff can request payouts.');
  const amount = toPaise(body.amount, { allowZero: false });
  if (amount == null) fail(400, 'Enter the payout amount.');
  let payee = cleanText(body.payee_label, 120);
  let propertyId: string | null = null;
  if (body.property_id) {
    const property = await loadProperty(db, String(body.property_id));
    if (property.status !== 'verified') fail(409, 'This property is not verified.');
    propertyId = property.id;
    payee = property.name;
  }
  if (!payee) fail(400, 'Name who is being paid.');
  const key = typeof body.idempotency_key === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(body.idempotency_key) ? body.idempotency_key : randomUUID();

  const res = await db.from('club_payouts').insert({
    event_id: event.id, property_id: propertyId, payee_label: payee, third_party: !propertyId, amount, idempotency_key: key, created_by: actorId,
    status: 'pending_approval', provider: 'manual', attempts: 0,
  }).select(PAYOUT_COLUMNS).single();
  const payout: any = res.error?.code === '23505'
    ? must(await db.from('club_payouts').select(PAYOUT_COLUMNS).eq('idempotency_key', key).single())
    : must(res);
  const { payout_requires_approval } = await getSettings(db);
  if (payout.status === 'pending_approval' && !payout.third_party && !payout_requires_approval) return approvePayout(db, actorId, payout.id);
  return payout;
}

async function payableFor(db: any, payout: any) {
  return ensureAccount(db, payableOf(payout.event_id, payout.property_id || `payout-${payout.id}`, payout.property_id));
}

export async function approvePayout(db: any, approverId: string, payoutId: string) {
  const payout = must(await db.from('club_payouts').select(PAYOUT_COLUMNS).eq('id', payoutId).maybeSingle()) as any;
  if (!payout) fail(404, 'Payout not found.');
  if (payout.status !== 'pending_approval') fail(409, `This payout is already ${payout.status}.`);
  const [escrow, payable] = await Promise.all([ensureAccount(db, escrowOf(payout.event_id)), payableFor(db, payout)]);
  const journal = await postJournal(db, {
    key: `allocate:${payout.id}`, kind: 'payout_approved', eventId: payout.event_id, memo: payout.payee_label, actorId: approverId,
    lines: allocateLines(escrow, payable, Number(payout.amount)),
  });
  return must(await db.from('club_payouts').update({ status: 'approved', approved_by: approverId, approved_at: new Date().toISOString(), allocate_journal_id: journal })
    .eq('id', payoutId).eq('status', 'pending_approval').select(PAYOUT_COLUMNS).single());
}

export async function markPayoutPaid(db: any, staffId: string, payoutId: string, rawReference: unknown) {
  const reference = cleanText(rawReference, 80);
  if (!reference) fail(400, 'Enter the bank or UPI reference of the transfer.');
  const payout = must(await db.from('club_payouts').select(PAYOUT_COLUMNS).eq('id', payoutId).maybeSingle()) as any;
  if (!payout) fail(404, 'Payout not found.');
  if (payout.status !== 'approved') fail(409, 'Only an approved payout can be marked paid.');
  const [payable, cash] = await Promise.all([payableFor(db, payout), ensureAccount(db, CASH)]);
  const journal = await postJournal(db, {
    key: `payout:${payout.id}`, kind: 'payout_paid', eventId: payout.event_id, memo: `${payout.payee_label} ${reference}`, actorId: staffId,
    lines: payoutLines(payable, cash, Number(payout.amount)),
  });
  return must(await db.from('club_payouts').update({ status: 'paid', paid_reference: reference, paid_at: new Date().toISOString(), payout_journal_id: journal, attempts: payout.attempts + 1 })
    .eq('id', payoutId).eq('status', 'approved').select(PAYOUT_COLUMNS).single());
}

export async function rejectPayout(db: any, staffId: string, payoutId: string, rawNote: unknown) {
  const rows = must(await db.from('club_payouts').update({ status: 'rejected', last_error: cleanText(rawNote, 300), approved_by: staffId })
    .eq('id', payoutId).eq('status', 'pending_approval').select(PAYOUT_COLUMNS)) as any[];
  if (rows.length === 0) fail(409, 'Only a pending payout can be rejected.');
  return rows[0];
}

export async function payoutsFor(db: any, filter: { eventId?: string; status?: string }) {
  let q = db.from('club_payouts').select(PAYOUT_COLUMNS);
  if (filter.eventId) q = q.eq('event_id', filter.eventId);
  if (filter.status) q = q.eq('status', filter.status);
  return must(await q.order('created_at', { ascending: false }).limit(200)) as any[];
}
