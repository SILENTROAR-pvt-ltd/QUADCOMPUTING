import { timingSafeEqual } from 'crypto';
import { buildStayFolio, CLOSED_ORDER_STATUSES, stayNights } from '@/lib/services/accommodation/stay-folio.util';

// The in-room page's view of a stay: the room is found by the code on its QR card, the guest proves they belong to it
// with the last four digits of the phone given at check-in, and the page never sees the phone, the ID or the address.

export const ROOM_CODE = /^[A-Za-z0-9_-]{6,80}$/;
const ROOM_SELECT = '*, category:room_categories(id, name, price, occupancy, photos, amenities)';
const BUSINESS_SELECT = 'id, business_name, name, slug, in_room_dining_enabled, checkin_time, checkout_time, menu_info';

export interface RoomStay { room: any; business: any }

export async function loadRoomByCode(db: any, code: string): Promise<RoomStay | null> {
  if (!ROOM_CODE.test(code)) return null;
  const { data: room, error } = await db.from('rooms').select(ROOM_SELECT).eq('qr_code_hash', code).maybeSingle();
  if (error) throw error;
  if (!room) return null;
  const { data: business, error: bizErr } = await db.from('businesses').select(BUSINESS_SELECT).eq('id', room.business_id).maybeSingle();
  if (bizErr) throw bizErr;
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

/** What the in-room page may know about the stay: never the phone, the ID or the address. */
export function publicRoom(room: any) {
  const firstName = typeof room.guest_name === 'string' ? room.guest_name.trim().split(/\s+/)[0] : null;
  return {
    id: room.id,
    room_number: room.room_number,
    status: room.status,
    guest_first_name: firstName || null,
    check_in_time: room.check_in_time || room.check_in_date || null,
    check_out_time: room.check_out_time || room.check_out_date || null,
    total_guests: room.total_guests || 1,
    category: room.category ? { name: room.category.name, price: Number(room.category.price) || 0, amenities: room.category.amenities || [], photos: room.category.photos || [] } : null,
  };
}

export function publicBusiness(business: any) {
  return {
    id: business.id,
    name: business.business_name || business.name || 'Venue',
    slug: business.slug || null,
    in_room_dining_enabled: business.in_room_dining_enabled !== false,
    checkout_time: business.checkout_time || null,
  };
}

/** The stay's running bill: nights so far at the quoted tariff, add-ons, and every unpaid in-room order. */
export async function roomFolio(db: any, businessId: string, room: any) {
  const { data: orders, error } = await db.from('orders').select('id, created_at, status, grand_total, items, order_type, table_number')
    .eq('room_id', room.id).eq('business_id', businessId).not('status', 'in', CLOSED_ORDER_STATUSES).order('created_at', { ascending: false });
  if (error) throw error;
  const dining = (orders || []).filter((o: any) => o.order_type !== 'room_stay');
  const nights = stayNights(stayStartedAt(room), new Date());
  const folio = buildStayFolio({
    roomId: room.id, roomNumber: room.room_number, categoryName: room.category?.name,
    rate: Number(room.category?.price) || 0, nights, addons: Array.isArray(room.selected_addons) ? room.selected_addons : [],
  });
  const diningTotal = dining.reduce((s: number, o: any) => s + (Number(o.grand_total) || 0), 0);
  return {
    nights,
    tariff_total: folio.tariffTotal,
    addons_total: folio.addonsTotal,
    dining_total: diningTotal,
    total: folio.total + diningTotal,
    lines: folio.lines,
    orders: dining.map((o: any) => ({
      id: o.id, created_at: o.created_at, status: o.status, grand_total: Number(o.grand_total) || 0,
      items: (Array.isArray(o.items) ? o.items : []).map((it: any) => ({ name: it.name || it.item_name, qty: Number(it.qty ?? it.quantity ?? 1), price: Number(it.price) || 0 })),
    })),
  };
}
