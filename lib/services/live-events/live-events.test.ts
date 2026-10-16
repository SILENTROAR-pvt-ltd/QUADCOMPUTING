import { describe, expect, it } from 'vitest';
import { parseEvent } from './event-input';
import { checkParty, fitsSeats, seatsLeft } from './party';
import { cleanEmail, guestKey, normalizePhone } from './guest-key';
import { leadsToCsv } from './leads-csv';

const START = '2026-11-01T19:30:00.000Z';

describe('publishing an event', () => {
  it('takes a title and a start, and fills the rest with safe defaults', () => {
    const r = parseEvent({ title: '  Sunset   Acoustics ', starts_at: START });
    expect(r).toEqual({ ok: true, value: expect.objectContaining({ title: 'Sunset Acoustics', starts_at: START, category: 'Live Event', entry_fee: 0, perks: [], status: 'LIVE' }) });
  });

  it('refuses a missing title, a bad date, a negative fee and a banner that is not a web address', () => {
    expect(parseEvent({ title: 'x', starts_at: START }).ok).toBe(false);
    expect(parseEvent({ title: 'Jazz night', starts_at: 'soon' }).ok).toBe(false);
    expect(parseEvent({ title: 'Jazz night', starts_at: START, entry_fee: -5 }).ok).toBe(false);
    expect(parseEvent({ title: 'Jazz night', starts_at: START, banner_url: 'javascript:alert(1)' }).ok).toBe(false);
    expect(parseEvent({ title: 'Jazz night', starts_at: START, ends_at: '2026-11-01T18:00:00Z' }).ok).toBe(false);
  });

  it('keeps perks tidy', () => {
    const r = parseEvent({ title: 'DJ night', starts_at: START, perks: 'Free welcome drink, <b>Reserved</b> seating\n' });
    expect(r.ok && r.value.perks).toEqual(['Free welcome drink', 'b Reserved /b seating']);
  });

  it('takes a guest pool with an optional split for men and women', () => {
    const open = parseEvent({ title: 'DJ night', starts_at: START, capacity: 10 });
    expect(open.ok && [open.value.capacity, open.value.male_capacity, open.value.female_capacity]).toEqual([10, null, null]);
    const split = parseEvent({ title: 'DJ night', starts_at: START, capacity: 10, male_capacity: 5, female_capacity: 5 });
    expect(split.ok && [split.value.male_capacity, split.value.female_capacity]).toEqual([5, 5]);
    const partial = parseEvent({ title: 'DJ night', starts_at: START, capacity: 10, male_capacity: 4, female_capacity: null });
    expect(partial.ok && [partial.value.male_capacity, partial.value.female_capacity]).toEqual([4, null]);
  });

  it('refuses a split bigger than the pool, a split with no pool, and bad seat counts', () => {
    expect(parseEvent({ title: 'DJ night', starts_at: START, capacity: 10, male_capacity: 6, female_capacity: 6 }).ok).toBe(false);
    expect(parseEvent({ title: 'DJ night', starts_at: START, male_capacity: 5, female_capacity: 5 }).ok).toBe(false);
    expect(parseEvent({ title: 'DJ night', starts_at: START, capacity: 10, male_capacity: -1 }).ok).toBe(false);
    expect(parseEvent({ title: 'DJ night', starts_at: START, capacity: 10, male_capacity: 2.5 }).ok).toBe(false);
  });

  it('an edit must send the pool and its split together', () => {
    expect(parseEvent({ capacity: 12 }, { partial: true }).ok).toBe(false);
    expect(parseEvent({ capacity: 12, male_capacity: 6, female_capacity: 6 }, { partial: true }).ok).toBe(true);
  });

  it('an edit returns only what was sent, and an empty edit is refused', () => {
    expect(parseEvent({ status: 'cancelled' }, { partial: true })).toEqual({ ok: true, value: { status: 'CANCELLED' } });
    expect(parseEvent({}, { partial: true }).ok).toBe(false);
  });
});

