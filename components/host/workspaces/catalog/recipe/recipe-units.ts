// Recipes store quantities in the raw material's base unit. Staff type grams or mL for kg and ltr
// materials, so the form converts on the way in and the list converts back on the way out.

const round = (n: number) => Math.round(n * 1000) / 1000;

export const usesSmallUnits = (unit: string) => ['kg', 'ltr'].includes(unit.trim().toLowerCase());

/** The quantity the staff member typed, in the material's base unit. */
export function toBaseQuantity(unit: string, entered: number): number {
  return usesSmallUnits(unit) ? round(entered / 1000) : round(entered);
}

/** A stored quantity as the staff member would read it. */
export function displayQuantity(unit: string, stored: number): string {
  const u = unit.trim().toLowerCase();
  if (u === 'kg') return `${round(stored * 1000)} g`;
  if (u === 'ltr') return `${round(stored * 1000)} ml`;
  return `${round(stored)} ${unit}`;
}

/** Label for the quantity box, in the unit the staff member types. */
export function enteredLabel(unit?: string): string {
  const u = (unit ?? '').trim().toLowerCase();
  if (u === 'kg') return 'Quantity (grams)';
  if (u === 'ltr') return 'Quantity (mL)';
  return unit ? `Quantity (${unit})` : 'Quantity';
}
