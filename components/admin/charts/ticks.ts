/** Axis ticks from 0 in steps of 1, 2 or 5 × 10ⁿ (₹10k, ₹20k … never ₹13k), about `target` steps to the top. */
export function niceTicks(max: number, target = 4): number[] {
  if (!(max > 0)) return [0, 1, 2, 3, 4];
  const raw = max / target;
  const exp = 10 ** Math.floor(Math.log10(raw));
  const f = raw / exp;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => Math.round(i * step * 100) / 100);
}
