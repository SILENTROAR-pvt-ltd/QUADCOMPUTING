import { cleanCallMessage, recordStaffCall } from '@/lib/services/guest/staff-call.service';

// The guest's one request to the desk about leaving or paying: "I am ready to check out" (the desk prepares the bill,
// settles and checks them out) or "I want to pay my bill now" (the desk takes the money; the stay goes on). Nothing is
// charged or changed here. The host console rings as for any room request, and the room's card shows it until answered.

export type RequestKind = 'checkout' | 'bill';
export interface CheckoutRequest { kind: RequestKind; status: 'pending'; requested_at: string; note: string | null }

/** The pending request as the guest's page and the desk show it, or null. Rows written before `kind` are check-outs. */
export function checkoutRequestView(room: any): CheckoutRequest | null {
  const r = room?.checkout_request;
  return r && typeof r === 'object' && r.status === 'pending'
    ? { kind: r.kind === 'bill' ? 'bill' : 'checkout', status: 'pending', requested_at: String(r.requested_at || ''), note: typeof r.note === 'string' && r.note ? r.note : null }
    : null;
}

export type CheckoutRequestResult =
  | { ok: true; request: CheckoutRequest | null; duplicate?: boolean }
  | { ok: false; code: 'NO_STAY' | 'FAILED'; error: string };

const MESSAGE: Record<RequestKind, (room: string, note: string | null) => string> = {
  checkout: (room, note) => `Checking out: please prepare the bill for Room ${room}${note ? ` — ${note}` : ''}`,
  bill: (room, note) => `Room ${room} wants to pay the running bill now${note ? ` — ${note}` : ''}`,
};

/**
 * The guest asks (or takes the request back). Written only while the stay is the one the guest verified for (the room
 * must still be occupied), so a request can never land on the next guest. A new kind replaces a pending one.
 */
export async function requestRoomCheckout(
  db: any, stay: { room: any; business: { id: string } }, action: 'request' | 'cancel', note?: unknown, now = new Date(), kind: RequestKind = 'checkout',
): Promise<CheckoutRequestResult> {
  const { room, business } = stay;
  const current = checkoutRequestView(room);
  if (action === 'cancel') {
    if (!current) return { ok: true, request: null };
    const { error } = await db.from('rooms').update({ checkout_request: null }).eq('id', room.id).eq('business_id', business.id).eq('status', 'OCCUPIED');
    if (error) return { ok: false, code: 'FAILED', error: 'Could not take the request back. Please try again.' };
    return { ok: true, request: null };
  }
  if (current && current.kind === kind) return { ok: true, request: current, duplicate: true };

  const request: CheckoutRequest = { kind, status: 'pending', requested_at: now.toISOString(), note: cleanCallMessage(note) || null };
  const { data, error } = await db.from('rooms').update({ checkout_request: request })
    .eq('id', room.id).eq('business_id', business.id).eq('status', 'OCCUPIED').select('id').maybeSingle();
  if (error) return { ok: false, code: 'FAILED', error: 'Could not reach the desk. Please try again.' };
  if (!data) return { ok: false, code: 'NO_STAY', error: 'There is no stay checked in to this room right now.' };

  const call = await recordStaffCall(db, { businessId: business.id, tableNumber: `ROOM ${room.room_number}`, type: 'BILL', message: MESSAGE[kind](room.room_number, request.note).slice(0, 140) });
  if (!call.ok) console.error('[checkout request] the desk could not be notified', call.error);
  return { ok: true, request };
}

/** The desk clears a request without acting on it (answered in person, or the guest changed their mind). */
export async function dismissCheckoutRequest(db: any, businessId: string, roomId: string): Promise<boolean> {
  const { error } = await db.from('rooms').update({ checkout_request: null }).eq('id', roomId).eq('business_id', businessId);
  return !error;
}
