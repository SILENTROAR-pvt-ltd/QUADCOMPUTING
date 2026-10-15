import { safeMessage } from '@/lib/utils/safe-message';
import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { CLOSED_ORDER_STATUSES } from '@/lib/services/accommodation/stay-folio.util';

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

    // 1. Fetch active orders scoped to business
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('room_id', roomId)
      .eq('business_id', businessId)
      .or('order_type.is.null,order_type.neq.room_stay')
      .not('status', 'in', CLOSED_ORDER_STATUSES)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('[API Room Orders Error]', ordersError);
    }

    // 2. Fetch active kitchen tickets scoped to business
    const { data: tickets, error: ticketsError } = await supabase
      .from('kitchen_tickets')
      .select('*')
      .eq('room_id', roomId)
      .eq('business_id', businessId)
      .neq('status', 'SERVED')
      .neq('status', 'CANCELLED')
      .order('created_at', { ascending: false });

    if (ticketsError) {
      console.error('[API Room KOTs Error]', ticketsError);
    }

    const grandTotal = (orders || []).reduce((acc: number, ord: any) => acc + (Number(ord.grand_total) || 0), 0);

    return NextResponse.json({
      success: true,
      orders: orders || [],
      tickets: tickets || [],
      grandTotal
    });
  } catch (error: any) {
    console.error('[API Room Orders GET]', error);
    return NextResponse.json({ success: false, error: safeMessage(error, 'Internal Server Error') }, { status: 500 });
  }
}, 'AccommodationsRoomOrdersGET');
