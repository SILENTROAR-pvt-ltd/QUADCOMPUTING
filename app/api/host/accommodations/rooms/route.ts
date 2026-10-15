import { safeMessage } from '@/lib/utils/safe-message';
import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { CLOSED_ORDER_STATUSES } from '@/lib/services/accommodation/stay-folio.util';

export const dynamic = 'force-dynamic';

export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;

    // Fetch all physical rooms with their category details
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select(`
        *,
        category:room_categories(id, name, price, occupancy, photos, amenities, addons, available_addons)
      `)
      .eq('business_id', businessId)
      .order('room_number', { ascending: true });

    if (roomsError) {
      console.error('[API Accommodations Rooms GET]', roomsError);
      return NextResponse.json({ success: false, error: roomsError.message }, { status: 500 });
    }

    // Unpaid room-service orders per room (the live KOT billing on the front desk). The stay's own
    // tariff folio is not a kitchen order, so it is left out.
    const roomIds = (rooms || []).map(r => r.id);
    const activeOrdersByRoom: Record<string, { count: number; total: number }> = {};

    if (roomIds.length > 0) {
      const { data: orders } = await supabase
        .from('orders')
        .select('id, room_id, grand_total, status')
        .eq('business_id', businessId)
        .in('room_id', roomIds)
        .or('order_type.is.null,order_type.neq.room_stay')
        .not('status', 'in', CLOSED_ORDER_STATUSES);

      if (orders) {
        orders.forEach(ord => {
          if (ord.room_id) {
            if (!activeOrdersByRoom[ord.room_id]) {
              activeOrdersByRoom[ord.room_id] = { count: 0, total: 0 };
            }
            activeOrdersByRoom[ord.room_id].count += 1;
            activeOrdersByRoom[ord.room_id].total += Number(ord.grand_total) || 0;
          }
        });
      }
    }

    const enrichedRooms = (rooms || []).map(room => ({
      ...room,
      activeOrdersCount: activeOrdersByRoom[room.id]?.count || 0,
      activeOrdersTotal: activeOrdersByRoom[room.id]?.total || 0
    }));

    return NextResponse.json({
      success: true,
      rooms: enrichedRooms
    });
  } catch (error: any) {
    console.error('[API Accommodations Rooms GET]', error);
    return NextResponse.json({ success: false, error: safeMessage(error, 'Internal Server Error') }, { status: 500 });
  }
}, 'AccommodationsRoomsGET');

export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;

    const body = await request.json();
    const { category_id, room_number } = body;

    if (!category_id || !room_number) {
      return NextResponse.json({ success: false, error: 'Category ID and room number required' }, { status: 400 });
    }

    const { data: newRoom, error: insertError } = await supabase
      .from('rooms')
      .insert({
        business_id: businessId,
        category_id,
        room_number: room_number.trim(),
        status: 'VACANT',
        qr_code_hash: `ROOM_${category_id.slice(0, 8)}_${room_number}_${Date.now().toString(36)}`
      })
      .select(`*, category:room_categories(id, name, price, occupancy)`)
      .single();

    if (insertError) {
      console.error('[API Accommodations Rooms POST] Insert Error:', insertError);
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    try {
      const { checkFreeTier, logFreeTierUsage } = await import('@/lib/services/wallet/free-tier.service');
      const { evaluateFeeGuard } = await import('@/lib/services/wallet/fee-guard.service');

      const tierCheck = await checkFreeTier(supabase, businessId, 'room');
      if (tierCheck.existingCount <= tierCheck.threshold) {
        await logFreeTierUsage(supabase, businessId, 'room_creation', newRoom.id);
      } else {
        await evaluateFeeGuard(businessId, 'room_creation', newRoom.id, supabase, tierCheck.cost);
      }
    } catch (guardErr) {
      console.error('[Accommodations Room POST FeeGuard Error]', guardErr);
    }

    return NextResponse.json({ success: true, room: newRoom });
  } catch (error: any) {
    console.error('[API Accommodations Rooms POST]', error);
    return NextResponse.json({ success: false, error: safeMessage(error, 'Internal Server Error') }, { status: 500 });
  }
}, 'AccommodationsRoomsPOST');

export const PATCH = withApiErrorBoundary(async function PATCH(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;

    const body = await request.json();
    const { id, room_number, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Room ID required' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {};
    if (room_number && typeof room_number === 'string' && room_number.trim()) {
      updatePayload.room_number = room_number.trim();
    }
    if (status) {
      updatePayload.status = status;
    }

    const { data: updatedRoom, error: updateError } = await supabase
      .from('rooms')
      .update(updatePayload)
      .eq('id', id)
      .eq('business_id', businessId)
      .select(`*, category:room_categories(id, name, price, occupancy)`)
      .single();

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, room: updatedRoom });
  } catch (error: any) {
    console.error('[API Accommodations Rooms PATCH]', error);
    return NextResponse.json({ success: false, error: safeMessage(error, 'Internal Server Error') }, { status: 500 });
  }
}, 'AccommodationsRoomsPATCH');

export const DELETE = withApiErrorBoundary(async function DELETE(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('id');

    if (!roomId) {
      return NextResponse.json({ success: false, error: 'Room ID required' }, { status: 400 });
    }

    const { data: roomToDel } = await supabase
      .from('rooms')
      .select('status')
      .eq('id', roomId)
      .eq('business_id', businessId)
      .single();

    if (roomToDel?.status === 'OCCUPIED') {
      return NextResponse.json({ success: false, error: 'Cannot delete an occupied room. Check out guest first.' }, { status: 400 });
    }

    const { error: delError } = await supabase
      .from('rooms')
      .delete()
      .eq('id', roomId)
      .eq('business_id', businessId);

    if (delError) {
      return NextResponse.json({ success: false, error: delError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Accommodations Rooms DELETE]', error);
    return NextResponse.json({ success: false, error: safeMessage(error, 'Internal Server Error') }, { status: 500 });
  }
}, 'AccommodationsRoomsDELETE');
