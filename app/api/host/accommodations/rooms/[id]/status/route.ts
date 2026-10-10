import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { CLEARED_GUEST_FIELDS, checkInError, checkInFields } from '@/lib/services/accommodation/room-guest-fields.util';
import { openStayFolio } from '@/lib/services/accommodation/check-in.service';

export const dynamic = 'force-dynamic';

const STATUSES = ['VACANT', 'OCCUPIED', 'CLEANING', 'MAINTENANCE'];
const ROOM_SELECT = '*, category:room_categories(id, name, price, occupancy, photos, amenities, addons, available_addons)';
const conflict = (error: string) => NextResponse.json({ success: false, error, code: 'ROOM_STATE' }, { status: 409 });

// Front desk room changes: rename, check in, or move a free room between vacant, cleaning and
// maintenance. An occupied room is only released through checkout, which bills the stay.
export const PATCH = withApiErrorBoundary(async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;
    const { id: roomId } = await params;
    const body = await request.json().catch(() => ({}));

    const { data: room, error: roomErr } = await supabase
      .from('rooms').select(ROOM_SELECT).eq('id', roomId).eq('business_id', businessId).maybeSingle();
    if (roomErr) throw roomErr;
    if (!room) return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });

    const isCheckIn = body.action === 'check-in' || body.status === 'OCCUPIED';
    const target = isCheckIn ? 'OCCUPIED' : body.action === 'mark-clean' ? 'VACANT' : body.status;
    if (target && !STATUSES.includes(target)) {
      return NextResponse.json({ success: false, error: 'Invalid room status' }, { status: 400 });
    }

    const current = String(room.status || '').toUpperCase();
    const update: Record<string, unknown> = {};
    const rename = typeof body.room_number === 'string' ? body.room_number.trim() : '';
    if (rename) update.room_number = rename;

    if (isCheckIn) {
      if (current === 'OCCUPIED') return conflict(`Room ${room.room_number} already has a guest checked in.`);
      if (current === 'MAINTENANCE') return conflict(`Room ${room.room_number} is under maintenance. Mark it vacant first.`);
      const invalid = checkInError(body);
      if (invalid) return NextResponse.json({ success: false, error: invalid }, { status: 400 });
      Object.assign(update, checkInFields(body));
    } else if (target) {
      if (current === 'OCCUPIED') return conflict('Check the guest out first; checkout bills the stay and frees the room.');
      update.status = target;
      Object.assign(update, CLEARED_GUEST_FIELDS);
      if (target === 'VACANT') Object.assign(update, { check_in_date: null, check_in_time: null, check_out_date: null, check_out_time: null });
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: false, error: 'Nothing to change.' }, { status: 400 });
    }

    // Conditional on the status read above, so two desks acting at once cannot both win.
    const { data: updated, error: updateErr } = await supabase
      .from('rooms').update(update)
      .eq('id', roomId).eq('business_id', businessId).eq('status', room.status)
      .select(ROOM_SELECT).maybeSingle();
    if (updateErr) {
      if (updateErr.code === '23505') return conflict(`Room number ${rename} is already in use.`);
      throw updateErr;
    }
    if (!updated) return conflict('This room was changed by someone else. Refresh and try again.');

    if (isCheckIn) {
      try {
        await openStayFolio(supabase, businessId, updated, checkInFields(body));
      } catch (folioErr) {
        // The guest is in the room; without a folio checkout would rebuild the bill from the room record.
        console.error('[room status] opening the stay folio failed', folioErr);
        return NextResponse.json({ success: true, room: updated, warning: 'Guest checked in, but the folio could not be opened. Checkout will rebuild it.' });
      }
    }
    return NextResponse.json({ success: true, room: updated });
  } catch (error) {
    return handleApiError(error, request, 'AccommodationsRoomStatusPATCH');
  }
}, 'AccommodationsRoomStatusPATCH');
