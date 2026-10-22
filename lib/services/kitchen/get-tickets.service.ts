import type { KitchenTicket } from '@/lib/utils/kitchen';

// Terminals read the tickets the moment the venue's push says something changed, and once only. A read answered from a
// cache made before that change (this used to keep each venue's list for 2 s) left the old state on screen until the next
// safety read: a ticket marked ready flipped back to "preparing", a new order or add-on showed up late. So nothing is
// kept between reads. Reads that arrive at the same moment (a push to four terminals) still share one database read.
const ticketReads = new Map<string, Promise<KitchenTicket[]>>();

/** A write for this venue: the next read starts fresh instead of joining one that began before the write. */
export function invalidateKitchenTicketsCache(businessId?: string) {
  if (businessId) ticketReads.delete(businessId); else ticketReads.clear();
}

export async function fetchKitchenTickets(
  supabase: any,
  businessId: string,
  statusFilter: string | null
): Promise<KitchenTicket[]> {
  const only = (all: KitchenTicket[]) => (statusFilter && statusFilter !== 'ALL' ? all.filter((t) => t.status === statusFilter) : all);

  // The cancelled list is rare and not what a board shows: it is read directly, never shared.
  if (statusFilter === 'CANCELLED') return loadAllTickets(supabase, businessId, statusFilter);

  // The shared read always loads every non-cancelled ticket; the status filter is applied per caller.
  const running = ticketReads.get(businessId);
  if (running) return only(await running);

  const read = loadAllTickets(supabase, businessId, null).finally(() => {
    if (ticketReads.get(businessId) === read) ticketReads.delete(businessId);
  });
  ticketReads.set(businessId, read);
  return only(await read);
}

async function loadAllTickets(supabase: any, businessId: string, statusFilter: string | null): Promise<KitchenTicket[]> {
  let query = supabase
    .from('kitchen_tickets')
    .select('*')
    .eq('business_id', businessId);

  if (statusFilter && statusFilter !== 'ALL') {
    query = query.eq('status', statusFilter);
  } else {
    query = query.neq('status', 'CANCELLED');
  }

  query = query.order('created_at', { ascending: false }).limit(100);

  const { data, error } = await query;
  if (error) {
    console.warn('[KOT fetch warning]:', error.message);
  }

  const tickets: KitchenTicket[] = (data || []).map((t: any) => ({
    id: t.id,
    ticket_number: t.ticket_number,
    table_or_room: t.table_or_room || 'Counter / Takeaway',
    room_id: t.room_id,
    order_id: t.order_id,
    items: Array.isArray(t.items) ? t.items : [],
    notes: t.notes || null,
    status: t.status,
    station: t.station || 'Kitchen',
    created_at: t.created_at,
    updated_at: t.updated_at,
    // When each stage happened (written by update_kot_status), for the board's timeline.
    status_history: Array.isArray(t.status_history) ? t.status_history : [],
  }));

  return tickets;
}
