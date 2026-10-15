import { normalizePhone, type PurchaseLine } from './purchase-message';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseVendor(body: any): Parsed<{ name: string; phone: string | null; notes: string | null }> {
  const name = text(body?.name, 80);
  if (!name) return { ok: false, error: 'Give the vendor a name.' };
  const hasPhone = typeof body?.phone === 'string' && body.phone.trim() !== '';
  const phone = hasPhone ? normalizePhone(body.phone) : null;
  if (hasPhone && !phone) return { ok: false, error: 'Enter a valid WhatsApp number, e.g. 98765 43210.' };
  return { ok: true, value: { name, phone, notes: text(body?.notes, 240) } };
}

export function parseLines(raw: unknown, needCost = false): Parsed<PurchaseLine[]> {
  if (!Array.isArray(raw) || raw.length === 0) return { ok: false, error: 'Add at least one item to the order.' };
  if (raw.length > 100) return { ok: false, error: 'An order can have up to 100 items.' };
  const lines: PurchaseLine[] = [];
  for (const l of raw as any[]) {
    const quantity = Number(l?.quantity);
    const unit_cost = Number(l?.unit_cost ?? 0);
    if (!UUID.test(String(l?.item_id || ''))) return { ok: false, error: 'An order line has no stock item.' };
    if (!Number.isFinite(quantity) || quantity <= 0) return { ok: false, error: `Enter a quantity for ${l?.name || 'every item'}.` };
    if (!Number.isFinite(unit_cost) || unit_cost < 0 || (needCost && l?.unit_cost === undefined)) {
      return { ok: false, error: `Enter the cost for ${l?.name || 'every item'}.` };
    }
    const line: PurchaseLine = {
      item_id: String(l.item_id), name: text(l?.name, 80) || 'Item', unit: text(l?.unit, 12) || '',
      quantity: Math.round(quantity * 1000) / 1000, unit_cost: Math.round(unit_cost * 100) / 100,
    };
    if (l?.is_new === true) {
      line.is_new = true;
      line.category = text(l?.category, 40) || 'Raw stock';
      if (!text(l?.name, 80)) return { ok: false, error: 'Give every new item a name.' };
    }
    lines.push(line);
  }
  if (new Set(lines.map((l) => l.item_id)).size !== lines.length) return { ok: false, error: 'An item appears twice in the order.' };
  return { ok: true, value: lines };
}

export interface NewOrder { reference: string; vendor_id: string | null; vendor_name: string; vendor_phone: string | null; lines: PurchaseLine[]; note: string | null }

/** A purchase already in hand (`receive_now`) may come from the market with no vendor; an order to send needs one. */
export const MARKET_VENDOR = 'Market purchase';

export function parseNewOrder(body: any): Parsed<NewOrder> {
  const receiveNow = body?.receive_now === true;
  const vendor_name = text(body?.vendor_name, 80) || (receiveNow ? MARKET_VENDOR : null);
  if (!vendor_name) return { ok: false, error: 'Choose a vendor.' };
  const reference = text(body?.reference, 30);
  if (!reference || !/^[A-Z0-9-]+$/i.test(reference)) return { ok: false, error: 'The order has no reference.' };
  const lines = parseLines(body?.lines, receiveNow);
  if (!lines.ok) return lines;
  return {
    ok: true,
    value: {
      reference: reference.toUpperCase(),
      vendor_id: UUID.test(String(body?.vendor_id || '')) ? String(body.vendor_id) : null,
      vendor_name,
      vendor_phone: normalizePhone(body?.vendor_phone),
      lines: lines.value,
      note: text(body?.note, 240),
    },
  };
}
