// Stock item fields accepted from the screens.

const text = (v: unknown, max = 80) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const nonNeg = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : null; };

// Matches the units offered by the add-stock form (raw-stock.constants), plus small-measure ones.
export const UNITS = ['kg', 'grams', 'g', 'ltr', 'ml', 'pcs', 'dozen', 'packets', 'crates', 'boxes', 'bottles', 'tins'];

export type NewItem = { ok: true; row: any; opening: number; cost: number };

/** One new stock item from the add-stock form (either naming style). It starts at zero stock. */
export function parseNewItem(it: any): NewItem | { ok: false; error: string } {
  const name = text(it?.itemName ?? it?.item_name);
  if (!name) return { ok: false, error: 'Every item needs a name.' };
  const unit = String(it?.unit || 'kg').toLowerCase();
  const cost = nonNeg(it?.costPerUnit ?? it?.cost_per_unit) ?? 0;
  return {
    ok: true,
    opening: nonNeg(it?.currentStock ?? it?.current_stock) ?? 0,
    cost,
    row: {
      item_name: name,
      category: text(it?.category, 40) || 'Raw stock',
      unit: UNITS.includes(unit) ? unit : 'kg',
      current_stock: 0,
      threshold: nonNeg(it?.threshold) ?? 5,
      cost_per_unit: cost,
      is_critical: Boolean(it?.is_critical ?? it?.isCritical ?? false),
    },
  };
}

/** Editable details. Quantity and cost change only through movements, so the ledger stays complete. */
export function parseItemPatch(body: any): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const name = text(body?.item_name);
  if (name) out.item_name = name;
  const cat = text(body?.category, 40);
  if (cat) out.category = cat;
  if (typeof body?.unit === 'string' && UNITS.includes(body.unit.toLowerCase())) out.unit = body.unit.toLowerCase();
  const reorder = nonNeg(body?.threshold);
  if (reorder !== null) out.threshold = reorder;
  if (body?.supplier_name !== undefined) out.supplier_name = text(body.supplier_name);
  if (body?.is_critical !== undefined) out.is_critical = Boolean(body.is_critical);
  return out;
}
