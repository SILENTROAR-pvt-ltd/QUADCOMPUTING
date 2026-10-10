import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { buildStayFolio, CLOSED_ORDER_STATUSES, stayNights } from '@/lib/services/accommodation/stay-folio.util';

export const dynamic = 'force-dynamic';

export const GET = withApiErrorBoundary(async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;

    const { id: roomId } = await params;
    if (!roomId) {
      return NextResponse.json({ success: false, error: 'Room ID required' }, { status: 400 });
    }

    // 1. Fetch Room Details with Category scoped to this business
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select(`
        *,
        category:room_categories(*)
      `)
      .eq('id', roomId)
      .eq('business_id', businessId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ success: false, error: roomError?.message || 'Room not found' }, { status: 404 });
    }

    // 2. Fetch Active Food / POS Orders for this room
    const { data: allOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('room_id', roomId)
      .eq('business_id', businessId)
      .not('status', 'in', CLOSED_ORDER_STATUSES)
      .order('created_at', { ascending: false });

    const roomServiceOrders = (allOrders || []).filter((o: any) => o.order_type !== 'room_stay');
    const masterStayOrder = (allOrders || []).find((o: any) => o.order_type === 'room_stay' && o.status === 'active');

    // 3. Fetch Active Kitchen Tickets (KOT)
    const { data: tickets } = await supabase
      .from('kitchen_tickets')
      .select('*')
      .eq('room_id', roomId)
      .eq('business_id', businessId)
      .neq('status', 'CANCELLED')
      .order('created_at', { ascending: false });

    // 4. Fetch Guest Stay History from room_stay_logs
    let stayLogs: any[] = [];
    if (room.guest_phone) {
      const { data: logs } = await supabase
        .from('room_stay_logs')
        .select('*')
        .eq('business_id', businessId)
        .or(`room_id.eq.${roomId},guest_phone.eq.${room.guest_phone}`)
        .order('created_at', { ascending: false })
        .limit(10);
      stayLogs = logs || [];
    } else {
      const { data: logs } = await supabase
        .from('room_stay_logs')
        .select('*')
        .eq('room_id', roomId)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(10);
      stayLogs = logs || [];
    }

    // 5. What checkout would bill right now (nights stayed so far), and the nights booked.
    const roomRate = Number(room.category?.price) || 0;
    const checkIn = room.check_in_time || room.check_in_date;
    const nights = stayNights(checkIn, new Date());
    const bookedNights = room.check_out_time || room.check_out_date ? stayNights(checkIn, room.check_out_time || room.check_out_date) : null;
    const folio = buildStayFolio({
      roomId,
      roomNumber: room.room_number,
      categoryName: room.category?.name,
      rate: roomRate,
      nights,
      addons: Array.isArray(room.selected_addons) ? room.selected_addons : [],
    });
    const roomTariffSubtotal = folio.tariffTotal;
    const addonsSubtotal = folio.addonsTotal;
    const ordersSubtotal = roomServiceOrders.reduce((acc: number, o: any) => acc + (Number(o.grand_total || o.total_amount) || 0), 0);
    const grandTotalPayable = roomTariffSubtotal + addonsSubtotal + ordersSubtotal;

    return NextResponse.json({
      success: true,
      room,
      orders: roomServiceOrders,
      masterOrder: masterStayOrder || null,
      tickets: tickets || [],
      stayLogs,
      folioLines: folio.lines,
      billingSummary: {
        nights,
        bookedNights,
        roomRate,
        roomTariffSubtotal,
        addonsSubtotal,
        ordersSubtotal,
        grandTotalPayable
      }
    });
  } catch (error: any) {
    console.error('[API Room Dossier GET Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}, 'AccommodationsRoomDossierGET');
