import { describe, expect, it } from 'vitest';
import { generateSlots, weekdayOf, todayIst } from './venue-hours.service';
import { createReservation, listTablesForSlot, validateReservationInput, ReservationError } from './reservations.service';

const base = { guestName: 'Asha', guestPhone: '98765 43210', partySize: 2, reservedDate: '2999-01-01', reservedTime: '19:00' };

function fakeDb(opts: { tables?: any[]; booked?: any[]; rpc?: { data?: any; error?: { message: string } | null } } = {}) {
  const rows = (r: any[]) => {
    const chain: any = {
      select: () => chain, eq: () => chain, order: () => chain, in: () => chain, gte: () => chain, limit: () => chain,
      then: (resolve: any) => Promise.resolve({ data: r, error: null }).then(resolve),
    };
    return chain;
  };
  return {
    from: (table: string) => rows(table === 'restaurant_tables' ? opts.tables ?? [] : opts.booked ?? []),
    rpc: async () => ({ data: opts.rpc?.data ?? null, error: opts.rpc?.error ?? null }),
  };
}

describe('opening hours', () => {
  it('offers an hourly slot from opening until the last full hour before close', () => {
    const slots = generateSlots('10:00', '22:00');
    expect(slots[0]).toBe('10:00');
    expect(slots.at(-1)).toBe('21:00');
    expect(slots).toHaveLength(12);
  });

  it('a window of one hour offers exactly one slot', () => {
    expect(generateSlots('09:00', '10:00')).toEqual(['09:00']);
  });

  it('reads the weekday from the calendar date, whatever the server timezone', () => {
    expect(weekdayOf('2026-10-16')).toBe(5); // Friday
    expect(weekdayOf('2026-10-18')).toBe(0); // Sunday
  });

  it('today is the India date, not UTC', () => {
    const at = new Date('2026-10-16T19:00:00Z'); // 00:30 IST on the 17th
    expect(todayIst(at)).toBe('2026-10-17');
  });
});

describe('reservation input', () => {
  it('accepts a complete request for a future date', () => {
    expect(validateReservationInput(base)).toBeNull();
  });

  it('rejects a blank name, a bad phone, a bad party size, a bad slot and a past date', () => {
    expect(validateReservationInput({ ...base, guestName: '   ' })).toMatch(/Name/);
    expect(validateReservationInput({ ...base, guestPhone: '12' })).toMatch(/phone/);
    expect(validateReservationInput({ ...base, partySize: 0 })).toMatch(/Party size/);
    expect(validateReservationInput({ ...base, partySize: 2.5 })).toMatch(/Party size/);
    expect(validateReservationInput({ ...base, reservedTime: '7pm' })).toMatch(/slot/);
    expect(validateReservationInput({ ...base, reservedDate: '2000-01-01' })).toMatch(/future/);
  });
});

describe('booking a table', () => {
  it('returns the booked reservation with its table', async () => {
    const db = fakeDb({ rpc: { data: { id: 'r1', business_id: 'b', table_number: 'T-04', guest_name: 'Asha', guest_phone: '98765 43210', party_size: 2, reserved_date: '2999-01-01', reserved_time: '19:00:00', status: 'requested', notes: null, created_at: 'now' } } });
    const r = await createReservation(db, 'b', base);
    expect(r).toMatchObject({ id: 'r1', tableNumber: 'T-04', reservedTime: '19:00', status: 'requested', notes: '' });
  });

  it('maps a database conflict to a readable error with its code', async () => {
    const db = fakeDb({ rpc: { error: { message: 'ERROR: SLOT_FULL' } } });
    await expect(createReservation(db, 'b', base)).rejects.toMatchObject({ code: 'SLOT_FULL', message: expect.stringContaining('No table is free') });
  });

  it('an unknown database failure is reported generically', async () => {
    const db = fakeDb({ rpc: { error: { message: 'connection reset' } } });
    const err = await createReservation(db, 'b', base).catch((e) => e);
    expect(err).toBeInstanceOf(ReservationError);
    expect(err.code).toBe('FAILED');
  });

  it('refuses invalid input before touching the database', async () => {
    await expect(createReservation(fakeDb(), 'b', { ...base, partySize: 99 })).rejects.toMatchObject({ code: 'INVALID' });
  });
});

describe('table availability for a slot', () => {
  const tables = [
    { id: 't1', table_number: 'T-01', seating_capacity: 2 },
    { id: 't2', table_number: 'T-02', seating_capacity: 4 },
    { id: 't3', table_number: 'T-03', seating_capacity: 6 },
  ];

  it('marks a table taken only when a live booking holds it for that slot', async () => {
    const options = await listTablesForSlot(fakeDb({ tables, booked: [{ table_id: 't2' }] }), 'b', '2999-01-01', '19:00');
    expect(options.map((o) => [o.label, o.free])).toEqual([['T-01', true], ['T-02', false], ['T-03', true]]);
    expect(options[0]).toMatchObject({ seats: 2, label: 'T-01' });
  });

  it('lists every active table as free when nothing is booked', async () => {
    const options = await listTablesForSlot(fakeDb({ tables }), 'b', '2999-01-01', '20:00');
    expect(options.every((o) => o.free)).toBe(true);
  });
});
