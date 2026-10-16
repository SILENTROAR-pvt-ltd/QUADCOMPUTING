import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { legacyToEvent, type LegacyMoment } from '@/lib/services/live-events/legacy-import';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'Cache-Control': 'no-store' };

/** The venue's old photo-vault moments that are still showing (dish photos are menu material and are left alone). */
async function legacyMoments(db: any, businessId: string): Promise<LegacyMoment[]> {
  const { data } = await db.from('venue_photo_vault').select('id, title, category, time_tag, image_url, description')
    .eq('venue_id', businessId).eq('is_active', true).neq('category', 'Dish photos');
  return data || [];
}

/** GET /api/host/live-events/import — how many old moments could be turned into live events. Owner only. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    return NextResponse.json({ success: true, count: (await legacyMoments(adminDb(), auth.businessId)).length }, { headers: NO_STORE });
  } catch (error) {
    return handleApiError(error, request, 'HostLiveEventsImportGET');
  }
}, 'HostLiveEventsImportGET');

/** POST /api/host/live-events/import — turns the old moments into live events and takes the old ones down. Owner only. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const db = adminDb();
    const moments = await legacyMoments(db, auth.businessId);
    if (moments.length === 0) return NextResponse.json({ success: true, imported: 0 }, { headers: NO_STORE });

    const now = Date.now();
    const { error } = await db.from('venue_live_events').insert(moments.map((m) => ({ ...legacyToEvent(m, now), business_id: auth.businessId })));
    if (error) {
      const missing = error.code === '42P01' || error.code === 'PGRST205';
      return NextResponse.json({ success: false, error: missing ? 'Live events need one database update first (migration 20261016000007).' : 'Could not import the moments.' }, { status: missing ? 409 : 500, headers: NO_STORE });
    }
    // Taken down only after the events exist, so a failure above leaves the guests' lounge as it was.
    await db.from('venue_photo_vault').update({ is_active: false }).in('id', moments.map((m) => m.id)).eq('venue_id', auth.businessId);
    return NextResponse.json({ success: true, imported: moments.length }, { headers: NO_STORE });
  } catch (error) {
    return handleApiError(error, request, 'HostLiveEventsImportPOST');
  }
}, 'HostLiveEventsImportPOST');
