// The number verifier: a sentence about the venue's money may only contain numbers that the tools actually returned.
// Any free text (a template today, an optional model summary later) passes through it; a sentence with a number that
// is not in the tool output is replaced by the safe template.

/** Every number in a piece of text, as plain values ("₹1,250.50" -> 1250.5, "12%" -> 12). */
export function numbersIn(text: string): number[] {
  return (text.match(/-?\d[\d,]*(?:\.\d+)?/g) || []).map((s) => Number(s.replace(/,/g, ''))).filter((n) => Number.isFinite(n));
}

/** Every number anywhere in the tool output (nested objects and arrays included). */
export function numbersOf(value: unknown, out: number[] = []): number[] {
  if (typeof value === 'number' && Number.isFinite(value)) out.push(value);
  else if (typeof value === 'string') out.push(...numbersIn(value));
  else if (Array.isArray(value)) value.forEach((v) => numbersOf(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => numbersOf(v, out));
  return out;
}

const near = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.01, Math.abs(b) * 0.0005);

/** True when every number in `text` matches a number in `source` (rounded the way a sentence rounds: 2 dp or whole). */
export function numbersGrounded(text: string, source: unknown): boolean {
  const allowed = numbersOf(source);
  return numbersIn(text).every((n) => allowed.some((a) => near(n, a) || near(n, Math.round(a)) || near(n, Math.round(a * 100) / 100)));
}

/** The sentence if every number in it is grounded, otherwise the fallback. */
export const verifiedOr = (text: string, source: unknown, fallback: string) => (numbersGrounded(text, source) ? text : fallback);
