import { describe, it, expect } from 'vitest';
import { tableVisualState, latestSettledByTable, normalizeTableNumber, SETTLED_WINDOW_MS } from '@/lib/utils/live-table-state';
import { mapVoidError } from '@/lib/services/session/void-line.service';

const NOW = Date.parse('2026-10-08T14:00:00Z');
const live = { status: 'OCCUPIED', activeSession: { status: 'open', grandTotal: 240, subtotal: 200, itemsCount: 2 } };

describe('Live tables: what each table is doing', () => {
  it('shows a table with an order as live, and one that asked for the bill as bill requested', () => {
    expect(tableVisualState(live, null, NOW)).toBe('live');
    expect(tableVisualState({ ...live, activeSession: { ...live.activeSession, status: 'bill_requested' } }, null, NOW)).toBe('bill_requested');
  });

  it('shows an occupied table with no order yet as occupied, and a recently paid table as settled', () => {
    expect(tableVisualState({ status: 'OCCUPIED', activeSession: null }, null, NOW)).toBe('occupied');
    expect(tableVisualState({ status: 'VACANT' }, NOW - 5 * 60_000, NOW)).toBe('settled');
  });

  it('turns a settled table back to vacant once the window has passed, or when nothing was settled', () => {
    expect(tableVisualState({ status: 'VACANT' }, NOW - SETTLED_WINDOW_MS - 1, NOW)).toBe('vacant');
    expect(tableVisualState({ status: 'VACANT', activeSession: null }, null, NOW)).toBe('vacant');
  });
});

describe('Live tables: matching names and settled bills', () => {
  it('treats T-01, Table 1 and t-01 as the same table', () => {
    expect(normalizeTableNumber('T-01')).toBe('01');
    expect(normalizeTableNumber('Table 01')).toBe('01');
    expect(normalizeTableNumber('t-01')).toBe('01');
  });

  it('keeps only the latest settled bill for each table', () => {
    const settled = latestSettledByTable([
      { table_number: 'T-01', status: 'settled', updated_at: '2026-10-08T12:00:00Z' },
      { table_number: 'T-01', status: 'SETTLED', created_at: '2026-10-08T13:30:00Z' },
      { table_number: 'T-02', status: 'open', created_at: '2026-10-08T13:30:00Z' },
    ]);
    expect(settled.get('01')).toBe(Date.parse('2026-10-08T13:30:00Z'));
    expect(settled.has('02')).toBe(false);
  });
});

describe('Live tables: removing a line', () => {
  it('explains why a line cannot be removed, in words a host can act on', () => {
    expect(mapVoidError('LINE_STARTED')).toMatchObject({ status: 409 });
    expect(mapVoidError('ORDER_CLOSED')).toMatchObject({ status: 409 });
    expect(mapVoidError('LINE_NOT_FOUND')).toMatchObject({ status: 404 });
    expect(mapVoidError('something unexpected')).toMatchObject({ status: 500 });
  });
});
