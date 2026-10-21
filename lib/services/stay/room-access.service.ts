import { timingSafeEqual } from 'crypto';
import { readMenuInfo } from '@/lib/services/menu-info/menu-info';
import { readPolicies } from './stay-policy';

// The in-room page's view of a stay: the room is found by the code on its QR card, the guest proves they belong to it
// with the last four digits of the phone given at check-in, and the page never sees the phone, the ID or the address.
// The bill is in room-folio.service.ts; late check-out in late-checkout-view.ts.

export const ROOM_CODE = /^[A-Za-z0-9_-]{6,80}$/;
// The room, its type and its venue come back in one query: this runs on every load of the guest's page, and each
// separate lookup was another round trip to the database.
const ROOM_SELECT = '*, category:room_categories(id, name, price, occupancy, photos, amenities), business:businesses(id, business_name, name, slug, in_room_dining_enabled, self_checkin_enabled, checkin_time, checkout_time, menu_info, stay_policies, gst_number)';

export interface RoomStay { room: any; business: any }

export async function loadRoomByCode(db: any, code: string): Promise<RoomStay | null> {
  if (!ROOM_CODE.test(code)) return null;
  const { data, error } = await db.from('rooms').select(ROOM_SELECT).eq('qr_code_hash', code).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { business, ...room } = data;
  return business ? { room, business } : null;
}

/** The last four digits the guest typed against the phone on the room, compared in constant time. */
export function phoneMatches(room: { guest_phone?: string | null }, last4: unknown): boolean {
  const digits = String(room.guest_phone || '').replace(/\D/g, '');
  const given = String(last4 || '').replace(/\D/g, '');
  if (digits.length < 4 || given.length !== 4) return false;
  return timingSafeEqual(Buffer.from(digits.slice(-4)), Buffer.from(given));
}

export const stayStartedAt = (room: any): string | null => room.check_in_time || room.check_in_date || null;
export const isOccupied = (room: any) => String(room.status || '').toUpperCase() === 'OCCUPIED';

/**
 * What the in-room page may know: never the phone, the ID or the address; and nothing about the stay itself (name,
 * dates, party size) until this browser has proved it belongs to the guest, so a scanned card on a vacant room shows
 * only the room.
 */
export function publicRoom(room: any, verified = false) {
  const firstName = typeof room.guest_name === 'string' ? room.guest_name.trim().split(/\s+/)[0] : null;
  const stay = verified && isOccupied(room);
  return {
    id: room.id,
    room_number: room.room_number,
    status: room.status,
    guest_first_name: stay ? firstName || null : null,
    check_in_time: stay ? room.check_in_time || room.check_in_date || null : null,
    check_out_time: stay ? room.check_out_time || room.check_out_date || null : null,
    total_guests: stay ? room.total_guests || 1 : 1,
    category: room.category ? { name: room.category.name, price: Number(room.category.price) || 0, amenities: room.category.amenities || [], photos: room.category.photos || [] } : null,
  };
}

/** A phone from the menu information as digits (with its country code, if one was typed), or null when it is not a full number. */
const menuPhone = (raw: unknown) => { const d = String(raw || '').replace(/\D/g, ''); return d.length >= 10 && d.length <= 15 ? d : null; };

export function publicBusiness(business: any) {
  const info = readMenuInfo(business.menu_info);
  const desk = readPolicies(business.stay_policies).front_desk;
  return {
    id: business.id,
    name: business.business_name || business.name || 'Venue',
    slug: business.slug || null,
    in_room_dining_enabled: business.in_room_dining_enabled !== false,
    self_checkin_enabled: Boolean(business.self_checkin_enabled),
    checkout_time: business.checkout_time || null,
    // What the venue prints on every tax invoice, so the guest's copy of the room bill carries the same header.
    gstin: business.gst_number ? String(business.gst_number).toUpperCase() : null,
    address: info.address || null,
    // How the room reaches the desk: the owner's number and mode, or failing that the first phone on the menu, by a call.
    front_desk: desk.phone ? desk : { phone: menuPhone(info.phones?.[0]), mode: 'call' as const },
  };
}
