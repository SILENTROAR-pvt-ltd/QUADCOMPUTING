import { cleanCallMessage, recordStaffCall } from '@/lib/services/guest/staff-call.service';

// "I am ready to check out": the guest says so from their room page; the desk prepares the bill, settles and checks
// them out (which clears the request), or dismisses it. Nothing is charged or changed here. The bell on the host
// console rings as for any room request, and the room's card shows it until it is answered.

export interface CheckoutRequest { status: 'pending'; requested_at: string; note: string | null }

/** The pending request as the guest's page and the desk show it, or null. */
export function checkoutRequestView(room: any): CheckoutRequest | null {
  const r = room?.checkout_request;
  return r && typeof r === 'object' && r.status === 'pending'
    ? { status: 'pending', requested_at: String(r.requested_at || ''), note: typeof r.note === 'string' && r.note ? r.note : null }
    : null;
}

export type CheckoutRequestResult =
  | { ok: true; request: CheckoutRequest | null; duplicate?: boolean }
  | { ok: false; code: 'NO_STAY' | 'FAILED'; error: string };

/**
 * The guest asks to check out, or takes the request back. Written only while the stay is the one the guest verified
 * for (the room must still be occupied), so a request can never land on the next guest.
 */
export async function requestRoomCheckout(
  db: any, stay: { room: any; business: { id: string } }, action: 'request' | 'cancel', note?: unknown, now = new Date(),
): Promise<CheckoutRequestResult> {
  const { room, business } = stay;
  const current = checkoutRequestView(room);
  if (action === 'cancel') {
    if (!current) return { ok: true, request: null };
    const { error } = await db.from('rooms').update({ checkout_request: null }).eq('id', room.id).eq('business_id', business.id).eq('status', 'OCCUPIED');
    if (error) return { ok: false, code: 'FAILED', error: 'Could not take the request back. Please try again.' };
    return { ok: true, request: null };
  }
  if (current) return { ok: true, request: current, duplicate: true };

  const request: CheckoutRequest = { status: 'pending', requested_at: now.toISOString(), note: cleanCallMessage(note) || null };
  const { data, error } = await db.from('rooms').update({ checkout_request: request })
    .eq('id', room.id).eq('business_id', business.id).eq('status', 'OCCUPIED').select('id').maybeSingle();
  if (error) return { ok: false, code: 'FAILED', error: 'Could not reach the desk. Please try again.' };
  if (!data) return { ok: false, code: 'NO_STAY', error: 'There is no stay checked in to this room right now.' };

  const message = `Checking out: please prepare the bill for Room ${room.room_number}${request.note ? ` — ${request.note}` : ''}`;
  const call = await recordStaffCall(db, { businessId: business.id, tableNumber: `ROOM ${room.room_number}`, type: 'BILL', message: message.slice(0, 140) });
  if (!call.ok) console.error('[checkout request] the desk could not be notified', call.error);
  return { ok: true, request };
}

/** The desk clears a request without checking the guest out (they changed their mind, or it was answered in person). */
export async function dismissCheckoutRequest(db: any, businessId: string, roomId: string): Promise<boolean> {
  const { error } = await db.from('rooms').update({ checkout_request: null }).eq('id', roomId).eq('business_id', businessId);
  return !error;
}
