import { describe, it, expect } from 'vitest';
import { cartProblem, cartTotal, lineFromItem, lineFromNew, patchLine, toApiLines, toggleLine } from './purchase-cart';

const item = (over: Record<string, unknown> = {}) => ({ id: 'a1', item_name: 'Paneer', unit: 'kg', current_stock: 2, cost_per_unit: 320, suggested_order: 4.5, ...over }) as any;

describe('the purchase being put together', () => {
  it('fills a tapped low item with the suggested quantity and its last cost', () => {
    expect(lineFromItem(item())).toMatchObject({ id: 'a1', qty: '4.5', cost: '320', isNew: false });
    expect(lineFromItem(item({ suggested_order: 0 })).qty).toBe('');
  });

  it('a second tap takes the item out again', () => {
    const once = toggleLine([], item());
    expect(once).toHaveLength(1);
    expect(toggleLine(once, item())).toHaveLength(0);
  });

  it('totals only lines with a quantity', () => {
    let lines = toggleLine([], item());
    lines = patchLine(lines, 'a1', { qty: '2' });
    expect(cartTotal(lines)).toBe(640);
    expect(cartTotal(patchLine(lines, 'a1', { qty: '' }))).toBe(0);
  });

  it('asks for a quantity on every line, and a rate only when the goods are already here', () => {
    const lines = patchLine(toggleLine([], item({ cost_per_unit: 0 })), 'a1', { qty: '3' });
    expect(cartProblem([], { needCost: false, existingNames: [] })).toMatch(/at least one/i);
    expect(cartProblem(lines, { needCost: false, existingNames: [] })).toBeNull();
    expect(cartProblem(lines, { needCost: true, existingNames: [] })).toMatch(/rate for Paneer/);
    expect(cartProblem(patchLine(lines, 'a1', { qty: '' }), { needCost: false, existingNames: [] })).toMatch(/quantity for Paneer/);
  });

  it('refuses a new item that is already in raw inventory, or typed twice', () => {
    const fresh = lineFromNew({ name: ' Saffron ', unit: 'grams', category: '', qty: '10', cost: '900' });
    expect(fresh).toMatchObject({ name: 'Saffron', isNew: true, category: 'Raw stock' });
    expect(cartProblem([fresh], { needCost: true, existingNames: ['saffron'] })).toMatch(/already in your raw inventory/);
    const twin = { ...fresh, id: 'other' };
    expect(cartProblem([fresh, twin], { needCost: true, existingNames: [] })).toMatch(/twice/);
  });

  it('sends new items flagged, and existing ones plain', () => {
    const fresh = lineFromNew({ name: 'Saffron', unit: 'grams', category: 'Spices', qty: '10', cost: '900' });
    const api = toApiLines([patchLine(toggleLine([], item()), 'a1', { qty: '2' })[0], fresh]);
    expect(api[0]).toEqual({ item_id: 'a1', name: 'Paneer', unit: 'kg', quantity: 2, unit_cost: 320 });
    expect(api[1]).toMatchObject({ name: 'Saffron', quantity: 10, unit_cost: 900, is_new: true, category: 'Spices' });
    expect(api[1].item_id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
