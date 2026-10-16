import type { CartItem } from '@/lib/store/cart.store';

export type DeliveryPaymentChoice = 'cod' | 'upi';

export interface DeliveryDetails {
  address: string;
  phone: string;
  lat: number;
  lng: number;
  payment: DeliveryPaymentChoice;
}

export interface ActiveDelivery {
  orderId: string;
  payment: 'cod' | 'upi_advance';
  total: number;
  placedAt: number;
}

export interface DeliveryTerms {
  enabled: boolean;
  radius_km: number;
  min_order: number;
  fee: number;
  upi_id: string | null;
  business_name: string;
}

/** The order body for /api/guest/order: the same dishes and notes as a table order, plus the delivery details. */
export function buildDeliveryBody(args: {
  cafeId: string; items: CartItem[]; guestName: string; handle?: string; tableNote?: string; details: DeliveryDetails; attemptKey: string;
}) {
  const { cafeId, items, guestName, handle, tableNote, details, attemptKey } = args;
  return {
    order_type: 'delivery',
    business_id: cafeId,
    cafe_id: cafeId,
    guest_name: guestName.trim() || 'Guest',
    guest_phone: details.phone,
    guest_handle: handle || undefined,
    table_note: tableNote?.trim() || undefined,
    delivery: {
      address: details.address, phone: details.phone, lat: details.lat, lng: details.lng,
      payment: details.payment,
    },
    idempotency_key: attemptKey,
    items: items.map((c) => ({
      id: c.item_id, item_id: c.item_id, name: c.name, price: c.total_item_price, quantity: c.quantity,
      notes: [(c.selected_addons || []).map((a) => `${a.name} (+₹${a.price})`).join(', '), c.notes].filter(Boolean).join(' | ') || undefined,
    })),
  };
}

/** Sends the delivery order. Resolves with the server's reply, or with the message to show the guest. */
export async function sendDeliveryOrder(body: unknown): Promise<{ ok: true; orderId: string; grandTotal: number; payment: 'cod' | 'upi_advance' } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/guest/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) return { ok: false, error: data.error || 'Could not place the delivery order. Please try again.' };
    const payment = (body as any)?.delivery?.payment === 'upi' ? 'upi_advance' : 'cod';
    return { ok: true, orderId: data.order_id, grandTotal: Number(data.grand_total) || 0, payment };
  } catch {
    return { ok: false, error: 'Network error. Check your connection and try again.' };
  }
}

const storageKey = (cafeId: string) => `quad_delivery_order:${cafeId}`;

/** The delivery this device placed, so the menu can show its progress. Browser storage only, and a failure is ignored. */
export function readActiveDelivery(cafeId: string): ActiveDelivery | null {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey(cafeId)) : null;
    return raw ? (JSON.parse(raw) as ActiveDelivery) : null;
  } catch {
    return null;
  }
}

export function rememberActiveDelivery(cafeId: string, delivery: ActiveDelivery): void {
  try { window.localStorage.setItem(storageKey(cafeId), JSON.stringify(delivery)); } catch {}
}

export function forgetActiveDelivery(cafeId: string): void {
  try { window.localStorage.removeItem(storageKey(cafeId)); } catch {}
}
