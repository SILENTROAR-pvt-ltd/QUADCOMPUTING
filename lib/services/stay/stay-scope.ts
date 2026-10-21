// Which of a room's open orders belong to the guest who is in it now. Orders carry the room's id, so after a stay ends
// anything left open (a bill that failed to settle, a dish never closed) still points at the room; the next guest's
// folio, bill and checkout must not pick it up. An order belongs to the stay if it was created once the stay began.

const GRACE_MS = 60_000;

/** When the current stay began. A check-in time in the future (typed ahead at the desk) counts as now. */
export function stayStartMs(room: { check_in_time?: string | null; check_in_date?: string | null }, now = Date.now()): number {
  const start = Date.parse(room.check_in_time || room.check_in_date || '');
  return Number.isNaN(start) ? 0 : Math.min(start, now);
}

export const belongsToStay = (order: { created_at?: string | null }, startMs: number): boolean => {
  const at = Date.parse(order.created_at || '');
  return Number.isNaN(at) ? true : at >= startMs - GRACE_MS;
};

interface Line { id?: string; name?: string; item_name?: string; price?: number | string; qty?: number | string; quantity?: number | string; notes?: string | null }

/**
 * Orders for the same dish at the same price become one bill line with the total quantity, so a bill never shows the
 * same item twice and every line has its own identity.
 */
export function mergeBillLines<T extends Line>(lines: T[]): T[] {
  const byKey = new Map<string, T>();
  for (const l of lines) {
    const qty = Number(l.qty ?? l.quantity ?? 1) || 1;
    const key = [l.id || l.name || l.item_name, Number(l.price) || 0, l.notes || ''].join('|');
    const seen = byKey.get(key);
    if (seen) {
      const total = (Number(seen.qty ?? seen.quantity ?? 1) || 1) + qty;
      byKey.set(key, { ...seen, qty: total, quantity: total });
    } else {
      byKey.set(key, { ...l, qty, quantity: qty });
    }
  }
  return Array.from(byKey.values());
}
