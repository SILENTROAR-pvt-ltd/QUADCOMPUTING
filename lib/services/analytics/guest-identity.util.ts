// Who a bill belongs to. Orders keep the name and phone typed at the till; a QR
// guest's wallet handle (e.g. @babaaps) lives on the table session and on the
// wallet ledger. Placeholder names like "Guest" are not a real name.
const PLACEHOLDER_NAMES = new Set(['', 'guest', 'walk-in', 'walk-in guest', 'walkin', 'walk in guest']);

export interface GuestIdentity {
  name: string | null;
  handle: string | null;
  phone: string | null;
  /** What to print: the name, else the handle, else the phone, else "Walk-in guest". */
  label: string;
}

interface OrderGuestFields {
  customer_name?: string | null;
  customer_phone?: string | null;
  guest_name?: string | null;
}

const clean = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export function realName(value: unknown): string | null {
  const v = clean(value);
  return PLACEHOLDER_NAMES.has(v.toLowerCase()) ? null : v;
}

export function asHandle(value: unknown): string | null {
  const v = clean(value);
  return /^@[\w.]{2,}$/.test(v) ? v : null;
}

export function resolveGuestIdentity(order: OrderGuestFields, ...handles: unknown[]): GuestIdentity {
  const name = realName(order.customer_name) || realName(order.guest_name);
  const handle = handles.map(asHandle).find(Boolean) || null;
  const phone = clean(order.customer_phone) || null;
  return { name, handle, phone, label: name || handle || phone || 'Walk-in guest' };
}
