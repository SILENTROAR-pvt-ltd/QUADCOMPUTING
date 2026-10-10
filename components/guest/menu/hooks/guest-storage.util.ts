/**
 * Table-isolated Guest Local Storage Utilities
 * Ensures customer and guest session UUIDs never leak across different tables
 */

export function getScopedGuestUuid(cafeId?: string, tableNumber?: string): string {
  if (typeof window === 'undefined') return 'gst_ssr_guest';
  const normT = (tableNumber || 'default').replace(/^(table|t-)\s*/i, '').trim().toUpperCase();
  const normC = (cafeId || 'default').trim().toLowerCase();
  const storageKey = `quad_guest_uuid_${normC}_${normT}`;

  let guestUuid = localStorage.getItem(storageKey);
  if (!guestUuid) {
    guestUuid = `gst_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    localStorage.setItem(storageKey, guestUuid);
  }
  return guestUuid;
}

export function getStoredGuestProfile() {
  if (typeof window === 'undefined') {
    return { customerId: null, guestName: 'Guest', guestPhone: '' };
  }
  const customerId = localStorage.getItem('quad_customer_id');
  const guestName = localStorage.getItem('quad_guest_name') || 'Guest';
  const guestPhone = localStorage.getItem('quad_guest_phone') || '';
  return { customerId, guestName, guestPhone };
}

export function clearScopedGuestSession(cafeId?: string, tableNumber?: string) {
  if (typeof window === 'undefined') return;
  const normT = (tableNumber || 'default').replace(/^(table|t-)\s*/i, '').trim().toUpperCase();
  const normC = (cafeId || 'default').trim().toLowerCase();
  localStorage.removeItem(`quad_guest_uuid_${normC}_${normT}`);
}

// The order this device took part in at this table. The server only reveals a
// settled bill (amount, cashback) to a device that can name that order id —
// otherwise anyone scanning the table QR within two hours saw the previous
// party's bill and cashback.
const knownOrderKey = (cafeId?: string, tableNumber?: string) => {
  const normT = (tableNumber || 'default').replace(/^(table|t-)\s*/i, '').trim().toUpperCase();
  const normC = (cafeId || 'default').trim().toLowerCase();
  return `quad_known_order_${normC}_${normT}`;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function rememberKnownOrder(cafeId: string | undefined, tableNumber: string | undefined, orderId: unknown) {
  if (typeof window === 'undefined' || typeof orderId !== 'string' || !UUID_RE.test(orderId)) return;
  try { localStorage.setItem(knownOrderKey(cafeId, tableNumber), orderId); } catch {}
}

export function getKnownOrder(cafeId?: string, tableNumber?: string): string {
  if (typeof window === 'undefined') return '';
  try { return localStorage.getItem(knownOrderKey(cafeId, tableNumber)) || ''; } catch { return ''; }
}

export function hasStoredScopedSession(cafeId?: string, tableNumber?: string): boolean {
  if (typeof window === 'undefined') return false;
  const normT = (tableNumber || 'default').replace(/^(table|t-)\s*/i, '').trim().toUpperCase();
  const normC = (cafeId || 'default').trim().toLowerCase();
  return Boolean(localStorage.getItem(`quad_guest_uuid_${normC}_${normT}`));
}
