import { describe, it, expect } from 'vitest';
import { parseMovement } from '@/lib/services/inventory/movement-input';
import { buildOverview, stockStatus, suggestedOrder } from '@/lib/services/inventory/overview.util';
import { parseItemPatch, parseNewItem } from '@/lib/services/inventory/item-crud.service';

const ITEM = '0b0f2f1e-2d3c-4b5a-8c7d-9e0f1a2b3c4d';
const NOW = new Date('2026-10-09T08:00:00Z'); // 13:30 IST
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

describe('Stock movements accepted from the screens', () => {
  it('records purchases with cost and supplier, and requires a reason for wastage', () => {
    expect(parseMovement({ item_id: ITEM, type: 'purchase', quantity: '12.5', unit_cost: 64, supplier: ' Amul ' }))
      .toMatchObject({ ok: true, value: { type: 'PURCHASE', quantity: 12.5, unit_cost: 64, supplier: 'Amul' } });
    expect(parseMovement({ item_id: ITEM, type: 'WASTAGE', quantity: 1 })).toMatchObject({ ok: false });
    expect(parseMovement({ item_id: ITEM, type: 'WASTAGE', quantity: 1, notes: 'Spoiled' })).toMatchObject({ ok: true });
  });

  it('allows signed adjustments and zero counts, and refuses the rest', () => {
    expect(parseMovement({ item_id: ITEM, type: 'ADJUSTMENT', quantity: -2 })).toMatchObject({ ok: true });
    expect(parseMovement({ item_id: ITEM, type: 'COUNT', quantity: 0 })).toMatchObject({ ok: true });
    expect(parseMovement({ item_id: ITEM, type: 'COUNT', quantity: -1 })).toMatchObject({ ok: false });
    expect(parseMovement({ item_id: ITEM, type: 'PURCHASE', quantity: 0 })).toMatchObject({ ok: false });
    expect(parseMovement({ item_id: ITEM, type: 'CONSUMPTION', quantity: 1 })).toMatchObject({ ok: false });
    expect(parseMovement({ item_id: 'milk', type: 'PURCHASE', quantity: 1 })).toMatchObject({ ok: false });
  });
});

describe('Stock overview', () => {
  const items = [
    { id: 'milk', item_name: 'Milk', unit: 'ltr', current_stock: 6, threshold: 10, cost_per_unit: 60, supplier_name: 'Amul' },
    { id: 'rice', item_name: 'Rice', unit: 'kg', current_stock: 40, threshold: 10, cost_per_unit: 50 },
    { id: 'paneer', item_name: 'Paneer', unit: 'kg', current_stock: -0.5, threshold: 1, cost_per_unit: 300 },
  ];
  const logs = [
    { item_id: 'milk', action_type: 'CONSUMPTION', change_amount: -14, total_cost: 840, logged_at: hoursAgo(30) },
    { item_id: 'milk', action_type: 'CONSUMPTION', change_amount: -0.5, total_cost: 30, logged_at: hoursAgo(2) },
    { item_id: 'milk', action_type: 'WASTAGE', change_amount: -1, total_cost: 60, logged_at: hoursAgo(5) },
    { item_id: 'rice', action_type: 'PURCHASE', change_amount: 50, total_cost: 2500, supplier_name: 'Metro', logged_at: hoursAgo(200) },
    { item_id: 'rice', action_type: 'COUNT', change_amount: -2, total_cost: 100, logged_at: hoursAgo(20) },
  ];
  const o = buildOverview({ items, logs, recipes: [{ raw_item_id: 'milk', catalog_item_id: 'tea' }, { raw_item_id: 'milk', catalog_item_id: 'coffee' }], dishCount: 5, now: NOW });

  it('classifies stock and values only what is on hand', () => {
    expect(o.items.map((i) => i.status)).toEqual(['low', 'ok', 'negative']);
    expect(o.summary).toMatchObject({ stock_value: 2360, attention_count: 2, negative_count: 1, item_count: 3 });
  });

  it('works out daily use, days of cover and a suggested order from what sold dishes used', () => {
    const milk = o.items[0];
    expect(milk).toMatchObject({ daily_use: 2.071, recipes: 2 });
    expect(milk.days_cover).toBe(2.9);
    expect(milk.suggested_order).toBe(22.994); // two weeks of use (28.994) less the 6 on hand
    expect(o.items[1]).toMatchObject({ daily_use: 0, days_cover: null, suggested_order: 0 });
  });

  it('totals use today, wastage, purchases, count losses, suppliers and recipe coverage', () => {
    expect(o.summary).toMatchObject({
      used_today_value: 30, used_7d_value: 870, wastage_7d_value: 60, purchases_30d_value: 2500,
      count_loss_30d_value: 100, supplier_count: 2, recipe_coverage: { linked: 2, total: 5 },
    });
  });

  it('suggests nothing above the reorder level and at least twice it below', () => {
    expect(stockStatus(0, 5)).toBe('out');
    expect(suggestedOrder(8, 5, 0)).toBe(0);
    expect(suggestedOrder(2, 5, 0)).toBe(8);
  });
});

describe('Adding and editing stock items', () => {
  it('starts a new item at zero; the opening quantity goes through the ledger', () => {
    const p = parseNewItem({ itemName: 'Milk', unit: 'LTR', currentStock: 20, costPerUnit: 65, threshold: 10 });
    expect(p).toMatchObject({ ok: true, opening: 20, cost: 65, row: { item_name: 'Milk', unit: 'ltr', current_stock: 0, threshold: 10 } });
    expect(parseNewItem({ itemName: '  ' })).toMatchObject({ ok: false });
  });

  it('never lets an edit change stock or cost directly', () => {
    expect(parseItemPatch({ current_stock: 999, cost_per_unit: 1, threshold: 4, supplier_name: 'Metro' }))
      .toEqual({ threshold: 4, supplier_name: 'Metro' });
  });
});
