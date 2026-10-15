import { describe, it, expect } from 'vitest';
import { normalizeKitchenTicket, normalizeKitchenTickets } from './kitchen-normalize';

describe('kitchen ticket normalising', () => {
  it('turns missing, null or JSON-string items into a list', () => {
    expect(normalizeKitchenTicket({ id: 'a' }).items).toEqual([]);
    expect(normalizeKitchenTicket({ id: 'a', items: null as any }).items).toEqual([]);
    expect(normalizeKitchenTicket({ id: 'a', items: '[{"name":"Tea","qty":2}]' as any }).items).toEqual([{ name: 'Tea', qty: 2 }]);
    expect(normalizeKitchenTicket({ id: 'a', items: 'not json' as any }).items).toEqual([]);
    expect(normalizeKitchenTicket({ id: 'a', items: { name: 'x' } as any }).items).toEqual([]);
  });

  it('drops empty or non-object dish entries, keeps real ones', () => {
    expect(normalizeKitchenTicket({ id: 'a', items: [null, 'x', { name: 'Tea' }] as any }).items).toEqual([{ name: 'Tea' }]);
  });

  it('always gives a status history list', () => {
    expect(normalizeKitchenTicket({ id: 'a', status_history: null as any }).status_history).toEqual([]);
    expect(normalizeKitchenTicket({ id: 'a', status_history: [{ to: 'READY' }] as any }).status_history).toEqual([{ to: 'READY' }]);
  });

  it('keeps the other fields untouched', () => {
    const t = normalizeKitchenTicket({ id: 'a', ticket_number: 'KOT-1', status: 'PENDING' });
    expect(t).toMatchObject({ id: 'a', ticket_number: 'KOT-1', status: 'PENDING' });
  });

  it('a list with a broken row still yields the good tickets', () => {
    const out = normalizeKitchenTickets([null, { items: [] }, { id: 'ok', items: null }, 'x']);
    expect(out.map((t) => t.id)).toEqual(['ok']);
    expect(out[0].items).toEqual([]);
    expect(normalizeKitchenTickets(undefined)).toEqual([]);
    expect(normalizeKitchenTickets({} as any)).toEqual([]);
  });
});
