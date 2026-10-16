import { describe, it, expect } from 'vitest';
import type { KitchenTicket } from './kitchen';
import { activeTickets, dishState, kitchenSummary, ticketsForTable } from './table-kitchen';

const ticket = (over: Partial<KitchenTicket>): KitchenTicket => ({
  id: 't1',
  ticket_number: 'KOT-1',
  table_or_room: 'T-01',
  items: [{ name: 'Masala Pav', qty: 1 }],
  status: 'PENDING',
  created_at: '2026-10-16T08:00:00Z',
  ...over,
});

describe('a table\'s kitchen tickets', () => {
  it('matches the same table however it is written', () => {
    const tickets = [ticket({ id: 'a', table_or_room: 'T-01' }), ticket({ id: 'b', table_or_room: 'Table 1' }), ticket({ id: 'c', table_or_room: '1' }), ticket({ id: 'd', table_or_room: 'T-02' })];
    expect(ticketsForTable(tickets, 'T-01').map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('leaves out cancelled tickets, and served ones from another bill', () => {
    const tickets = [
      ticket({ id: 'live', status: 'PREPARING' }),
      ticket({ id: 'cancelled', status: 'CANCELLED' }),
      ticket({ id: 'old', status: 'SERVED', order_id: 'old-order' }),
      ticket({ id: 'mine', status: 'SERVED', order_id: 'this-order' }),
    ];
    expect(ticketsForTable(tickets, 'T-01', 'this-order').map((t) => t.id)).toEqual(['live', 'mine']);
    expect(ticketsForTable(tickets, 'T-01', null).map((t) => t.id)).toEqual(['live']);
  });

  it('lists the oldest ticket first', () => {
    const tickets = [ticket({ id: 'late', created_at: '2026-10-16T09:00:00Z' }), ticket({ id: 'early', created_at: '2026-10-16T08:00:00Z' })];
    expect(ticketsForTable(tickets, 'T-01').map((t) => t.id)).toEqual(['early', 'late']);
  });
});

describe('where a dish is', () => {
  it('follows the ticket, and a ticked dish is ready before the ticket is', () => {
    expect(dishState({ status: 'PENDING' }, {})).toBe('waiting');
    expect(dishState({ status: 'PREPARING' }, {})).toBe('cooking');
    expect(dishState({ status: 'PREPARING' }, { completed: true })).toBe('ready');
    expect(dishState({ status: 'READY' }, {})).toBe('ready');
    expect(dishState({ status: 'SERVED' }, { completed: true })).toBe('served');
  });

  it('counts dishes by state across the tickets', () => {
    const tickets = [
      ticket({ id: 'a', status: 'PREPARING', items: [{ name: 'Pizza', qty: 2 }, { name: 'Pav', qty: 1, completed: true }] }),
      ticket({ id: 'b', status: 'READY', items: [{ name: 'Tea', qty: 3 }] }),
      ticket({ id: 'c', status: 'SERVED', items: [{ name: 'Water', qty: 1 }] }),
    ];
    expect(kitchenSummary(tickets)).toEqual({ waiting: 0, cooking: 2, ready: 4, served: 1, readyDishes: 4, openTickets: 2 });
  });
});

describe('the orders board', () => {
  it('lists only unserved, uncancelled orders, ready first and then oldest first', () => {
    const list = activeTickets([
      ticket({ id: 'served', status: 'SERVED' }),
      ticket({ id: 'gone', status: 'CANCELLED' }),
      ticket({ id: 'new', status: 'PENDING', created_at: '2026-10-16T10:10:00Z' }),
      ticket({ id: 'old', status: 'PENDING', created_at: '2026-10-16T10:00:00Z' }),
      ticket({ id: 'ready', status: 'READY', created_at: '2026-10-16T10:20:00Z' }),
      ticket({ id: 'cooking', status: 'PREPARING', created_at: '2026-10-16T10:30:00Z' }),
    ]).map((t) => t.id);
    expect(list).toEqual(['ready', 'cooking', 'old', 'new']);
  });
});
