import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { UUID_REGEX, validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { bookedSeats } from '@/lib/services/live-events/events.service';
import { guestContact } from '@/lib/services/live-events/guest-identity';
import { cleanEmail, normalizePhone } from '@/lib/services/live-events/guest-key';
import { ownGuestKey, resolveGuestKey } from '@/lib/services/live-events/ledger.service';
import { checkParty, fitsSeats, seatsLeft } from '@/lib/services/live-events/party';
import { hasFeature } from '@/lib/services/billing/feature-gate';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'Cache-Control': 'no-store' };
const bad = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status, headers: NO_STORE });

/**
 * POST /api/guest/events/interest  { venue_id, event_id, party: { male, female, other }, phone?, name?, email? }
 * Puts the guest on the event's list. A signed-in guest is identified only by their own sign-in; anyone else must give a
 * name and a phone number or email, so the venue can reach them.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const validation = await validateGuestAccess(body?.venue_id || body?.cafe_id);
  if (validation.error) return validation.error;
  const businessId = validation.businessId;
  const limited = await enforceRateLimit(request, 'guest_event_interest', 40, 60_000, businessId);
  if (limited) return limited;

  const eventId = String(body?.event_id ?? '');
  if (!UUID_REGEX.test(eventId)) return bad('Choose an event.');

  const db = adminDb();
  if (!(await hasFeature(businessId, 'events', db))) return bad('Events are not open at this venue right now.', 402);
  const { data: event } = await db.from('venue_live_events').select('*').eq('id', eventId).eq('business_id', businessId).maybeSingle();
  if (!event || event.status !== 'LIVE') return bad('This event is no longer open.', 404);
  const ends = Date.parse(event.ends_at || '') || Date.parse(event.starts_at) + 4 * 60 * 60 * 1000;
  if (ends < Date.now()) return bad('This event has already finished.', 410);

  const party = checkParty(body?.party ?? {});
  if (!party.ok) return bad(party.error);

  const me = await guestContact(db, request, businessId);
  const name = (me.signedIn ? me.name : String(body?.name ?? '')).replace(/\s+/g, ' ').trim().slice(0, 60);
  // A typed phone fills a gap only; a signed-in guest's own details are never replaced by what the browser sends.
  // A signed-in guest is identified by their own account only: a typed phone or email could name another guest's row.
  const phone = me.phone || (me.signedIn ? null : normalizePhone(body?.phone));
  const email = me.email || (me.signedIn ? null : cleanEmail(body?.email));
  const handle = me.handle;
  if (name.length < 2) return bad('Please tell us your name.');
  // A signed-in guest is matched to their own ledger row. An anonymous caller keeps only the key their typed details give,
  // so a phone or email typed by someone else can never be matched to (and overwrite) another guest's lead.
  const key = me.signedIn
    ? await resolveGuestKey(db, businessId, { handle, phone, email })
    : ownGuestKey({ handle: null, phone, email });
  if (!key) return bad('Please add a phone number or email so the team can reach you.');

  // The friendly check: what is left, ignoring this guest's own earlier booking (a change of party replaces it).
  const seats = { capacity: event.capacity ?? null, male_capacity: event.male_capacity ?? null, female_capacity: event.female_capacity ?? null };
  const booked = (await bookedSeats(db, [eventId])).get(eventId) || { total: 0, male: 0, female: 0 };
  const { data: mine } = await db.from('event_guest_leads').select('party_size, party_male, party_female, status').eq('event_id', eventId).eq('guest_key', key).maybeSingle();
  // An anonymous booking can't change an existing lead: the details were typed by whoever sent them.
  if (!me.signedIn && mine && mine.status !== 'DECLINED') {
    return bad('You are already on the guest list for this event. The lounge team will be in touch to change it.', 409);
  }
  if (mine && mine.status !== 'DECLINED') { booked.total -= mine.party_size; booked.male -= mine.party_male; booked.female -= mine.party_female; }
  const fit = fitsSeats(party.mix, seatsLeft(seats, booked));
  if (!fit.ok) return bad(fit.error, 409);

  const { data, error } = await db.rpc('record_event_interest', {
    p_business_id: businessId, p_event_id: eventId, p_guest_key: key, p_guest_name: name, p_handle: handle, p_email: email, p_phone: phone,
    p_party_male: party.mix.male, p_party_female: party.mix.female, p_party_other: party.mix.other, p_ratio_ok: true,
  });
  // The database repeats the seat check under a lock: if another party took the last seats a moment ago, say so.
  if (error && /EVENT_FULL|EVENT_CLOSED/.test(error.message || '')) {
    return bad(/CLOSED/.test(error.message) ? 'This event is no longer open.' : 'Those seats were just taken. Please check what is left and try again.', 409);
  }
  if (error) {
    const missing = error.code === 'PGRST202' || error.code === '42P01' || /record_event_interest|venue_live_events/.test(error.message || '');
    return bad(missing ? 'Events are not switched on for this venue yet.' : 'That could not be saved. Please try again.', missing ? 503 : 500);
  }

  // The team hears about it on the same bell as a call-staff or bill request. Best-effort: the lead is already saved.
  const { error: bellError } = await db.from('staff_notifications').insert({
    business_id: businessId, notification_type: 'EVENT_INTEREST', status: 'PENDING', created_at: new Date().toISOString(),
    message: `${name} is interested in "${event.title}" (${party.size} ${party.size === 1 ? 'guest' : 'guests'}: ${party.mix.male} men, ${party.mix.female} women${party.mix.other ? `, ${party.mix.other} other` : ''}).`,
  });
  if (bellError) console.error('[events] could not notify the team (migration 20261016000008 applied?):', bellError.message);

  // The request's id goes back to this phone only: it is how the guest later sees whether the venue confirmed them
  // (GET /api/guest/events/mine), without anyone being able to look a booking up by typing a phone number.
  return NextResponse.json({
    success: true, status: data?.status ?? 'INTERESTED', lead_id: data?.lead_id ?? null,
    message: "Request sent! The venue will confirm your place here.",
  }, { headers: NO_STORE });
}, 'GuestEventInterest');
