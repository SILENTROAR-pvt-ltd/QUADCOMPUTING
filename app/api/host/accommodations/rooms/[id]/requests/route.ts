import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { adminDb } from '@/lib/supabase/admin';
import { roomRequests } from '@/lib/services/stay/room-requests.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/host/accommodations/rooms/[id]/requests
 * Everything the in-house guest has asked the desk for during this stay, waiting or done, newest first: the folio's
 * request history. A free room has none.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { id } = await params;
    const db = adminDb();
    const { data: room, error } = await db.from('rooms')
      .select('id, room_number, status, check_in_time, check_in_date').eq('id', id).eq('business_id', auth.businessId).maybeSingle();
    if (error) throw error;
    if (!room) return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });
    const requests = String(room.status || '').toUpperCase() === 'OCCUPIED' ? await roomRequests(db, auth.businessId, room) : [];
    return NextResponse.json({ success: true, requests }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'AccommodationsRoomRequestsGET');
  }
}, 'AccommodationsRoomRequestsGET');
