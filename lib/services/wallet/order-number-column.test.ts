import { afterEach, describe, expect, it, vi } from 'vitest';
import { selectOrders, withOrderNumber } from './order-number-column';
import { buildInvoiceRows } from './invoice-history.util';

const BASE = 'id, created_at';

describe('reading the daily order number', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('asks for the order number, and uses the answer', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-18T10:00:00Z'));
    const build = vi.fn(async (columns: string) => ({ data: [{ columns }], error: null }));
    const out = await selectOrders(BASE, build);
    expect(build).toHaveBeenCalledTimes(1);
    expect(build).toHaveBeenCalledWith(`${BASE}, order_number`);
    expect(out.error).toBeNull();
  });

  it('on a database without the column, reads again without it and remembers for a minute', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-18T11:00:00Z'));
    const missing = { code: '42703', message: 'column orders.order_number does not exist' };
    const build = vi.fn(async (columns: string) => (columns.includes('order_number') ? { data: null, error: missing } : { data: [{ id: 'a' }], error: null }));
    const first = await selectOrders(BASE, build);
    expect(first.data).toEqual([{ id: 'a' }]);
    expect(build.mock.calls.map((c) => c[0])).toEqual([`${BASE}, order_number`, BASE]);

    // Within the minute it does not ask again...
    build.mockClear();
    await selectOrders(BASE, build);
    expect(build.mock.calls.map((c) => c[0])).toEqual([BASE]);
    expect(withOrderNumber(BASE)).toBe(BASE);

    // ...and after it, it tries again, so applying the migration takes effect without a restart.
    vi.setSystemTime(new Date('2026-10-18T11:01:30Z'));
    expect(withOrderNumber(BASE)).toBe(`${BASE}, order_number`);
  });

  it('does not hide a different error', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-18T12:00:00Z'));
    const build = vi.fn(async () => ({ data: null, error: { code: '57014', message: 'canceling statement due to timeout' } }));
    const out = await selectOrders(BASE, build);
    expect(build).toHaveBeenCalledTimes(1);
    expect(out.error?.code).toBe('57014');
  });

  it('carries the number onto the invoice row, or null when the order has none', () => {
    const base = { id: '11111111-2222-3333-4444-555555555555', created_at: '2026-10-18T09:00:00Z', status: 'settled', grand_total: 100, table_number: 'T-1' };
    const [a, b] = buildInvoiceRows([{ ...base, order_number: 'ORD-014' }, { ...base, id: '66666666-2222-3333-4444-555555555555' }], [], []);
    expect(a.order_number).toBe('ORD-014');
    expect(b.order_number).toBeNull();
  });
});
