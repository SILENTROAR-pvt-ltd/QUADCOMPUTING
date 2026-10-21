// Cash handed over and change returned, for a bill paid in cash (migration 20261022000001_cash_tender.sql).
// The sale is the bill; the drawer sees the notes come in and the change go out. Both are kept with the bill so the
// receipt, the till's message and the Z-report's drawer count all agree.

export interface CashTender { cash_tendered: number; cash_change: number }

const round2 = (n: number) => Math.round(n * 100) / 100;
/** More than this over the bill is a typo, not a payment. */
const MAX_OVER = 100_000;

/**
 * Reads the cash given for a bill. Null (no columns written) unless the tender is cash and an amount was given.
 * An amount short of the bill, or absurdly over it, is refused with the reason.
 */
export function readCashTender(paymentMethod: unknown, due: number, tendered: unknown): { tender: CashTender | null; error: string | null } {
  if (String(paymentMethod || '').toUpperCase() !== 'CASH') return { tender: null, error: null };
  if (tendered === undefined || tendered === null || tendered === '') return { tender: null, error: null };
  const given = Number(tendered);
  const bill = round2(Math.max(0, Number(due) || 0));
  if (!Number.isFinite(given) || given < 0) return { tender: null, error: 'Enter the cash the guest handed over.' };
  if (given + 0.005 < bill) return { tender: null, error: `₹${given.toLocaleString('en-IN')} is less than the bill of ₹${bill.toLocaleString('en-IN')}.` };
  if (given > bill + MAX_OVER) return { tender: null, error: 'That is far more than the bill; check the amount.' };
  return { tender: { cash_tendered: round2(given), cash_change: round2(Math.max(0, given - bill)) }, error: null };
}

/** Writes the tender onto a bill that was saved by another path (a room checkout). Best effort; never throws. */
export async function stampCashTender(db: any, businessId: string, orderId: string | null | undefined, tender: CashTender | null) {
  if (!orderId || !tender) return;
  try {
    const { error } = await db.from('orders').update(tender).eq('id', orderId).eq('business_id', businessId);
    if (error) console.warn('[cash-tender] could not record the cash given', error.message);
  } catch (e) {
    console.warn('[cash-tender] could not record the cash given', e);
  }
}

/** Quick amounts for the till: the exact bill, then the notes a guest is likely to hand over. */
export function cashSuggestions(due: number): number[] {
  const bill = Math.max(0, Math.ceil(due));
  const out = [bill];
  for (const note of [100, 200, 500, 1000, 2000]) {
    const up = Math.ceil(bill / note) * note;
    if (up > bill && !out.includes(up)) out.push(up);
  }
  return out.slice(0, 4);
}
