// Turns a venue's menu file into catalog changes. Pure: no database, so it can be tested directly.
// Existing items are matched by name (case-insensitive) and updated, never duplicated. Nothing is
// deleted, and a host's own hide/show choice is kept unless the item had no price before.

export const STATIONS = ['Kitchen', 'Bar', 'Grill'];

/** Problems that stop the import: they are reported and nothing is written. */
export function validateMenu(menu) {
  const errors = [];
  if (!menu || typeof menu !== 'object') return ['The menu file is empty or not valid JSON.'];
  if (!Array.isArray(menu.sections) || menu.sections.length === 0) errors.push('The menu has no sections.');
  const seen = new Map();
  for (const section of menu.sections || []) {
    if (!section.category || !String(section.category).trim()) errors.push('A section has no category name.');
    if (section.station && !STATIONS.includes(section.station)) errors.push(`Unknown station "${section.station}" in ${section.category}.`);
    for (const item of section.items || []) {
      const name = String(item.name || '').trim();
      if (!name) { errors.push(`An item in ${section.category} has no name.`); continue; }
      if (item.station && !STATIONS.includes(item.station)) errors.push(`Unknown station "${item.station}" for ${name}.`);
      if (item.price !== null && item.price !== undefined && (!Number.isFinite(Number(item.price)) || Number(item.price) < 0)) {
        errors.push(`The price for ${name} is not a valid amount.`);
      }
      const key = name.toLowerCase();
      if (seen.has(key)) errors.push(`"${name}" appears twice (${seen.get(key)} and ${section.category}).`);
      else seen.set(key, section.category);
    }
  }
  return errors;
}

/** One row per menu item, with its category, station and price (null when none is printed). */
export function menuRows(menu) {
  const rows = [];
  for (const section of menu.sections) {
    for (const item of section.items || []) {
      rows.push({
        name: String(item.name).trim(),
        category: String(section.category).trim(),
        price: item.price === null || item.price === undefined ? null : Number(item.price),
        station: item.station || section.station || 'Kitchen',
        made_to_order: Boolean(item.made_to_order),
      });
    }
  }
  return rows;
}

/**
 * The changes for this venue. `existing` is the venue's current catalog rows (id, name, price,
 * is_available, metadata). Returns { errors, inserts, updates, hidden }.
 */
export function planMenuImport(menu, existing) {
  const errors = validateMenu(menu);
  if (errors.length) return { errors, inserts: [], updates: [], hidden: [] };

  const byName = new Map((existing || []).map((r) => [String(r.name).trim().toLowerCase(), r]));
  const inserts = [];
  const updates = [];
  for (const row of menuRows(menu)) {
    const priced = row.price !== null && row.price > 0;
    const hit = byName.get(row.name.toLowerCase());
    if (hit) {
      const patch = { category: row.category, station: row.station, item_type: 'food' };
      if (row.price !== null) {
        patch.price = row.price;
        // Only an item that never had a price is switched on here; a host's own hide/show choice is kept.
        if (Number(hit.price) <= 0 && priced) patch.is_available = true;
        patch.metadata = { ...(hit.metadata || {}), imported_from: 'menu-import', made_to_order: row.made_to_order, needs_price: !priced };
      }
      updates.push({ id: hit.id, name: hit.name, patch, priceChanged: row.price !== null && Number(hit.price) !== row.price });
    } else {
      inserts.push({
        name: row.name, category: row.category, price: row.price ?? 0, item_type: 'food', station: row.station,
        // No printed price: saved hidden. The host sets a price and switches it on.
        is_available: priced, description: '',
        metadata: { imported_from: 'menu-import', made_to_order: row.made_to_order, needs_price: !priced },
      });
    }
  }
  const hidden = inserts.filter((i) => !i.is_available).map((i) => i.name);
  return { errors: [], inserts, updates, hidden };
}
