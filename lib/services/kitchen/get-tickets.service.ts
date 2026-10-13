import type { KitchenTicket } from '@/lib/utils/kitchen';

let serverTicketCache: { businessId: string; tickets: KitchenTicket[]; expiry: number } | null = null;

export function invalidateKitchenTicketsCache() {
  serverTicketCache = null;
}

export async function fetchKitchenTickets(
  supabase: any,
  businessId: string,
  statusFilter: string | null
): Promise<KitchenTicket[]> {
  const now = Date.now();

  if (serverTicketCache && serverTicketCache.businessId === businessId && now < serverTicketCache.expiry) {
    if (statusFilter && statusFilter !== 'ALL') {
      return serverTicketCache.tickets.filter((t) => t.status === statusFilter);
    }
    return serverTicketCache.tickets;
  }

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

  serverTicketCache = { businessId, tickets, expiry: now + 2000 };

  return tickets;
}
