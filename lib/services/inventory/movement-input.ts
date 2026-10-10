// What the stock screens may ask the ledger to do. Consumption is never entered by hand: it comes
// from recipes when a dish is sold.

export const MOVEMENT_TYPES = ['PURCHASE', 'OPENING', 'WASTAGE', 'ADJUSTMENT', 'COUNT'] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export interface MovementInput {
  item_id: string;
  type: MovementType;
  quantity: number;
  unit_cost: number | null;
  supplier: string | null;
  reference: string | null;
  notes: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (v: unknown, max = 120) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const num = (v: unknown) => (v === null || v === undefined || v === '' ? NaN : Number(v));

/** A validated movement, or the reason it cannot be recorded. */
export function parseMovement(body: any): { ok: true; value: MovementInput } | { ok: false; error: string } {
  const type = String(body?.type || '').toUpperCase() as MovementType;
  if (!MOVEMENT_TYPES.includes(type)) return { ok: false, error: 'Choose purchase, wastage, adjustment or count.' };
  if (!UUID.test(String(body?.item_id || ''))) return { ok: false, error: 'Choose a stock item.' };

  const quantity = num(body?.quantity);
  if (!Number.isFinite(quantity)) return { ok: false, error: 'Enter a quantity.' };
  if (type === 'COUNT' && quantity < 0) return { ok: false, error: 'A counted quantity cannot be negative.' };
  if (type === 'ADJUSTMENT' && quantity === 0) return { ok: false, error: 'An adjustment must add or remove some stock.' };
  if (!['COUNT', 'ADJUSTMENT'].includes(type) && quantity <= 0) return { ok: false, error: 'Quantity must be more than zero.' };
  if (Math.abs(quantity) > 1_000_000) return { ok: false, error: 'That quantity is too large.' };

  const cost = num(body?.unit_cost);
  if ((type === 'PURCHASE' || type === 'OPENING') && Number.isFinite(cost) && cost < 0) {
    return { ok: false, error: 'Cost cannot be negative.' };
  }
  if (type === 'WASTAGE' && !text(body?.notes)) return { ok: false, error: 'Give a reason for the wastage.' };

  return {
    ok: true,
    value: {
      item_id: String(body.item_id),
      type,
      quantity: Math.round(quantity * 10000) / 10000,
      unit_cost: Number.isFinite(cost) ? cost : null,
      supplier: text(body?.supplier, 80),
      reference: text(body?.reference, 60),
      notes: text(body?.notes, 240),
    },
  };
}
