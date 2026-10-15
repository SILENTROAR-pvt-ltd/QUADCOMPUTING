import { addKitchenTicket } from '@/lib/store/active-order-store';
import { enabledStations, resolveItemStation, type KitchenStation } from './item-station';

/** The ticket number for each station: the base number, with a station letter when there is more than one. */
export function stationTicketNumber(base: string, station: KitchenStation, stationCount: number): string {
  return stationCount > 1 ? `${base}-${station.charAt(0)}` : base;
}

/**
 * Creates the kitchen tickets for a host-entered order: one ticket per station, written in one statement.
 * The first ticket is returned as `ticket` for callers that expect a single record.
 */
export async function createKitchenTicketRecord(
  supabase: any,
  businessId: string,
  body: any,
  stationsRaw?: unknown
) {
  const { items, tableOrRoom, orderId, roomId } = body;
  if (!items || !items.length) throw new Error('No items provided');

  const validItems = items.filter((item: any) => item.name && item.qty);
  if (validItems.length === 0) return { success: true, message: 'No kitchen items to dispatch.' };

  const enabled = enabledStations(stationsRaw);
  const byStation = new Map<KitchenStation, any[]>();
  for (const item of validItems) {
    const station = resolveItemStation({ station: item.station, category: item.category, name: item.name }, enabled);
    const { station: _st, ...rest } = item;
    // `added_by` marks a dish keyed in by staff, so the host bell stays quiet for it and only the kitchen board rings.
    byStation.set(station, [...(byStation.get(station) ?? []), { ...rest, added_by: 'staff' }]);
  }

  const ticketBase = `KOT-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();
  const rows = Array.from(byStation.entries()).map(([station, stationItems]) => ({
    business_id: businessId,
    order_id: orderId || null,
    room_id: roomId || null,
    ticket_number: stationTicketNumber(ticketBase, station, byStation.size),
    table_or_room: tableOrRoom || 'Counter / Takeaway',
    items: stationItems,
    station,
    status: 'PENDING',
    created_at: now,
    updated_at: now,
  }));

  const { data: tickets, error } = await supabase.from('kitchen_tickets').insert(rows).select();
  if (error) throw error;
  const saved = Array.isArray(tickets) ? tickets : [];
  saved.forEach((t: any) => addKitchenTicket(t as any));
  return { ticket: saved[0] ?? null, tickets: saved };
}
