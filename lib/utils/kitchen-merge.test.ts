import { describe, it, expect } from 'vitest';
import { mergeTicket, mergeTickets } from './kitchen-merge';

const t = (id: string, status: any, items: any[] = [], at = '2026-10-22T11:00:00Z') =>
  ({ id, ticket_number: 'KOT-1', table_or_room: 'T-01', items, status, created_at: at, updated_at: at, status_history: [] }) as any;

describe('merging what a kitchen screen hears', () => {
  it('never moves a ticket back: a ready ticket stays ready when an older read says preparing', () => {
    const shown = { ...t('a', 'READY'), status_history: [{ from: 'PREPARING', to: 'READY', at: 'x' }], updated_at: 'later' };
    const merged = mergeTicket(shown, t('a', 'PREPARING', [{ name: 'Pizza', qty: 3 }]));
    expect(merged.status).toBe('READY');
    expect(merged.status_history).toHaveLength(1);
    expect(merged.updated_at).toBe('later');
    expect(merged.items).toEqual([{ name: 'Pizza', qty: 3 }]);
  });

  it('takes every forward move, and a cancellation', () => {
    expect(mergeTicket(t('a', 'PREPARING'), t('a', 'READY')).status).toBe('READY');
    expect(mergeTicket(t('a', 'READY'), t('a', 'SERVED')).status).toBe('SERVED');
    expect(mergeTicket(t('a', 'READY'), t('a', 'CANCELLED')).status).toBe('CANCELLED');
    expect(mergeTicket(undefined, t('a', 'PENDING')).status).toBe('PENDING');
  });

  it('keeps the very object shown for a ticket that has not changed, so its card does not redraw', () => {
    const shown = t('a', 'READY', [{ name: 'Dal', qty: 1 }]);
    expect(mergeTicket(shown, t('a', 'READY', [{ name: 'Dal', qty: 1 }]))).toBe(shown);
    expect(mergeTicket(shown, t('a', 'READY', [{ name: 'Dal', qty: 2 }]))).not.toBe(shown);
  });

  it('lets the server list decide which tickets exist, and keeps new ones', () => {
    const merged = mergeTickets([t('a', 'READY'), t('gone', 'PENDING')], [t('a', 'PREPARING'), t('new', 'PENDING')]);
    expect(merged.map((x) => [x.id, x.status])).toEqual([['a', 'READY'], ['new', 'PENDING']]);
  });
});
