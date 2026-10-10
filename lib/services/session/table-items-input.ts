// What a host may send when adding catalogue items to a table. Only real catalogue items (uuid ids) are accepted,
// so the price always comes from the catalogue, never from the browser.
export interface TableItemLine { item_id: string; quantity: number; notes: string | null }
export interface TableItemsInput { table_number: string; items: TableItemLine[] }
export type TableItemsCheck = { ok: true; value: TableItemsInput } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LINES = 30;

export function cleanTableItems(body: any): TableItemsCheck {
  const table = String(body?.table_number ?? '').trim();
  if (!/^[A-Za-z0-9 -]{1,12}$/.test(table)) return { ok: false, error: 'Choose a table.' };

  if (!Array.isArray(body?.items) || body.items.length === 0) return { ok: false, error: 'Add at least one item.' };
  if (body.items.length > MAX_LINES) return { ok: false, error: `Add up to ${MAX_LINES} items at a time.` };

  const items: TableItemLine[] = [];
  for (const raw of body.items) {
    const itemId = String(raw?.item_id ?? '');
    if (!UUID.test(itemId)) return { ok: false, error: 'One of the items is not on the menu.' };
    const quantity = Number(raw?.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) return { ok: false, error: 'A quantity must be between 1 and 50.' };
    const notes = String(raw?.notes ?? '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, 140) || null;
    items.push({ item_id: itemId, quantity, notes });
  }
  return { ok: true, value: { table_number: table, items } };
}
