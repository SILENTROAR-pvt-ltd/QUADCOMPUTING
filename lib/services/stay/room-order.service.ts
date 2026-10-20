import { placeGuestOrder } from '@/lib/services/guest-order.service';

// An in-room order goes through the same verified-price, atomic order path as a table order, under a label of its
// own ("RS 101": room service for room 101). The label is deliberately not the stay folio's "ROOM 101", or the
// dishes would be appended to the tariff bill; the order is then tied to the room by id, which is what checkout and
// the front desk read. Charge to room: nothing is paid now.

export const roomDiningLabel = (roomNumber: string) => `RS ${String(roomNumber).trim()}`.replace(/[^A-Za-z0-9 -]/g, '').slice(0, 12);
export const roomDiningNote = (roomNumber: string) => `[IN-ROOM DINING - ROOM ${String(roomNumber).trim()}]`;

export interface RoomOrderInput {
  business: { id: string };
  room: { id: string; room_number: string; guest_name?: string | null; guest_phone?: string | null };
  items: Array<{ item_id?: string; id?: string; quantity?: number; qty?: number; notes?: string | null }>;
  note?: string | null;
  idempotencyKey?: string | null;
}

export async function placeRoomOrder(db: any, o: RoomOrderInput) {
  const note = [roomDiningNote(o.room.room_number), typeof o.note === 'string' ? o.note.replace(/[<>]/g, '').trim() : '']
    .filter(Boolean).join(' · ').slice(0, 200);
  const body = {
    business_id: o.business.id,
    cafe_id: o.business.id,
    table_number: roomDiningLabel(o.room.room_number),
    items: o.items,
    idempotency_key: o.idempotencyKey || null,
    guest_name: o.room.guest_name || `Room ${o.room.room_number}`,
    guest_phone: o.room.guest_phone || null,
    table_note: note,
  };
  const result = await placeGuestOrder(body, db);

  const orderId = result?.order_id;
  if (orderId) {
    const { error } = await db.from('orders').update({ room_id: o.room.id, order_type: 'room_service', order_source: 'ROOM_QR' })
      .eq('id', orderId).eq('business_id', o.business.id);
    if (error) console.error('[room order] could not tie the order to the room', error);
    const { error: ticketErr } = await db.from('kitchen_tickets').update({ room_id: o.room.id }).eq('order_id', orderId).eq('business_id', o.business.id);
    if (ticketErr) console.error('[room order] could not tie the ticket to the room', ticketErr);
  }
  return result;
}
