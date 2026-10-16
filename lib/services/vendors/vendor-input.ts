/** Pure rules for vendors: what a vendor record may hold, the WhatsApp link, and the order message the host shares. */

export const VENDOR_CATEGORIES = [
  { id: 'food', label: 'Food & drinks' },
  { id: 'bike_rental', label: 'Bike rental' },
  { id: 'taxi', label: 'Taxi & transport' },
  { id: 'laundry', label: 'Laundry' },
  { id: 'tours', label: 'Tours & activities' },
  { id: 'other', label: 'Other' },
] as const;
export type VendorCategory = (typeof VENDOR_CATEGORIES)[number]['id'];

export interface VendorInput {
  name: string;
  category: VendorCategory;
  whatsapp_phone: string;
  qr_image: string | null;
  notes: string | null;
}

export const QR_MAX_CHARS = 400_000;
const QR_PREFIX = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

const bad = (message: string) => Object.assign(new Error(message), { status: 400 });

/** Digits only, with India's 91 in front of a 10-digit mobile number. Null when it cannot be a WhatsApp number. */
export function normalizeWhatsapp(raw: unknown): string | null {
  const digits = String(raw ?? '').replace(/\D/g, '').replace(/^0+/, '');
  if (digits.length === 10) return `91${digits}`;
  return digits.length >= 11 && digits.length <= 15 ? digits : null;
}

/** Checks a vendor form. `partial` allows an edit that sends only some fields; `qr_image: null` removes the QR. */
export function parseVendorInput(raw: unknown, partial = false): Partial<VendorInput> {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out: Partial<VendorInput> = {};

  if (!partial || d.name !== undefined) {
    const name = String(d.name ?? '').trim().replace(/\s+/g, ' ');
    if (name.length < 1 || name.length > 80) throw bad('Enter the vendor name (up to 80 characters).');
    out.name = name;
  }
  if (!partial || d.category !== undefined) {
    const category = String(d.category ?? 'other');
    if (!VENDOR_CATEGORIES.some((c) => c.id === category)) throw bad('Choose a category.');
    out.category = category as VendorCategory;
  }
  if (!partial || d.whatsapp_phone !== undefined) {
    const phone = normalizeWhatsapp(d.whatsapp_phone);
    if (!phone) throw bad('Enter a WhatsApp number: 10 digits, or with the country code.');
    out.whatsapp_phone = phone;
  }
  if (!partial || d.qr_image !== undefined) {
    const qr = d.qr_image === null || d.qr_image === '' || d.qr_image === undefined ? null : String(d.qr_image);
    if (qr && (qr.length > QR_MAX_CHARS || !QR_PREFIX.test(qr))) throw bad('The QR must be a PNG, JPG or WebP image under 300 KB.');
    out.qr_image = qr;
  }
  if (!partial || d.notes !== undefined) {
    const notes = String(d.notes ?? '').trim();
    if (notes.length > 300) throw bad('Notes can be up to 300 characters.');
    out.notes = notes || null;
  }
  return out;
}

/** wa.me click-to-chat with the message already typed; WhatsApp opens on the phone or the web. */
export function whatsappLink(phone: string, text: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export interface ShareableOrder {
  id: string;
  table_number: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  items: Array<{ name?: string; item_name?: string; quantity?: number; qty?: number; notes?: string | null }>;
  created_at: string;
}

/** The message a host shares with a vendor: who it is from, where to, and what to bring. Prices are left to the vendor. */
export function orderMessage(order: ShareableOrder, venueName: string, note = ''): string {
  const lines = (order.items ?? []).map((i) => {
    const qty = Number(i.quantity ?? i.qty ?? 1) || 1;
    const name = String(i.name ?? i.item_name ?? 'Item').trim();
    return `• ${qty} × ${name}${i.notes ? ` (${String(i.notes).trim()})` : ''}`;
  });
  const where = order.delivery_address
    ? `Deliver to: ${order.delivery_address}`
    : order.table_number ? `For: ${/^(table|t-|room)/i.test(order.table_number) ? order.table_number : `Table ${order.table_number}`}` : '';
  const guest = [order.customer_name && !/^guest$/i.test(order.customer_name) ? order.customer_name : '', order.customer_phone ?? ''].filter(Boolean).join(' · ');
  const ref = `Ref ${order.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  const header = [`New order from ${venueName}`, where, guest ? `Guest: ${guest}` : ''].filter(Boolean);
  const footer = [note.trim(), ref].filter(Boolean);
  return [...header, '', ...(lines.length ? lines : ['(no items)']), '', ...footer].join('\n');
}
