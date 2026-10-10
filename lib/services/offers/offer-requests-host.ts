// The host's side of offer requests: the open list, and settling or closing one. Every change is scoped to the
// host's own venue, and only an open request can change.
import type { OfferRequestView, WriteResult } from './offer-requests';

const VIEW_COLUMNS = 'id, kind, code, offer_title, status, table_number, guest_name, message, created_at';
const LIVE_WINDOW_HOURS = 24;

export async function listOpenOfferRequests(db: any, businessId: string): Promise<OfferRequestView[]> {
  const since = new Date(Date.now() - LIVE_WINDOW_HOURS * 3600_000).toISOString();
  const { data, error } = await db
    .from('venue_offer_requests')
    .select(VIEW_COLUMNS)
    .eq('venue_id', businessId)
    .eq('status', 'open')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data || []) as OfferRequestView[];
}

/** The host settles a redemption at the counter, or closes an inquiry or redemption. */
export async function settleOfferRequest(
  db: any,
  businessId: string,
  id: string,
  status: 'settled' | 'closed'
): Promise<WriteResult<{ id: string }>> {
  const { data, error } = await db
    .from('venue_offer_requests')
    .update({ status, settled_at: new Date().toISOString() })
    .eq('id', id)
    .eq('venue_id', businessId)
    .eq('status', 'open')
    .select('id, kind, code')
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false, status: 404, error: 'Request not found or already handled.' };

  // A redemption's alert carries its code, so the bell clears with the request.
  if (data.kind === 'redeem' && data.code) {
    const { error: alertErr } = await db
      .from('staff_notifications')
      .update({ status: 'RESOLVED' })
      .eq('business_id', businessId)
      .eq('status', 'PENDING')
      .eq('notification_type', 'OFFER_REDEEM')
      .ilike('message', `*${data.code}*`);
    if (alertErr) console.error('[Offer request] alert not cleared:', alertErr.message);
  }
  return { ok: true, value: { id: data.id } };
}
