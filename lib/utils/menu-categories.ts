// The venue's own food categories, in the order the guest menu shows them. Shared by the guest menu
// and the host catalog, so both use the same names and order.

const PRIORITY = [
  'Starters',
  'Main Course',
  'Mains',
  'Chef Specials',
  'Tandoor & Grill',
  'Breads',
  'Desserts',
  'Beverages',
  'Breakfast',
  'General Food',
];

/** Distinct category names, the usual dining ones first, the rest A to Z. Blank names are dropped. */
export function sortCulinaryCategories(rawCategories: Set<string>): string[] {
  const foodCats = Array.from(rawCategories).map((c) => c.trim()).filter(Boolean);
  foodCats.sort((a, b) => {
    const idxA = PRIORITY.findIndex((p) => p.toLowerCase() === a.toLowerCase());
    const idxB = PRIORITY.findIndex((p) => p.toLowerCase() === b.toLowerCase());
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
  return Array.from(new Set(foodCats));
}
