// Turning a purchase list into a WhatsApp message to a vendor. Shared by the screen (which opens
// WhatsApp straight from the tap, so the browser does not block it) and the server (which stores it).

export interface PurchaseLine { item_id: string; name: string; unit: string; quantity: number; unit_cost: number }

/**
 * A number WhatsApp accepts: country code and digits only. Ten-digit Indian mobiles get 91;
 * a leading 0 or +91 is tidied. Returns null when it cannot be a phone number.
 */
export function normalizePhone(raw: unknown): string | null {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 10) d = `91${d}`;
  return /^\d{11,15}$/.test(d) ? d : null;
}

/** Shows a stored number the way people read it: +91 98765 43210. */
export function displayPhone(digits: string | null | undefined): string {
  if (!digits) return '';
  return digits.length === 12 && digits.startsWith('91') ? `+91 ${digits.slice(2, 7)} ${digits.slice(7)}` : `+${digits}`;
}

/** PO-091026-143205: the date and time it was raised (India time), easy to read out on a call. */
export function poReference(at: Date = new Date()): string {
  const ist = new Date(at.getTime() + 330 * 60_000).toISOString();
  return `PO-${ist.slice(8, 10)}${ist.slice(5, 7)}${ist.slice(2, 4)}-${ist.slice(11, 13)}${ist.slice(14, 16)}${ist.slice(17, 19)}`;
}

const fmtQty = (n: number) => (Math.round(n * 1000) / 1000).toLocaleString('en-IN', { maximumFractionDigits: 3 });

export function buildPurchaseMessage(p: {
  venueName: string; vendorName: string; reference: string; lines: PurchaseLine[]; note?: string | null; deliverBy?: string | null;
}): string {
  const out = [`Hello ${p.vendorName},`, '', `Please send the following for ${p.venueName} (order ${p.reference}):`];
  p.lines.forEach((l, i) => out.push(`${i + 1}. ${l.name} - ${fmtQty(l.quantity)} ${l.unit}`.trim()));
  const extra = [p.deliverBy ? `Deliver by: ${p.deliverBy}` : '', p.note ? `Note: ${p.note}` : ''].filter(Boolean);
  if (extra.length) out.push('', ...extra);
  out.push('', 'Kindly confirm availability and rates. Thank you.');
  return out.join('\n');
}

/** Opens WhatsApp (app or web) on the vendor's chat with the message ready to send. */
export function whatsappUrl(phone: string | null, text: string): string {
  const q = `text=${encodeURIComponent(text)}`;
  return phone ? `https://wa.me/${phone}?${q}` : `https://wa.me/?${q}`;
}

export const estimatedTotal = (lines: PurchaseLine[]) =>
  Math.round(lines.reduce((s, l) => s + l.quantity * (l.unit_cost || 0), 0) * 100) / 100;
