// Axis maths for the dashboard charts: a rounded top value, evenly spaced ticks, and short rupee labels.

/** The smallest "nice" number (1, 2, 2.5 or 5 × a power of ten) at or above the largest value. */
export function niceCeil(max: number): number {
  if (!Number.isFinite(max) || max <= 0) return 100;
  const exp = Math.pow(10, Math.floor(Math.log10(max)));
  const f = max / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

export function axisTicks(max: number, count = 4): number[] {
  const top = niceCeil(max);
  return Array.from({ length: count + 1 }, (_, i) => (top / count) * i);
}

/** ₹950, ₹1.2k, ₹3.4L, ₹1.1Cr: short enough for an axis. */
export function compactInr(n: number): string {
  const v = Math.abs(Number(n) || 0);
  const sign = n < 0 ? '−' : '';
  if (v >= 1e7) return `${sign}₹${(v / 1e7).toFixed(v >= 1e8 ? 0 : 1)}Cr`;
  if (v >= 1e5) return `${sign}₹${(v / 1e5).toFixed(v >= 1e6 ? 0 : 1)}L`;
  if (v >= 1e3) return `${sign}₹${(v / 1e3).toFixed(v >= 1e4 ? 0 : 1)}k`;
  return `${sign}₹${Math.round(v)}`;
}

export function sharePct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}
