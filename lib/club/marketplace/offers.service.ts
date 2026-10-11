// Offers between a plan's creator and a property owner. Each change is versioned (stale screens are
// refused) and recorded as a revision; acceptance locks the rate into an agreement invoice.
import { fail, must } from '../http';
import { cleanText } from '../identity/identity-rules';
import { notify } from '../notifications.service';
import { loadEvent } from '../events/events.service';
import { loadProperty } from './properties.service';
import { lockAgreement } from './agreements.service';
import { actionError, nextStatus, parseTerms, type OfferAction } from './offer-rules';
import type { ViberProfile } from '../types';

export const OFFER_COLUMNS ='id, event_id, property_id, creator_id, owner_id, status, rate, guests, check_in, check_out, add_ons, last_actor, version, created_at, updated_at';

export async function loadOffer(db: any, id: string) {
  const offer = must(await db.from('club_offers').select(OFFER_COLUMNS).eq('id', id).maybeSingle()) as any;
  if (!offer) fail(404, 'Offer not found.');
  return offer;
}

export async function makeOffer(db: any, creator: ViberProfile, body: Record<string, any>) {
  const event = await loadEvent(db, String(body.event_id || ''));
  if (event.creator_id !== creator.user_id) fail(403, 'Only the plan creator can make offers.');
  if (event.status !== 'approved') fail(409, 'Offers open once the plan is approved.');
  const property = await loadProperty(db, String(body.property_id || ''));
  if (property.status !== 'verified') fail(409, 'This property is not verified yet.');
  if (property.owner_id === creator.user_id) fail(400, 'You cannot make an offer on your own property.');
  const parsed = parseTerms(body);
  if (!parsed.ok) fail(400, parsed.error);

  const res = await db.from('club_offers').insert({
    event_id: event.id, property_id: property.id, creator_id: creator.user_id, owner_id: property.owner_id, status: 'open', ...parsed.terms, last_actor: creator.user_id, version: 1,
  }).select(OFFER_COLUMNS).single();
  if (res.error?.code === '23505') fail(409, 'You already have a live offer with this property.');
  const offer = must(res) as any;
  await revise(db, offer.id, creator.user_id, 'offer', parsed.terms, body.note);
  await notify(db, [property.owner_id], { kind: 'offer', title: `New group offer for ${property.name}`, body: event.title, link: `/club/offers/${offer.id}` });
  return offer;
}

async function revise(db: any, offerId: string, actorId: string, action: string, terms: Record<string, any> | null, note: unknown) {
  must(await db.from('club_offer_revisions').insert({ offer_id: offerId, actor_id: actorId, action, ...(terms || {}), note: cleanText(note, 1000) }));
}

export async function respondToOffer(db: any, actorId: string, offerId: string, body: Record<string, any>) {
  const offer = await loadOffer(db, offerId);
  const action = String(body.action || '') as OfferAction;
  if (!(action in nextStatus)) fail(400, 'Unknown action.');
  const refused = actionError(offer, actorId, action);
  if (refused) fail(409, refused);
  if (Number(body.version) !== offer.version) fail(409, 'This deal changed. Refresh to see the latest terms.', 'stale');

  let terms: Record<string, any> | null = null;
  if (action === 'counter') {
    const parsed = parseTerms(body);
    if (!parsed.ok) fail(400, parsed.error);
    terms = parsed.terms;
  }
  const rows = must(await db.from('club_offers').update({
    ...(terms || {}), status: nextStatus[action], last_actor: actorId, version: offer.version + 1, updated_at: new Date().toISOString(),
  }).eq('id', offerId).eq('version', offer.version).select(OFFER_COLUMNS)) as any[];
  if (rows.length === 0) fail(409, 'This deal changed. Refresh to see the latest terms.', 'stale');
  await revise(db, offerId, actorId, action, terms, body.note);

  const updated = rows[0];
  const agreement = action === 'accept' ? await lockAgreement(db, updated) : null;
  const other = actorId === offer.creator_id ? offer.owner_id : offer.creator_id;
  await notify(db, [other], { kind: 'offer', title: `Offer ${nextStatus[action]}`, link: `/club/offers/${offerId}` });
  return { offer: updated, agreement };
}
