import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { enabledStations, isKitchenStation, KITCHEN_STATIONS } from '@/lib/services/kitchen/item-station';

export const dynamic = 'force-dynamic';

/** GET /api/host/kitchen/stations — the stations this venue runs. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { data } = await adminDb()
      .from('businesses')
      .select('kitchen_stations')
      .eq('id', auth.businessId)
      .maybeSingle();
    return NextResponse.json({ success: true, stations: enabledStations(data?.kitchen_stations) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    return handleApiError(error, request, 'KitchenStationsGET');
  }
}, 'KitchenStationsGET');

/** PATCH /api/host/kitchen/stations  { stations: ['Kitchen', 'Bar'] } — which stations the venue runs. */
export const PATCH = withApiErrorBoundary(async function PATCH(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    if (!Array.isArray(body?.stations) || !body.stations.every(isKitchenStation)) {
      return NextResponse.json({ success: false, error: `Stations must be chosen from ${KITCHEN_STATIONS.join(', ')}.` }, { status: 400 });
    }

    // Kitchen is always on: it is where anything without a station goes.
    const stations = enabledStations(body.stations);
    const { error } = await adminDb()
      .from('businesses')
      .update({ kitchen_stations: stations })
      .eq('id', auth.businessId);
    if (error) {
      // The column arrives with migration 20261010000004; until it is applied, say so plainly.
      if (error.code === 'PGRST204' || error.code === '42703') {
        return NextResponse.json({ success: false, error: 'Station settings need the database update 20261010000004. Apply it, then try again.' }, { status: 503 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, stations });
  } catch (error: any) {
    return handleApiError(error, request, 'KitchenStationsPATCH');
  }
}, 'KitchenStationsPATCH');
