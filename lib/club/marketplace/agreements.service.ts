// Agreements: the locked rate and itemised invoice made when an offer is accepted. Paying its deposit
// (see payments) marks the plan a "Vibers Verified Plan".
import { fail, must } from '../http';
import { getSettings } from '../settings';
import { agreementFor } from './offer-rules';

export const AGREEMENT_COLUMNS =
  'id, offer_id, event_id, property_id, creator_id, owner_id, invoice_number, items, total, deposit_amount, status, locked_at';

export async function lockAgreement(db: any, offer: any) {
  const { deposit_bps } = await getSettings(db);
  const a = agreementFor({ rate: offer.rate, guests: offer.guests, check_in: offer.check_in, check_out: offer.check_out, add_ons: offer.add_ons }, deposit_bps);
  return must(await db.from('club_agreements').insert({
    offer_id: offer.id, event_id: offer.event_id, property_id: offer.property_id, creator_id: offer.creator_id, owner_id: offer.owner_id,
    invoice_number: a.invoiceNumber, items: a.items, total: a.total, deposit_amount: a.deposit, status: 'awaiting_deposit',
  }).select(AGREEMENT_COLUMNS).single());
}

export async function loadAgreement(db: any, id: string) {
  const a = must(await db.from('club_agreements').select(AGREEMENT_COLUMNS).eq('id', id).maybeSingle()) as any;
  if (!a) fail(404, 'Agreement not found.');
  return a;
}

export async function agreementsForEvent(db: any, eventId: string) {
  return must(await db.from('club_agreements').select(AGREEMENT_COLUMNS).eq('event_id', eventId).order('locked_at', { ascending: true })) as any[];
}

export async function agreementForOffer(db: any, offerId: string) {
  return must(await db.from('club_agreements').select(AGREEMENT_COLUMNS).eq('offer_id', offerId).maybeSingle()) as any;
}

export async function offerThread(db: any, offerId: string) {
  return must(await db.from('club_offer_revisions').select('id, actor_id, action, rate, guests, check_in, check_out, add_ons, note, created_at')
    .eq('offer_id', offerId).order('created_at', { ascending: true })) as any[];
}

export async function offersForEvent(db: any, eventId: string) {
  return must(await db.from('club_offers').select('id, property_id, status, rate, guests, check_in, check_out, version, last_actor, updated_at')
    .eq('event_id', eventId).order('updated_at', { ascending: false })) as any[];
}

export async function offersForOwner(db: any, ownerId: string) {
  return must(await db.from('club_offers').select('id, event_id, property_id, status, rate, guests, check_in, check_out, version, last_actor, updated_at')
    .eq('owner_id', ownerId).order('updated_at', { ascending: false }).limit(100)) as any[];
}
