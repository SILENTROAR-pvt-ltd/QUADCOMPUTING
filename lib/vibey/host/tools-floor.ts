// Co-pilot tools for the floor: tables, deliveries and reservations, read through the same services and rules as the
// Tables, Delivery and Reservations tabs. Strictly read-only: the tables read uses the occupancy rule without its
// write-back (the Tables tab repairs stale statuses; the co-pilot never writes).
import { listDeliveryOrders } from '@/lib/services/delivery/delivery-orders.service';
import { listReservations } from '@/lib/services/reservations/reservations.service';
import { CLOSED_STATUSES } from '@/lib/services/session/session-entry.util';
import { deriveTableOccupancy } from '@/lib/services/table/table-occupancy.util';
import { businessDateString } from '@/lib/utils/business-day';
import { count, money, scopeLine } from './format';
import type { ToolArgs } from './schema';
import type { ToolContext, ToolResult } from './tools';

const NO_WRITES = { from: () => ({ update: () => ({ eq: async () => ({ error: null }) }) }) };
const minutesSince = (iso: string | null | undefined, now: number) => (iso ? Math.max(0, Math.round((now - Date.parse(iso)) / 60_000)) : null);

export async function liveTables(ctx: ToolContext): Promise<ToolResult> {
  const [tables, orders] = await Promise.all([
    ctx.admin.from('restaurant_tables').select('id, table_number, status').eq('business_id', ctx.businessId).order('table_number', { ascending: true }),
    ctx.admin.from('orders').select('id, table_number, table_id, grand_total, subtotal, status, created_at').eq('business_id', ctx.businessId)
      .not('status', 'in', `(${CLOSED_STATUSES.map((s) => `"${s}"`).join(',')})`),
  ]);
  if (tables.error) throw tables.error;
  if (orders.error) throw orders.error;
  const opened = new Map((orders.data || []).map((o: any) => [o.id, o.created_at]));
  const derived = deriveTableOccupancy(tables.data || [], orders.data || [], NO_WRITES);
  const now = Date.now();
  const occupied = derived.filter((t: any) => t.status === 'OCCUPIED')
    .map((t: any) => ({ t, mins: minutesSince(opened.get(t.active_order_id) as string, now) }))
    .sort((a, b) => (b.mins ?? -1) - (a.mins ?? -1));
  const by = (s: string) => derived.filter((t: any) => t.status === s).length;
  return { cards: [
    { kind: 'kpis', title: 'Live tables', scope: scopeLine('Now', 'all tables'), link: { tab: 'tables', label: 'Open Live Tables' },
      items: [{ label: 'Occupied', value: occupied.length, format: 'count' }, { label: 'Vacant', value: by('VACANT'), format: 'count' },
        { label: 'Reserved', value: by('RESERVED'), format: 'count' }, { label: 'Cleaning', value: by('CLEANING'), format: 'count' }] },
    { kind: 'rows', title: 'Open longest', scope: scopeLine('Now', 'running bills'), empty: 'No table has a running bill.',
      rows: occupied.slice(0, 8).map(({ t, mins }) => ({ label: `Table ${t.table_number}`, value: money(t.running_subtotal), format: 'money' as const, sub: mins === null ? undefined : `open ${mins} min` })) },
  ], facts: { occupied: occupied.length } };
}

export async function deliveries(ctx: ToolContext): Promise<ToolResult> {
  const rows = await listDeliveryOrders(ctx.admin, ctx.businessId);
  const open = rows.filter((o: any) => !['delivered', 'cancelled'].includes(String(o.delivery_status || '').toLowerCase()));
  return { cards: [{
    kind: 'rows', title: 'Deliveries in progress', scope: scopeLine('Last 24 hours', `${count(open.length)} open of ${count(rows.length)}`), link: { tab: 'delivery', label: 'Open Delivery' },
    rows: open.slice(0, 8).map((o: any) => ({ label: String(o.customer_name || 'Guest'), value: money(o.grand_total), format: 'money' as const, sub: String(o.delivery_status || 'new').replace(/_/g, ' ') })),
    empty: 'No deliveries in progress.',
  }] };
}

export async function reservations(ctx: ToolContext, a: ToolArgs): Promise<ToolResult> {
  const day = businessDateString(a.day === 'tomorrow' ? new Date(Date.now() + 86_400_000) : new Date());
  const list = (await listReservations(ctx.admin, ctx.businessId, 'upcoming')).filter((r) => r.reservedDate === day);
  return { cards: [{
    kind: 'rows', title: a.day === 'tomorrow' ? "Tomorrow's reservations" : "Today's reservations", scope: scopeLine(day, `${list.length} booked`),
    link: { tab: 'reservations', label: 'Open Reservations' },
    rows: list.slice(0, 10).map((r) => ({ label: `${r.reservedTime.slice(0, 5)} · ${r.guestName}`, value: `Party of ${r.partySize}`, format: 'text' as const, sub: [r.tableNumber && `Table ${r.tableNumber}`, r.status].filter(Boolean).join(' · ') })),
    empty: 'No reservations for that day.',
  }] };
}
