import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { leadsToCsv } from '@/lib/services/live-events/leads-csv';
import { UUID_REGEX } from '@/lib/auth/guest-validate';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'Cache-Control': 'no-store' };
const bad = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status, headers: NO_STORE });
const STATUSES = ['INTERESTED', 'CONFIRMED', 'DECLINED'];

/** GET /api/host/live-events/leads?event_id=[&format=csv] — the guests who said "I'm Interested" in one event. Owner only. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const q = new URL(request.url).searchParams;
    const eventId = q.get('event_id') ?? '';
    if (!UUID_REGEX.test(eventId)) return bad('Choose an event.');
    const db = adminDb();
    const { data: event } = await db.from('venue_live_events').select('id, title').eq('id', eventId).eq('business_id', auth.businessId).maybeSingle();
    if (!event) return bad('That event no longer exists.', 404);
    const { data, error } = await db.from('event_guest_leads').select('*').eq('event_id', eventId).eq('business_id', auth.businessId).order('created_at', { ascending: false }).limit(1000);
    if (error) return bad('Could not load the guest list.', 500);

    if (q.get('format') === 'csv') {
      const safe = event.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'event';
      return new NextResponse(leadsToCsv(data || []), {
        headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="guest-list-${safe}.csv"`, ...NO_STORE },
      });
    }
    return NextResponse.json({ success: true, leads: data || [] }, { headers: NO_STORE });
  } catch (error) {
    return handleApiError(error, request, 'HostEventLeadsGET');
  }
}, 'HostEventLeadsGET');

/** PATCH /api/host/live-events/leads { id, status } — confirm or decline a guest's party. */
export const PATCH = withApiErrorBoundary(async function PATCH(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => ({}));
    const status = String(body?.status ?? '').toUpperCase();
    if (!UUID_REGEX.test(String(body?.id ?? '')) || !STATUSES.includes(status)) return bad('Choose a guest and a status.');
    const { data, error } = await adminDb().from('event_guest_leads').update({ status, updated_at: new Date().toISOString() })
      .eq('id', body.id).eq('business_id', auth.businessId).select('id, status').maybeSingle();
    if (error) return bad('That could not be saved.', 500);
    if (!data) return bad('That guest is no longer on the list.', 404);
    return NextResponse.json({ success: true, lead: data }, { headers: NO_STORE });
  } catch (error) {
    return handleApiError(error, request, 'HostEventLeadsPATCH');
  }
}, 'HostEventLeadsPATCH');
