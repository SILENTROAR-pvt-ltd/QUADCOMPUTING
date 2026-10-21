// What a stay has been charged beyond the nights and add-ons (early check-in, late check-out), what the guest paid in
// advance, and so what is still owed. One place, used by checkout, the front desk's folio and the guest's own bill, so
// the three always agree and an advance is credited exactly once.

export interface ExtraLine { id: string; name: string; price: number; qty: number; notes?: string; type: 'early_checkin' | 'late_checkout' }

export const readExtras = (raw: unknown): ExtraLine[] =>
  (Array.isArray(raw) ? raw : [])
    .filter((x: any) => x && typeof x.name === 'string' && Number.isFinite(Number(x.price)))
    .map((x: any) => ({ id: String(x.id || x.name), name: x.name, price: Number(x.price), qty: Number(x.qty) || 1, notes: typeof x.notes === 'string' ? x.notes : undefined, type: x.type === 'late_checkout' ? 'late_checkout' : 'early_checkin' }));

export const extrasTotal = (extras: ExtraLine[]) => extras.reduce((s, l) => s + l.price * l.qty, 0);

export interface Ledger {
  /** Nights + add-ons + extras + room-service dishes: what the stay is worth. */
  gross: number;
  /** The part of the advance that offsets the gross. */
  credit: number;
  /** Still to pay at checkout. */
  payable: number;
  /** Paid in advance beyond what the stay came to (left early): owed back to the guest. */
  refundDue: number;
}

export function settleLedger(parts: { folioTotal: number; extras?: ExtraLine[]; diningTotal?: number; advancePaid?: number }): Ledger {
  const gross = Math.max(0, (Number(parts.folioTotal) || 0) + extrasTotal(parts.extras || []) + (Number(parts.diningTotal) || 0));
  const advance = Math.max(0, Number(parts.advancePaid) || 0);
  const credit = Math.min(advance, gross);
  return { gross, credit, payable: gross - credit, refundDue: advance - credit };
}

/** The bill line that shows the advance as a credit, so the lines add up to what is payable. */
export const creditLine = (credit: number) => ({
  id: 'advance-paid', name: 'Advance paid', price: -credit, qty: 1, notes: 'Room payment taken before check-in', type: 'advance' as const,
});

export const extraLineId = (kind: ExtraLine['type'], at: string) => `${kind}-${at.slice(0, 16).replace(/\D/g, '')}`;
