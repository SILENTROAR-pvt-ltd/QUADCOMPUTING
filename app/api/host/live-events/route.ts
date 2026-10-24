import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { parseEvent } from '@/lib/services/live-events/event-input';
import { bookedSeats } from '@/lib/services/live-events/events.service';
import { UUID_REGEX } from '@/lib/auth/guest-validate';
import { requireFeature } from '@/lib/services/billing/feature-gate';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'Cache-Control': 'no-store' };
const bad = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status, headers: NO_STORE });

/** A migration that has not been applied shows up as a missing table; say so instead of a bare error. */
const dbProblem = (error: any) =>
  error?.code === '42P01' || error?.code === 'PGRST205' || /venue_live_events/.test(String(error?.message || ''))
    ? bad('Live events need one database update first (migration 20261016000007_live_events_and_guest_ledger.sql).', 409)
    : bad('That could not be saved. Please try again.', 500);

/** GET /api/host/live-events — every event of this venue (past and upcoming) with how many parties are interested. Owner only. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const db = adminDb();
    const { data, error } = await db.from('venue_live_events').select('*').eq('business_id', auth.businessId).order('starts_at', { ascending: false }).limit(100);
    if (error) return dbProblem(error);
    const seats = await bookedSeats(db, (data || []).map((e: any) => e.id));
    const { data: counts } = await db.from('event_guest_leads').select('event_id').eq('business_id', auth.businessId);
    const parties = new Map<string, number>();
    for (const c of counts || []) parties.set(c.event_id, (parties.get(c.event_id) || 0) + 1);
    return NextResponse.json({ success: true, events: (data || []).map((e: any) => ({ ...e, seats_booked: seats.get(e.id)?.total || 0, men_booked: seats.get(e.id)?.male || 0, women_booked: seats.get(e.id)?.female || 0, interested_parties: parties.get(e.id) || 0 })) }, { headers: NO_STORE });
  } catch (error) {
    return handleApiError(error, request, 'HostLiveEventsGET');
  }
}, 'HostLiveEventsGET');

/** POST /api/host/live-events — publishes an event. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const blocked = await requireFeature(auth.businessId, 'events');
    if (blocked) return blocked;
    const parsed = parseEvent(await request.json().catch(() => ({})));
    if (!parsed.ok) return bad(parsed.error);
    const { data, error } = await adminDb().from('venue_live_events').insert({ ...parsed.value, business_id: auth.businessId }).select('*').single();
    if (error) return dbProblem(error);
    return NextResponse.json({ success: true, event: data }, { status: 201, headers: NO_STORE });
  } catch (error) {
    return handleApiError(error, request, 'HostLiveEventsPOST');
  }
}, 'HostLiveEventsPOST');

/** PATCH /api/host/live-events { id, ...fields } — edits an event, or cancels it with status CANCELLED. */
export const PATCH = withApiErrorBoundary(async function PATCH(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => ({}));
    if (!UUID_REGEX.test(String(body?.id ?? ''))) return bad('Missing event.');
    const parsed = parseEvent(body, { partial: true });
    if (!parsed.ok) return bad(parsed.error);
    // On a plan without events a venue can still hide, cancel or delete the ones it has, never edit or reopen them.
    if (parsed.value.status !== 'CANCELLED' && parsed.value.status !== 'DRAFT') {
      const blocked = await requireFeature(auth.businessId, 'events');
      if (blocked) return blocked;
    }
    const { data, error } = await adminDb().from('venue_live_events').update({ ...parsed.value, updated_at: new Date().toISOString() })
      .eq('id', body.id).eq('business_id', auth.businessId).select('*').maybeSingle();
    if (error) return dbProblem(error);
    if (!data) return bad('That event no longer exists.', 404);
    return NextResponse.json({ success: true, event: data }, { headers: NO_STORE });
  } catch (error) {
    return handleApiError(error, request, 'HostLiveEventsPATCH');
  }
}, 'HostLiveEventsPATCH');

/** DELETE /api/host/live-events?id= — removes an event and its guest list. */
export const DELETE = withApiErrorBoundary(async function DELETE(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const id = new URL(request.url).searchParams.get('id') ?? '';
    if (!UUID_REGEX.test(id)) return bad('Missing event.');
    const { data, error } = await adminDb().from('venue_live_events').delete().eq('id', id).eq('business_id', auth.businessId).select('id').maybeSingle();
    if (error) return dbProblem(error);
    if (!data) return bad('That event no longer exists.', 404);
    return NextResponse.json({ success: true }, { headers: NO_STORE });
  } catch (error) {
    return handleApiError(error, request, 'HostLiveEventsDELETE');
  }
}, 'HostLiveEventsDELETE');
