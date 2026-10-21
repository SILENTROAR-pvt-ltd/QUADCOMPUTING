import { NextResponse } from 'next/server';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { isOccupied, publicBusiness, publicRoom } from '@/lib/services/stay/room-access.service';
import { roomFolio, roomInvoice } from '@/lib/services/stay/room-folio.service';
import { lateCheckoutAvailable, lateCheckoutView } from '@/lib/services/stay/late-checkout-view';
import { checkoutRequestView } from '@/lib/services/stay/checkout-request.service';
import { diningMessage, loadDiningWindow } from '@/lib/services/stay/room-dining-hours';
import { roomContext } from '@/lib/services/stay/room-route.util';

export const dynamic = 'force-dynamic';

/**
 * GET /api/guest/room/[code]
 * The in-room page's state: the room and venue (public fields), whether a stay is checked in, whether this browser
 * has confirmed it belongs to the guest, whether the kitchen is open, and, once confirmed, the running bill and the
 * late check-out options. The limit check and the room lookup run together, and the kitchen hours and the bill are
 * read together: the page waits on this call, so it makes as few sequential trips to the database as it can.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const [limited, ctx] = await Promise.all([enforceRateLimit(request, 'room_view', 120, 60_000, code), roomContext(request, code)]);
    if (limited) return limited;
    if (!ctx.ok) return ctx.response;
    const { db, stay, verified } = ctx;
    const occupied = isOccupied(stay.room);

    // ?view=menu: the menu page only needs the room, the venue and the kitchen hours, so the bill is not read for it.
    const own = occupied && verified && new URL(request.url).searchParams.get('view') !== 'menu';
    const [window, folio, invoice, lateOk] = await Promise.all([
      loadDiningWindow(db, stay.business.id),
      own ? roomFolio(db, stay.business.id, stay.room) : Promise.resolve(null),
      own ? roomInvoice(db, stay.business.id, stay.room) : Promise.resolve(null),
      own ? lateCheckoutAvailable(db, stay.business.id, stay.room) : Promise.resolve(true),
    ]);

    return NextResponse.json({
      success: true,
      room: publicRoom(stay.room, verified),
      business: publicBusiness(stay.business),
      occupied,
      verified: occupied && verified,
      dining: { enabled: stay.business.in_room_dining_enabled !== false, open: window.open, message: diningMessage(window), opens_at: window.opensAt, closes_at: window.closesAt },
      folio,
      // The room's tax invoice from the desk, so the guest's bill page shows the real bill, not a summary of it.
      invoice,
      late_checkout: own ? lateCheckoutView(stay.room, stay.business, lateOk) : null,
      // The guest's "ready to leave" request, while the desk has not answered it.
      checkout_request: own ? checkoutRequestView(stay.room) : null,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'GuestRoomGET');
  }
}, 'GuestRoomGET');
