// A dish's recipe: the raw materials one portion uses. Sales deduct these from stock, so every
// raw material must belong to the same venue as the dish. A raw id from another venue would
// otherwise be deducted from that venue's stock.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface RecipeLine { raw_item_id: string; quantity_required: number }
export type RecipeResult = { ok: true } | { ok: false; status: number; error: string };

/** Well-formed lines only: a raw material id and a quantity above zero, each material once. */
export function cleanRecipeLines(input: unknown): { ok: true; lines: RecipeLine[] } | { ok: false; error: string } {
  if (input == null) return { ok: true, lines: [] };
  if (!Array.isArray(input)) return { ok: false, error: 'Recipe ingredients must be a list.' };
  const seen = new Set<string>();
  const lines: RecipeLine[] = [];
  for (const row of input) {
    const id = typeof row?.raw_item_id === 'string' ? row.raw_item_id : '';
    const qty = Number(row?.quantity_required);
    if (!UUID.test(id)) return { ok: false, error: 'An ingredient is not a valid raw material.' };
    if (!Number.isFinite(qty) || qty <= 0) return { ok: false, error: 'Every ingredient needs a quantity above zero.' };
    if (seen.has(id)) continue;
    seen.add(id);
    lines.push({ raw_item_id: id, quantity_required: qty });
  }
  return { ok: true, lines };
}

export async function saveRecipe(db: any, businessId: string, catalogItemId: string, lines: RecipeLine[]): Promise<RecipeResult> {
  const { data: dish, error: dishErr } = await db.from('catalog_items').select('id')
    .eq('id', catalogItemId).eq('business_id', businessId).maybeSingle();
  if (dishErr) throw dishErr;
  if (!dish) return { ok: false, status: 404, error: 'That dish is not on your menu.' };

  const ids = lines.map((l) => l.raw_item_id);
  if (ids.length) {
    const { data: owned, error: ownErr } = await db.from('raw_inventory_items').select('id')
      .eq('business_id', businessId).in('id', ids);
    if (ownErr) throw ownErr;
    if ((owned || []).length !== ids.length) {
      return { ok: false, status: 400, error: 'One or more raw materials are not in your inventory.' };
    }
  }

  const { data: existing, error: existingErr } = await db.from('recipe_ingredients').select('id, raw_item_id')
    .eq('catalog_item_id', catalogItemId).eq('business_id', businessId);
  if (existingErr) throw existingErr;
  const rowFor = new Map<string, string>((existing || []).map((r: any) => [r.raw_item_id, r.id]));

  // Write what stays or is new first, and only then drop what was removed. If a write fails part-way,
  // the dish keeps its old lines instead of ending up with no recipe at all.
  for (const line of lines) {
    const rowId = rowFor.get(line.raw_item_id);
    if (rowId) {
      const { error } = await db.from('recipe_ingredients').update({ quantity_required: line.quantity_required }).eq('id', rowId);
      if (error) throw error;
    } else {
      const { error } = await db.from('recipe_ingredients').insert({
        business_id: businessId, catalog_item_id: catalogItemId,
        raw_item_id: line.raw_item_id, quantity_required: line.quantity_required,
      });
      if (error) throw error;
    }
  }

  const keep = new Set(ids);
  const dropIds = (existing || []).filter((r: any) => !keep.has(r.raw_item_id)).map((r: any) => r.id);
  if (dropIds.length) {
    const { error } = await db.from('recipe_ingredients').delete().in('id', dropIds);
    if (error) throw error;
  }
  return { ok: true };
}
