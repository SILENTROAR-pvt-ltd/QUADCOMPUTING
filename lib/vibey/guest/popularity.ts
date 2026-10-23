// What guests at this venue actually order: quantities per dish over the last 30 days, from the venue's own order lines.
// Read at most once per venue every 10 minutes per server; a failed read gives an empty picture (Vibey then leans on the
// host's top picks), never an error. Only counts leave this file: no guest, table or bill.
const TTL_MS = 10 * 60 * 1000;
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; data: Record<string, number> }>();

export async function loadPopularity(db: any, businessId: string, now = Date.now()): Promise<Record<string, number>> {
  const hit = cache.get(businessId);
  if (hit && now - hit.at < TTL_MS) return hit.data;
  const data: Record<string, number> = {};
  try {
    const { data: rows, error } = await db.from('order_items').select('item_id, quantity, status')
      .eq('business_id', businessId).gte('created_at', new Date(now - WINDOW_MS).toISOString()).limit(5000);
    if (error) throw error;
    for (const r of rows || []) {
      if (!r?.item_id || /cancel/i.test(String(r.status || ''))) continue;
      data[r.item_id] = (data[r.item_id] ?? 0) + (Number(r.quantity) || 1);
    }
  } catch {
    return hit?.data ?? {};
  }
  cache.set(businessId, { at: now, data });
  return data;
}

/** The venue's local hour (venues are in India), for breakfast in the morning and lighter picks late at night. */
export function venueHour(now = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Kolkata' }).format(now));
}
