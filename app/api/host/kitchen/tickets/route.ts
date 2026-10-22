import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import {
  fetchKitchenTickets,
  createKitchenTicketRecord,
} from '@/lib/services/kitchen.service';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { broadcastToGuestTable } from '@/lib/realtime/channels';
import { kotStatusRefusal } from '@/lib/services/kitchen/kot-status-roles';
import { afterResponse } from '@/lib/utils/after-response';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Pushes the new KOT status to the guests at this ticket's table (venue-scoped).
async function notifyGuestTable(db: any, businessId: string, ticket: any, status: string) {
  // Re-sending the current status (e.g. alongside an items update) is not pushed.
  if (!ticket?.table_or_room || String(ticket.status || '').toUpperCase() === status) return;
  // An empty ping: the topic is public, so the phone reads the ticket's status itself.
  await broadcastToGuestTable(db, businessId, ticket.table_or_room, 'kot_status_update');
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
    const { id, status, items } = body;

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

    // The kitchen hands an order over at Ready; Served is the waiter's step, from Live Tables.
    const refusal = kotStatusRefusal(auth.staff?.role, status);
    if (refusal) return NextResponse.json({ error: refusal }, { status: 403 });

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

    // The linked order must belong to this venue: a ticket only ever changes its own venue's order.
    if (ticketRecord.order_id) {
      const { data: linkedOrder, error: orderErr } = await adminDb()
        .from('orders').select('id').eq('id', ticketRecord.order_id).eq('business_id', businessId).maybeSingle();
      if (orderErr) return handleApiError(orderErr, request, 'KitchenTicketsOrderCheck');
      if (!linkedOrder) return NextResponse.json({ error: 'The order on this ticket does not belong to this venue' }, { status: 409 });
    }

    // Execute atomic update_kot_status RPC    // The audit actor is the signed-in person; the request body never names one.
    const actor: string | null = user?.id ?? null;
    const staffId = actor && actor.startsWith('staff:') ? actor.slice(6) : actor;
    const auditStaffId = staffId && UUID_REGEX.test(staffId) ? staffId : null;
    let rpcData: any = null;
    let rpcError: any = null;

    try {
      const res = await adminDb().rpc('update_kot_status', {
        p_ticket_id: id,
        p_new_status: status,
        p_staff_id: auditStaffId,
      });
      rpcData = res.data;
      rpcError = res.error;
    } catch (err: any) {
      rpcError = err;
    }

    // The state machine refused the change, or the RPC failed. Return its reason. Never write the status directly.
    if (rpcError) {
      return NextResponse.json({ error: rpcError.message || 'Failed to update KOT status' }, { status: 400 });
    }

    // The guest's table also hears this from the database's own table ping (20261016000006), so this extra push goes out
    // after the answer: the chef's and waiter's tap is confirmed without waiting for it.
    const pushedStatus = String(rpcData?.ticket?.status || status).toUpperCase();
    afterResponse('kot-guest-push', () => notifyGuestTable(db, businessId, ticketRecord, pushedStatus));
    return NextResponse.json({
      success: true,
      ticket: rpcData?.ticket || { id, status },
      ...rpcData,
    });
  } catch (error: any) {
    return handleApiError(error, request, 'KitchenTicketsPATCH');
  }
}, 'KitchenTicketsPATCH');
