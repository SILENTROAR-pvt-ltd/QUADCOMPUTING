// The deal-flow rules, kept pure so every transition is tested directly.
//   creator offers → owner accepts, counters or rejects → … → accepted (rate locked, invoice issued)
// Parties take turns: whoever acted last waits. The creator may withdraw until it is accepted.
import { bpsOf, toPaise } from '../money';
import { cleanText } from '../identity/identity-rules';

export type OfferStatus = 'open' | 'countered' | 'accepted' | 'rejected' | 'withdrawn';
export type OfferAction = 'counter' | 'accept' | 'reject' | 'withdraw';
export interface OfferState { status: OfferStatus; creator_id: string; owner_id: string; last_actor: string }
export interface AddOn { label: string; amount: number }

export function actionError(offer: OfferState, actorId: string, action: OfferAction): string | null {
  if (actorId !== offer.creator_id && actorId !== offer.owner_id) return 'You are not part of this deal.';
  if (offer.status !== 'open' && offer.status !== 'countered') return 'This deal is closed.';
  if (action === 'withdraw') return actorId === offer.creator_id ? null : 'Only the plan creator can withdraw.';
  if (actorId === offer.last_actor) return 'Waiting for the other side to respond.';
  return null;
}

export const nextStatus: Record<OfferAction, OfferStatus> = { counter: 'countered', accept: 'accepted', reject: 'rejected', withdraw: 'withdrawn' };

export interface Terms { rate: number; guests: number; check_in: string; check_out: string; add_ons: AddOn[] }

/** Offer or counter terms from a form: total stay rate and add-ons in rupees, dates as YYYY-MM-DD. */
export function parseTerms(body: Record<string, any>): { ok: true; terms: Terms } | { ok: false; error: string } {
  const rate = toPaise(body.rate, { allowZero: false });
  if (rate == null) return { ok: false, error: 'Enter the total rate for the stay.' };
  const guests = Math.round(Number(body.guests));
  if (!Number.isInteger(guests) || guests < 1 || guests > 10_000) return { ok: false, error: 'Enter the number of guests.' };
  const date = /^\d{4}-\d{2}-\d{2}$/;
  if (!date.test(String(body.check_in)) || !date.test(String(body.check_out)) || body.check_out < body.check_in) {
    return { ok: false, error: 'Choose check-in and check-out dates.' };
  }
  const raw = Array.isArray(body.add_ons) ? body.add_ons.slice(0, 10) : [];
  const addOns: AddOn[] = [];
  for (const a of raw) {
    const label = cleanText(a?.label, 60), amount = toPaise(a?.amount);
    if (!label || amount == null) return { ok: false, error: 'Each add-on needs a name and an amount.' };
    addOns.push({ label, amount });
  }
  return { ok: true, terms: { rate, guests, check_in: body.check_in, check_out: body.check_out, add_ons: addOns } };
}

/** The itemised agreement for accepted terms. The deposit is a share of the total, at least ₹1. */
export function agreementFor(terms: Terms, depositBps: number, now: Date = new Date()) {
  const nights = Math.max(1, Math.round((Date.parse(terms.check_out) - Date.parse(terms.check_in)) / 86_400_000));
  const items = [
    { label: `Group stay: ${terms.guests} guests, ${nights} night${nights === 1 ? '' : 's'} (${terms.check_in} to ${terms.check_out})`, amount: terms.rate },
    ...terms.add_ons,
  ];
  const total = items.reduce((sum, i) => sum + i.amount, 0);
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return { items, total, deposit: Math.max(100, bpsOf(total, depositBps)), invoiceNumber: `VCI-${stamp}-${suffix}` };
}
