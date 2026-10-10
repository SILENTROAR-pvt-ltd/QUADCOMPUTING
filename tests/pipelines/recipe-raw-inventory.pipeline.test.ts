import { describe, it, expect, vi } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { cleanRecipeLines, saveRecipe } from '@/lib/services/catalog/recipe.service';
import { toBaseQuantity, displayQuantity } from '@/components/host/workspaces/catalog/recipe/recipe-units';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const OTHER = 'bbbbbbbb-1111-4222-8333-444444444444';
const DISH = 'cccccccc-1111-4222-8333-444444444444';
const OTHER_DISH = 'dddddddd-1111-4222-8333-444444444444';
const OIL = '11111111-aaaa-4bbb-8ccc-000000000001';
const FLOUR = '11111111-aaaa-4bbb-8ccc-000000000002';
const SALT = '11111111-aaaa-4bbb-8ccc-000000000003';
const FOREIGN_RAW = '22222222-aaaa-4bbb-8ccc-000000000009';

const ctx = vi.hoisted(() => ({ db: null as any }));
vi.mock('@/lib/supabase/admin', () => ({ adminDb: () => ctx.db }));
vi.mock('@/lib/auth/guards', () => ({
  requireHost: async () => ({ error: null, businessId: BIZ, supabase: ctx.db, user: { id: 'host-1' } }),
}));
import { POST as recipePOST } from '@/app/api/host/catalog/recipe/route';

const seed = () => createFakeSupabase({
  catalog_items: [
    { id: DISH, business_id: BIZ, name: 'Misal Pav', item_type: 'food' },
    { id: OTHER_DISH, business_id: OTHER, name: 'Elsewhere', item_type: 'food' },
  ],
  raw_inventory_items: [
    { id: OIL, business_id: BIZ, item_name: 'Cooking Oil', unit: 'ltr', current_stock: 32 },
    { id: FLOUR, business_id: BIZ, item_name: 'Flour', unit: 'kg', current_stock: 5 },
    { id: SALT, business_id: BIZ, item_name: 'Salt', unit: 'kg', current_stock: 2 },
    { id: FOREIGN_RAW, business_id: OTHER, item_name: 'Their Flour', unit: 'kg', current_stock: 99 },
  ],
  recipe_ingredients: [
    { id: 'r-oil', business_id: BIZ, catalog_item_id: DISH, raw_item_id: OIL, quantity_required: 0.05 },
    { id: 'r-salt', business_id: BIZ, catalog_item_id: DISH, raw_item_id: SALT, quantity_required: 0.002 },
  ],
});

const post = (body: unknown) => recipePOST(new Request('http://x/api/host/catalog/recipe', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}));

describe('Recipe lines', () => {
  it('keeps well-formed lines once each and refuses bad quantities', () => {
    expect(cleanRecipeLines([
      { raw_item_id: OIL, quantity_required: 0.05 },
      { raw_item_id: OIL, quantity_required: 0.1 },
    ])).toEqual({ ok: true, lines: [{ raw_item_id: OIL, quantity_required: 0.05 }] });
    expect(cleanRecipeLines([{ raw_item_id: OIL, quantity_required: 0 }])).toMatchObject({ ok: false });
    expect(cleanRecipeLines([{ raw_item_id: 'not-a-uuid', quantity_required: 1 }])).toMatchObject({ ok: false });
    expect(cleanRecipeLines('oil')).toMatchObject({ ok: false });
  });
});

describe('Saving a recipe', () => {
  it('refuses a raw material from another venue, and writes nothing', async () => {
    const db = seed();
    const res = await saveRecipe(db, BIZ, DISH, [{ raw_item_id: FOREIGN_RAW, quantity_required: 0.1 }]);
    expect(res).toMatchObject({ ok: false, status: 400 });
    expect(db.tables.recipe_ingredients.map((r: any) => r.id)).toEqual(['r-oil', 'r-salt']);
  });

  it('refuses a dish from another venue', async () => {
    const db = seed();
    expect(await saveRecipe(db, BIZ, OTHER_DISH, [])).toMatchObject({ ok: false, status: 404 });
  });

  it('adds new lines, changes quantities, and removes the ones taken off', async () => {
    const db = seed();
    const res = await saveRecipe(db, BIZ, DISH, [
      { raw_item_id: OIL, quantity_required: 0.08 },   // changed
      { raw_item_id: FLOUR, quantity_required: 0.2 },  // new
    ]);
    expect(res).toEqual({ ok: true });
    const rows = db.tables.recipe_ingredients.filter((r: any) => r.catalog_item_id === DISH);
    expect(rows.map((r: any) => [r.raw_item_id, r.quantity_required]).sort()).toEqual([
      [FLOUR, 0.2], [OIL, 0.08],
    ].sort());
  });

  it('through the route: a valid save returns success, a foreign material returns 400', async () => {
    ctx.db = seed();
    const ok = await post({ catalogItemId: DISH, ingredients: [{ raw_item_id: FLOUR, quantity_required: 0.25 }] });
    expect(ok.status).toBe(200);
    const bad = await post({ catalogItemId: DISH, ingredients: [{ raw_item_id: FOREIGN_RAW, quantity_required: 1 }] });
    expect(bad.status).toBe(400);
  });
});

describe('Units', () => {
  it('types grams and mL for kg and ltr, and stores the base unit', () => {
    expect(toBaseQuantity('kg', 250)).toBe(0.25);
    expect(toBaseQuantity('ltr', 500)).toBe(0.5);
    expect(toBaseQuantity('pcs', 2)).toBe(2);
    expect(displayQuantity('kg', 0.25)).toBe('250 g');
    expect(displayQuantity('ltr', 0.05)).toBe('50 ml');
    expect(displayQuantity('pcs', 2)).toBe('2 pcs');
  });
});
