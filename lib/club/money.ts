// Money is stored and moved as integer paise. Forms speak rupees; this is the only conversion point.
export const MAX_RUPEES = 10_000_000; // ₹1 crore per amount

/** Rupees (number or numeric string, up to 2 decimals) to paise, or null when invalid. */
export function toPaise(raw: unknown, { allowZero = true } = {}): number | null {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > MAX_RUPEES) return null;
  const paise = Math.round(n * 100);
  if (!allowZero && paise === 0) return null;
  return paise;
}

export function formatINR(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

/** Basis points of an amount, rounded down so the platform never takes more than its share. */
export function bpsOf(amount: number, bps: number): number {
  return Math.floor((amount * bps) / 10_000);
}

/**
 * Splits a total across schedule steps (basis points summing to 10,000). Rounding goes to the last
 * step, so the parts always add up to the total exactly.
 */
export function splitBySchedule(total: number, steps: Array<{ bps: number }>): number[] {
  const parts = steps.map((s) => bpsOf(total, s.bps));
  const used = parts.slice(0, -1).reduce((a, b) => a + b, 0);
  if (parts.length) parts[parts.length - 1] = total - used;
  return parts;
}
