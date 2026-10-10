import { normalizeTable } from '../session/session-entry.util';

/**
 * A table is occupied while it has a live order in the database, and nothing else. A stored
 * OCCUPIED with no live order is left over from a bill that was settled or cleared, so it reads
 * as vacant (and is written back as vacant). RESERVED and CLEANING are set by staff and kept.
 */
export function deriveTableOccupancy(tables: any[], liveOrders: any[], supabase: any) {
  const orderByTable = new Map<string, any>();
  for (const ord of liveOrders) {
    const norm = normalizeTable(ord.table_number);
    if (norm && !orderByTable.has(norm)) orderByTable.set(norm, ord);
    if (ord.table_id && !orderByTable.has(ord.table_id)) orderByTable.set(ord.table_id, ord);
  }

  return (tables || []).map((t: any) => {
    const norm = normalizeTable(t.table_number);
    const live = orderByTable.get(norm) || orderByTable.get(t.id) || null;
    const stored = String(t.status || 'VACANT').toUpperCase();
    const held = stored === 'RESERVED' || stored === 'CLEANING';
    const derived = live ? 'OCCUPIED' : held ? stored : 'VACANT';

    if (derived !== t.status && (live || stored === 'OCCUPIED')) {
      Promise.resolve(supabase.from('restaurant_tables').update({ status: derived }).eq('id', t.id)).catch(() => {});
    }

    return {
      ...t,
      status: derived,
      running_subtotal: live ? Number(live.subtotal) || Number(live.grand_total) || 0 : 0,
      active_order_id: live?.id || null,
    };
  });
}
