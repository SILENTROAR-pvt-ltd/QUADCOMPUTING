import { describe, expect, it } from 'vitest';
import { buildDialActions } from './dial-actions';
import { normalizeBillItems } from './bill/normalize-bill-items';
import { categoryKey, sectionId } from './hooks/useCategorySpy';

const noop = () => undefined;
const ctx = { settled: false, billReady: false, billRequested: false, hasServices: false, openProfile: noop, openService: noop, openTracker: noop, requestBill: noop, goToServices: noop, openLounge: noop };

describe('the quick-actions list', () => {
  it('leaves the bill out until the food is ready', () => {
    expect(buildDialActions(ctx).map((a) => a.id)).toEqual(['profile', 'service', 'tracker', 'lounge']);
  });

  it('offers the bill once it can be asked for, and shows it as done once requested', () => {
    const ready = buildDialActions({ ...ctx, billReady: true });
    expect(ready.find((a) => a.id === 'bill')).toMatchObject({ label: 'Request bill', done: false });
    const asked = buildDialActions({ ...ctx, billReady: true, billRequested: true });
    expect(asked.find((a) => a.id === 'bill')).toMatchObject({ label: 'Bill requested', done: true });
  });

  it('drops the bill after settlement and adds venue services when there are some', () => {
    const ids = buildDialActions({ ...ctx, billReady: true, settled: true, hasServices: true }).map((a) => a.id);
    expect(ids).not.toContain('bill');
    expect(ids).toContain('services');
  });
});

describe('category sections', () => {
  it('matches a category by its lower-cased name and gives it a stable element id', () => {
    expect(categoryKey('  Dals & Lentils ')).toBe('dals & lentils');
    expect(sectionId('Dals & Lentils')).toBe('menu-cat-dals-lentils');
    expect(sectionId('Pav Bhaji')).toBe('menu-cat-pav-bhaji');
  });
});

describe('bill lines', () => {
  it('never prints NaN: a missing quantity or price becomes one and zero', () => {
    const [line] = normalizeBillItems([{ name: 'Tea' }]);
    expect(line).toMatchObject({ itemName: 'Tea', quantity: 1, unitPrice: 0, lineTotal: 0 });
  });

  it('reads the quantity and price from any of the shapes the API sends', () => {
    const lines = normalizeBillItems([{ item_name: 'Puri', qty: 2, unit_price: 40 }, { title: 'Lassi', quantity: 3, price: '30' }]);
    expect(lines.map((l) => l.lineTotal)).toEqual([80, 90]);
  });
});
