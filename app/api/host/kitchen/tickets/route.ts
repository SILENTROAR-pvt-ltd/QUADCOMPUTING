import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import {
  fetchKitchenTickets,
  createKitchenTicketRecord,
} from '@/lib/services/kitchen.service';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { broadcastToGuestTable } from '@/lib/realtime/channels';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Pushes the new KOT status to the guests at this ticket's table (venue-scoped).
async function notifyGuestTable(db: any, businessId: string, ticket: any, status: string) {
  // Re-sending the current status (e.g. alongside an items update) is not pushed.
  if (!ticket?.table_or_room || String(ticket.status || '').toUpperCase() === status) return;
  await broadcastToGuestTable(db, businessId, ticket.table_or_room, 'kot_status_update', {
    id: ticket.id,
    order_id: ticket.order_id,
    ticket_number: ticket.ticket_number,
    table_or_room: ticket.table_or_room,
    table_number: ticket.table_or_room,
    status,
  });
}

export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;

    const statusFilter = new URL(request.url).searchParams.get('status');
    const tickets = await fetchKitchenTickets(supabase, businessId, statusFilter);
    return NextResponse.json(
      { tickets },
      {
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      }
    );
  } catch (error: any) {
    return handleApiError(error, request, 'KitchenTicketsGET');
  }
}, 'KitchenTicketsGET');

export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;

    const body = await request.json();
    // The venue's station setting routes each line to its station (unreadable means all stations run).
    const { data: stationRow } = await supabase
      .from('businesses')
      .select('kitchen_stations')
      .eq('id', businessId)
      .maybeSingle();
    const result = await createKitchenTicketRecord(supabase, businessId, body, stationRow?.kitchen_stations);
    return NextResponse.json(result);
  } catch (error: any) {
    return handleApiError(error, request, 'KitchenTicketsPOST');
  }
}, 'KitchenTicketsPOST');

export const PATCH = withApiErrorBoundary(async function PATCH(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, user, supabase } = auth;
    const db = supabase || adminDb();

    const body = await request.json().catch(() => ({}));
    const { id, status, items, staff_id } = body;

    // Item ticks send only { id, items }; a status change needs status.
    const itemsOnly = !status && Array.isArray(items);
    if (!id || (!status && !itemsOnly)) {
      return NextResponse.json(
        { error: 'Missing required fields: id and status (or items) are required' },
        { status: 400 }
      );
    }

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid ticket id format: must be a valid UUID' },
        { status: 400 }
      );
    }

    // Verify ticket belongs to authenticated host's business
    const { data: ticketRecord, error: fetchErr } = await db
      .from('kitchen_tickets')
      .select('id, business_id, status, order_id, table_or_room, ticket_number, status_history')
      .eq('id', id)
      .eq('business_id', businessId)
      .maybeSingle();

    if (fetchErr) {
      return handleApiError(fetchErr, request, 'KitchenTicketsFetchErr');
    }

    if (!ticketRecord) {
      return NextResponse.json(
        { error: 'Kitchen ticket not found or does not belong to this venue' },
        { status: 404 }
      );
    }

    // Optional: update items array if passed. Uses the service role: RLS gives
    // hosts no direct UPDATE on kitchen_tickets (status changes go through the
    // update_kot_status RPC), so the host client "succeeded" while changing 0
    // rows and item ticks were silently lost. Ownership was verified above and
    // the write stays scoped to this venue.
    if (items && Array.isArray(items)) {
      const { data: itemRows, error: itemsErr } = await adminDb()
        .from('kitchen_tickets')
        .update({ items, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('business_id', businessId)
        .select('id');
      if (itemsErr) return handleApiError(itemsErr, request, 'KitchenTicketsItemsErr');
      if (!itemRows || itemRows.length === 0) {
        return NextResponse.json({ error: 'Kitchen ticket items were not saved' }, { status: 409 });
      }
      if (itemsOnly) {
        return NextResponse.json({ success: true, ticket: { id, items, status: ticketRecord.status } });
      }
    }

    // Execute atomic update_kot_status RPC
    const staffId = staff_id || (user?.id && UUID_REGEX.test(user.id) ? user.id : null);
    let rpcData: any = null;
    let rpcError: any = null;

    try {
      const res = await db.rpc('update_kot_status', {
        p_ticket_id: id,
        p_new_status: status,
        p_staff_id: staffId,
      });
      rpcData = res.data;
      rpcError = res.error;
    } catch (err: any) {
      rpcError = err;
    }

    // Fallback direct update if RPC is restricted or unmigrated
    if (rpcError) {
      // Service role for the same reason as the items write above (RLS would
      // turn this into a silent 0-row "success"). The stage time is recorded the
      // same way update_kot_status records it, so the kitchen timeline stays whole.
      const nowIso = new Date().toISOString();
      const history = Array.isArray(ticketRecord.status_history) ? ticketRecord.status_history : [];
      const { data: directUpdated, error: directErr } = await adminDb()
        .from('kitchen_tickets')
        .update({
          status: status.toUpperCase(),
          updated_at: nowIso,
          status_history: [...history, { from: String(ticketRecord.status || '').toUpperCase(), to: status.toUpperCase(), at: nowIso, staff_id: staffId }],
        })
        .eq('id', id)
        .eq('business_id', businessId)
        .select()
        .maybeSingle();

      if (directErr || !directUpdated) {
        return NextResponse.json(
          { error: rpcError.message || directErr?.message || 'Failed to update KOT status' },
          { status: 400 }
        );
      }

      await notifyGuestTable(db, businessId, ticketRecord, status.toUpperCase());
      return NextResponse.json({
        success: true,
        ticket: directUpdated,
        status: status.toUpperCase(),
      });
    }

    await notifyGuestTable(db, businessId, ticketRecord, String(rpcData?.ticket?.status || status).toUpperCase());
    return NextResponse.json({
      success: true,
      ticket: rpcData?.ticket || { id, status },
      ...rpcData,
    });
  } catch (error: any) {
    return handleApiError(error, request, 'KitchenTicketsPATCH');
  }
}, 'KitchenTicketsPATCH');