describe('a guest\'s party', () => {
  it('adds up the party', () => {
    expect(checkParty({ male: 5, female: 5 })).toMatchObject({ ok: true, size: 10 });
    expect(checkParty({ male: 2, female: 1, other: 1 })).toMatchObject({ size: 4, mix: { male: 2, female: 1, other: 1 } });
  });

  it('refuses an empty party, more than ten, and counts that are not whole numbers', () => {
    expect(checkParty({}).ok).toBe(false);
    expect(checkParty({ male: 6, female: 5 }).ok).toBe(false);
    expect(checkParty({ male: 1.5, female: 1 }).ok).toBe(false);
    expect(checkParty({ male: -1, female: 3 }).ok).toBe(false);
  });
});

describe('seats for men and women', () => {
  const split = { capacity: 10, male_capacity: 5, female_capacity: 5 };

  it('counts what is left of the pool and of each gender', () => {
    expect(seatsLeft(split, { total: 4, male: 3, female: 1 })).toEqual({ total: 6, male: 2, female: 4 });
    expect(seatsLeft({ capacity: 10, male_capacity: null, female_capacity: null }, { total: 4, male: 3, female: 1 })).toEqual({ total: 6, male: 6, female: 6 });
    expect(seatsLeft({ capacity: null, male_capacity: null, female_capacity: null }, { total: 99, male: 50, female: 49 })).toEqual({ total: null, male: null, female: null });
  });

  it('never offers a gender more than the pool has left, even if its own seats say more', () => {
    expect(seatsLeft(split, { total: 9, male: 0, female: 9 }).male).toBe(1);
  });

  it('refuses a party that does not fit and says which seats are short', () => {
    const left = seatsLeft(split, { total: 4, male: 4, female: 0 });
    expect(fitsSeats({ male: 2, female: 1, other: 0 }, left)).toEqual({ ok: false, error: 'Only 1 seat is left for men.' });
    expect(fitsSeats({ male: 1, female: 2, other: 0 }, left)).toEqual({ ok: true });
    expect(fitsSeats({ male: 0, female: 5, other: 0 }, left)).toEqual({ ok: true });
    expect(fitsSeats({ male: 0, female: 5, other: 2 }, left)).toEqual({ ok: false, error: 'Only 6 spots are left for this event.' });
    expect(fitsSeats({ male: 1, female: 0, other: 0 }, seatsLeft(split, { total: 5, male: 5, female: 0 }))).toEqual({ ok: false, error: 'The seats for men are full.' });
  });

  it('a party of others draws only on the pool, not on either gender\'s seats', () => {
    expect(fitsSeats({ male: 0, female: 0, other: 2 }, seatsLeft(split, { total: 8, male: 4, female: 4 }))).toEqual({ ok: true });
  });
});

describe('who a guest is', () => {
  it('prefers the Vibers handle, then phone, then email, and never invents one for a bare name', () => {
    expect(guestKey({ handle: 'Rahul_K', phone: '9876543210' })).toBe('h:@rahul_k');
    expect(guestKey({ handle: '@Rahul_K' })).toBe('h:@rahul_k');
    expect(guestKey({ phone: '+91 98765-43210' })).toBe('p:9876543210');
    expect(guestKey({ phone: '098765 43210' })).toBe('p:9876543210');
    expect(guestKey({ email: 'Rahul@Example.com' })).toBe('e:rahul@example.com');
    expect(guestKey({})).toBeNull();
    expect(guestKey({ phone: '12345' })).toBeNull();
  });

  it('validates an email and a phone', () => {
    expect(cleanEmail('not an email')).toBeNull();
    expect(normalizePhone('abc')).toBeNull();
  });
});

describe('the lead export', () => {
  const row = { guest_name: '=HYPERLINK("x")', vibers_handle: '@a', email: null, phone: '9876543210', party_size: 2, party_male: 1, party_female: 1, party_other: 0, status: 'INTERESTED', created_at: '2026-10-16T10:00:00Z' };

  it('writes a header and one line per guest', () => {
    const lines = leadsToCsv([row, row]).split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('Guest,Vibers ID,Email,Phone,Party size,Men,Women,Other,Status,Submitted');
  });

  it('keeps a guest-typed formula from running in a spreadsheet', () => {
    expect(leadsToCsv([row]).split('\r\n')[1].startsWith('"\'=HYPERLINK(""x"")"')).toBe(true);
  });
});
