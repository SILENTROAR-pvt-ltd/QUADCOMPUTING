import type { CheckInFields } from './room-guest-fields.util';
import { buildStayFolio, stayNights, type StayAddon } from './stay-folio.util';

interface RoomRow { id: string; room_number: string; category?: { name?: string | null; price?: number | string | null } | null }

/**
 * Opens the stay's folio: the room-stay order (tariff and add-ons for the booked nights) and a stay
 * log entry. Only an 'active' folio of this room is reused; a previous guest's invoice waiting for
 * payment ('ready_for_settlement') is never overwritten.
 */
export async function openStayFolio(supabase: any, businessId: string, room: RoomRow, f: CheckInFields): Promise<number> {
  const nights = stayNights(f.check_in_time, f.check_out_time);
  const folio = buildStayFolio({
    roomId: room.id,
    roomNumber: room.room_number,
    categoryName: room.category?.name,
    rate: Number(room.category?.price) || 0,
    nights,
    addons: f.selected_addons as StayAddon[],
  });

  const order = {
    customer_name: f.guest_name,
    customer_phone: f.guest_phone || '',
    table_number: `ROOM ${room.room_number}`,
    items: folio.lines,
    subtotal: folio.total,
    grand_total: folio.total,
    total_amount: folio.total,
    status: 'active',
  };

  const { data: existing } = await supabase
    .from('orders').select('id')
    .eq('room_id', room.id).eq('business_id', businessId).eq('order_type', 'room_stay').eq('status', 'active')
    .order('created_at', { ascending: false }).limit(1).maybeSingle();

  const write = existing
    ? supabase.from('orders').update(order).eq('id', existing.id).eq('business_id', businessId)
    : supabase.from('orders').insert({
      ...order, business_id: businessId, room_id: room.id, order_type: 'room_stay', order_source: 'POS', created_at: f.check_in_time,
    });
  const { error: orderErr } = await write;
  if (orderErr) throw orderErr;

  const { error: logErr } = await supabase.from('room_stay_logs').insert({
    business_id: businessId,
    room_id: room.id,
    guest_name: f.guest_name,
    guest_phone: f.guest_phone || '',
    id_type: f.id_type,
    id_number: f.id_number,
    guest_email: f.guest_email,
    guest_address: f.guest_address,
    guest_id_proof: f.guest_id_proof,
    check_in_time: f.check_in_time,
    check_out_time: null,
    total_guests: f.total_guests,
    purpose_of_visit: f.purpose_of_visit,
    is_celebration: f.is_celebration,
    celebration_type: f.celebration_type,
    celebration_note: f.celebration_note,
    selected_addons: f.selected_addons,
    total_billed_amount: folio.total,
  });
  if (logErr) console.error('[check-in] stay log insert failed', logErr.message);
  return folio.total;
}
