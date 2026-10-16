import type { KitchenTicket } from '@/lib/utils/kitchen';

// One entry per venue. This used to be a single slot, so with two venues reading in turn each one evicted the other and
// the cache never hit; with 20-40 venues on one server it did nothing at all.
const TICKET_TTL_MS = 2000;
const TICKET_CACHE_MAX = 300;
const ticketCache = new Map<string, { tickets: KitchenTicket[]; expiry: number }>();
// While one venue's read is in progress every other read for that venue joins it (a push to four terminals is four reads).
const ticketReads = new Map<string, Promise<KitchenTicket[]>>();

/** Forget one venue's tickets (a write for that venue), or every venue's when none is named. */
export function invalidateKitchenTicketsCache(businessId?: string) {
  if (businessId) { ticketCache.delete(businessId); ticketReads.delete(businessId); } else { ticketCache.clear(); ticketReads.clear(); }
}

export async function fetchKitchenTickets(
  supabase: any,
  businessId: string,
  statusFilter: string | null
): Promise<KitchenTicket[]> {
  const now = Date.now();
  const only = (all: KitchenTicket[]) => (statusFilter && statusFilter !== 'ALL' ? all.filter((t) => t.status === statusFilter) : all);

  // The cancelled list is rare and not what a board shows: it is read directly, never shared.
  if (statusFilter === 'CANCELLED') return loadAllTickets(supabase, businessId, statusFilter);

  const cached = ticketCache.get(businessId);
  if (cached && now < cached.expiry) return only(cached.tickets);

  // The shared read always loads every non-cancelled ticket; the status filter is applied per caller.
  const running = ticketReads.get(businessId);
  if (running) return only(await running);

  const read = loadAllTickets(supabase, businessId, null).then((tickets) => {
    if (ticketCache.size >= TICKET_CACHE_MAX) ticketCache.delete(ticketCache.keys().next().value as string);
    ticketCache.set(businessId, { tickets, expiry: Date.now() + TICKET_TTL_MS });
    return tickets;
  }).finally(() => { ticketReads.delete(businessId); });
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
