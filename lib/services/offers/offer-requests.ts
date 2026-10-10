// Redeeming a live offer and asking the host about one. Each request is stored for the host to settle or
// close, and raises a live alert on the host's notification feed. Every lookup is scoped to the venue.
import { makeRedeemCode, type OfferRequestInput } from './offer-request-input';

export type WriteResult<T> = { ok: true; value: T } | { ok: false; status: number; error: string };

export interface OfferRequestView {
  id: string;
  kind: 'redeem' | 'inquiry';
  code: string | null;
  offer_title: string;
  status: 'open' | 'settled' | 'closed';
  table_number: string | null;
  guest_name: string | null;
  message: string | null;
  created_at: string;
}

const VIEW_COLUMNS = 'id, kind, code, offer_title, status, table_number, guest_name, message, created_at';

function isExpired(validUntil: string | null | undefined): boolean {
  return Boolean(validUntil) && Date.parse(validUntil as string) <= Date.now();
}

export async function createOfferRequest(
  db: any,
  businessId: string,
  input: OfferRequestInput,
  accountId: string | null
): Promise<WriteResult<{ id: string; code: string | null; status: string }>> {
  const { data: offer, error: offerErr } = await db
    .from('venue_live_offers')
    .select('id, venue_id, title, is_active, valid_until')
    .eq('id', input.offerId)
    .maybeSingle();
  if (offerErr) throw offerErr;
  if (!offer || String(offer.venue_id) !== businessId || !offer.is_active || isExpired(offer.valid_until)) {
    return { ok: false, status: 404, error: 'This offer is no longer available.' };
  }

  const code = input.kind === 'redeem' ? makeRedeemCode() : null;
  const { data, error } = await db
    .from('venue_offer_requests')
    .insert({
      venue_id: businessId,
      offer_id: offer.id,
      offer_title: offer.title,
      kind: input.kind,
      code,
      table_number: input.table,
      guest_name: input.guestName,
      guest_account_id: accountId,
      message: input.message,
      status: 'open',
    })
    .select('id, status')
    .single();
  if (error) throw error;

  // The host hears about it on the live alert feed. The request is already stored, so a failed alert
  // is logged rather than failing the guest's request; the host panel still lists it.
  const alertText = input.kind === 'redeem'
    ? `Redeem ${code} · ${offer.title}`
    : `Question about ${offer.title}: ${input.message}`;
  const { error: alertErr } = await db.from('staff_notifications').insert({
    business_id: businessId,
    table_number: input.table,
    notification_type: input.kind === 'redeem' ? 'OFFER_REDEEM' : 'OFFER_INQUIRY',
    message: alertText.slice(0, 300),
    status: 'PENDING',
    created_at: new Date().toISOString(),
  });
  if (alertErr) console.error('[Offer request] alert not stored:', alertErr.message);

  return { ok: true, value: { id: data.id, code, status: data.status } };
}

export async function getOfferRequest(db: any, businessId: string, id: string): Promise<WriteResult<OfferRequestView>> {
  const { data, error } = await db
    .from('venue_offer_requests')
    .select(VIEW_COLUMNS)
    .eq('id', id)
    .eq('venue_id', businessId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false, status: 404, error: 'Request not found.' };
  return { ok: true, value: data as OfferRequestView };
}
