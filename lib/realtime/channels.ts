// Realtime channel naming + server-side broadcast helpers.
//
// Broadcast channels are public topics: anyone subscribed to the same name
// receives every message, and a venue's id is in every QR link, so anyone can
// subscribe to any venue's topics. Names are still scoped by venue (or a
// "table 1 settled" event at one cafe reaches table 1 guests at every cafe),
// but the topic is not a secret, so a message must carry NOTHING: it only says
// "something changed at this table", and the guest's phone re-reads its own
// order through its own session (the same read the polling fallback uses).
// Guests are anonymous (RLS gives anon no table access), so they cannot use
// postgres_changes; they get these pings, with polling as the fallback.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

/** Same rules as normalizeTable() in the session services, so host and guest agree. */
export function normalizeChannelTable(table?: string | null): string {
  return (table || '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/^table\s*/i, '')
    .replace(/^t-/i, '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '_');
}

/** Channel a guest at one table listens on. Null when it cannot be scoped safely. */
export function guestTableChannel(businessId?: string | null, table?: string | null): string | null {
  const t = normalizeChannelTable(table);
  if (!isUuid(businessId) || !t) return null;
  return `biz_${businessId.toLowerCase()}_table_${t}`;
}

/** Postgres-changes filter scoping a subscription to one venue (undefined = unscoped). */
export function businessFilter(businessId?: string | null): string | undefined {
  return isUuid(businessId) ? `business_id=eq.${businessId}` : undefined;
}

/**
 * Tells a guest table that something changed, over the Realtime REST endpoint. The message is always empty (see the
 * note at the top: the topic is public, so it may carry no amounts, ids or names); the phone reads the details itself.
 * Awaited, so it completes before a serverless response returns; never throws
 * (realtime pushes are a UI nicety — guests also poll).
 */
export async function broadcastToGuestTable(
  supabase: any,
  businessId: string | null | undefined,
  table: string | null | undefined,
  event: 'table_settled' | 'kot_status_update' | 'order_status_updated',
): Promise<boolean> {
  const topic = guestTableChannel(businessId, table);
  if (!topic || typeof supabase?.channel !== 'function') return false;
  const channel = supabase.channel(topic);
  const payload = {};
  try {
    if (typeof channel.httpSend === 'function') {
      const res = await channel.httpSend(event, payload);
      return Boolean(res?.success);
    }
    const res = await channel.send({ type: 'broadcast', event, payload });
    return res === 'ok';
  } catch (err) {
    console.error(`[realtime] broadcast ${event} to ${topic} failed (non-fatal):`, err);
    return false;
  } finally {
    try { await supabase.removeChannel?.(channel); } catch {}
  }
}
