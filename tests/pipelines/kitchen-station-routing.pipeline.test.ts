import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { enabledStations, inferStation, resolveItemStation } from '@/lib/services/kitchen/item-station';
import { createKitchenTicketRecord, stationTicketNumber } from '@/lib/services/kitchen/create-ticket.service';

const ALL = ['Kitchen', 'Bar', 'Grill'] as const;
const NO_BAR = ['Kitchen', 'Grill'];

describe('Kitchen stations: where an item is cooked', () => {
  it('works the station out from the category and name when none is set', () => {
    expect(inferStation({ category: 'Quick Bites', name: 'Misal Pav' })).toBe('Kitchen');
    expect(inferStation({ category: 'Beverages', name: 'Cold Brew' })).toBe('Bar');
    expect(inferStation({ category: 'Chai', name: 'Masala Chai' })).toBe('Bar');
    expect(inferStation({ category: 'Mains', name: 'Chicken Tikka Kebab' })).toBe('Grill');
    expect(inferStation({ category: 'Starters', name: 'Steak Sandwich' })).toBe('Grill');
  });

  it('uses the station set on the catalog item over the guess', () => {
    expect(resolveItemStation({ station: 'Bar', category: 'Starters', name: 'Mocktail' }, ALL)).toBe('Bar');
  });

  it('sends an item to the Kitchen when the venue does not run its station', () => {
    expect(resolveItemStation({ category: 'Beverages', name: 'Cold Brew' }, NO_BAR)).toBe('Kitchen');
    expect(resolveItemStation({ station: 'Bar', name: 'Beer' }, NO_BAR)).toBe('Kitchen');
    expect(resolveItemStation({ category: 'Beverages', name: 'Cold Brew' }, ALL)).toBe('Bar');
  });

  it('treats a venue with no setting as running every station, and always keeps the Kitchen', () => {
    expect(enabledStations(undefined)).toEqual(['Kitchen', 'Bar', 'Grill']);
    expect(enabledStations(['Bar'])).toEqual(['Kitchen', 'Bar']);
    expect(enabledStations(['Grill', 'Kitchen', 'nonsense'])).toEqual(['Kitchen', 'Grill']);
  });
});

describe('Kitchen stations: one ticket per station', () => {
  it('suffixes the ticket number only when an order has more than one station', () => {
    expect(stationTicketNumber('KOT-1234', 'Bar', 1)).toBe('KOT-1234');
    expect(stationTicketNumber('KOT-1234', 'Bar', 2)).toBe('KOT-1234-B');
  });

  it('splits a host order across the stations it has items for', async () => {
    const db = createFakeSupabase({ kitchen_tickets: [] });
    const out = await createKitchenTicketRecord(db, 'biz-1', {
      tableOrRoom: 'T-01',
      items: [
        { name: 'Misal Pav', qty: 1 },
        { name: 'Cold Brew', qty: 2, category: 'Beverages' },
      ],
    }, ['Kitchen', 'Bar', 'Grill']);
    expect(out).toMatchObject({ tickets: expect.any(Array) });
    const stations = db.tables.kitchen_tickets.map((t) => t.station).sort();
    expect(stations).toEqual(['Bar', 'Kitchen']);
    const bar = db.tables.kitchen_tickets.find((t) => t.station === 'Bar')!;
    expect(bar.items).toEqual([{ name: 'Cold Brew', qty: 2, category: 'Beverages', added_by: 'staff' }]);
    expect(bar.ticket_number).toMatch(/-B$/);
  });

  it('keeps one plain ticket when the venue does not run the station', async () => {
    const db = createFakeSupabase({ kitchen_tickets: [] });
    await createKitchenTicketRecord(db, 'biz-1', {
      tableOrRoom: 'T-02',
      items: [{ name: 'Misal Pav', qty: 1 }, { name: 'Cold Brew', qty: 1, category: 'Beverages' }],
    }, NO_BAR);
    expect(db.tables.kitchen_tickets).toHaveLength(1);
    expect(db.tables.kitchen_tickets[0]).toMatchObject({ station: 'Kitchen', items: expect.any(Array) });
    expect(db.tables.kitchen_tickets[0].items).toHaveLength(2);
    expect(db.tables.kitchen_tickets[0].ticket_number).not.toMatch(/-[KBG]$/);
  });
});
