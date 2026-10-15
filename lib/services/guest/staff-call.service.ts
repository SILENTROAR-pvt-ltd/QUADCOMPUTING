// A guest calling the waiter or chef, or sending staff a short message ("a glass of water, please").

export const CALL_TYPES = ['WAITER', 'CHEF', 'BILL', 'SERVICE'] as const;
export type CallType = (typeof CALL_TYPES)[number];
export const MESSAGE_MAX = 140;
/** The same request from the same table inside this window is one request, so a nervous double tap rings the bell once. */
export const DUPLICATE_WINDOW_MS = 30_000;

/** Plain text only, short; it is shown to staff, never rendered as HTML. */
export function cleanCallMessage(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  return raw.replace(/[<>]/g, '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MESSAGE_MAX) || null;
}

export function parseCallType(raw: unknown): CallType | null {
  const t = String(raw || '').toUpperCase();
  return (CALL_TYPES as readonly string[]).includes(t) ? (t as CallType) : null;
}

export async function recordStaffCall(
  db: any,
  c: { businessId: string; tableNumber?: string | null; type: CallType; message: string | null },
  now = Date.now(),
): Promise<{ ok: true; duplicate: boolean; notification: any } | { ok: false; error: string }> {
  const since = new Date(now - DUPLICATE_WINDOW_MS).toISOString();
  let dup = db.from('staff_notifications').select('id, table_number, notification_type, message, status, created_at')
    .eq('business_id', c.businessId).eq('notification_type', c.type)
    .eq('status', 'PENDING').gte('created_at', since);
  dup = c.tableNumber ? dup.eq('table_number', c.tableNumber) : dup.is('table_number', null);
  dup = c.message === null ? dup.is('message', null) : dup.eq('message', c.message);
  const { data: existing } = await dup.limit(1).maybeSingle();
  if (existing) return { ok: true, duplicate: true, notification: existing };

  const { data, error } = await db.from('staff_notifications').insert({
    business_id: c.businessId, table_number: c.tableNumber ?? null, notification_type: c.type, message: c.message,
    status: 'PENDING', created_at: new Date(now).toISOString(),
  }).select().maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, duplicate: false, notification: data };
}
