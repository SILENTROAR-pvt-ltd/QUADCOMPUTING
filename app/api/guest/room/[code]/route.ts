import { NextResponse } from 'next/server';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { isOccupied, publicBusiness, publicRoom, roomFolio } from '@/lib/services/stay/room-access.service';
import { diningMessage, loadDiningWindow } from '@/lib/services/stay/room-dining-hours';
import { roomContext } from '@/lib/services/stay/room-route.util';

export const dynamic = 'force-dynamic';

/**
 * GET /api/guest/room/[code]
 * The in-room page's state: the room and venue (public fields), whether a stay is checked in, whether this browser
 * has confirmed it belongs to the guest, whether the kitchen is open, and, once confirmed, the running bill.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const limited = await enforceRateLimit(request, 'room_view', 120, 60_000, code);
    if (limited) return limited;

    const ctx = await roomContext(request, code);
    if (!ctx.ok) return ctx.response;
    const { db, stay, verified } = ctx;
    const occupied = isOccupied(stay.room);

    const window = await loadDiningWindow(db, stay.business.id);
    const folio = occupied && verified ? await roomFolio(db, stay.business.id, stay.room) : null;

    return NextResponse.json({
      success: true,
      room: publicRoom(stay.room),
      business: publicBusiness(stay.business),
      occupied,
      verified: occupied && verified,
      dining: { enabled: stay.business.in_room_dining_enabled !== false, open: window.open, message: diningMessage(window), opens_at: window.opensAt, closes_at: window.closesAt },
      folio,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'GuestRoomGET');
  }
}, 'GuestRoomGET');
