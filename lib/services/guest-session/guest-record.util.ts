import { isValidUuid } from './session-utils';

export async function upsertGuestRecord(
  supabase: any,
  activeSessionId?: string | null,
  guestSessionId?: string,
  guestName?: string,
  avatar?: string,
  resolvedTableId?: string | null,
  tableNumber?: string
) {
  let guestRecord: any = null;
  if (guestSessionId && isValidUuid(activeSessionId)) {
    try {
      const { data: gsData } = await supabase.from('guest_sessions').upsert({
        session_id: guestSessionId, dine_in_session_id: activeSessionId, guest_name: guestName || 'Guest',
        avatar: avatar || '☕', status: 'active', last_active_at: new Date().toISOString(),
      }, { onConflict: 'session_id' }).select().maybeSingle();
      if (gsData) guestRecord = gsData;
    } catch {}
  }
  return guestRecord || { session_id: guestSessionId, table_id: resolvedTableId, table_number: tableNumber, guest_name: guestName || 'Guest', avatar: avatar || '☕', status: 'active' };
}
