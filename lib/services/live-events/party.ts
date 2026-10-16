// A guest's party: how many men, women and others are coming. A venue may give an event a pool of seats and, if it
// wishes, set aside a number of seats for men and for women. A party that would not fit is refused with what is left.
export const MAX_PARTY = 10;

export interface PartyMix { male: number; female: number; other: number }

export type PartyCheck = { ok: true; size: number; mix: PartyMix } | { ok: false; error: string };

const count = (v: unknown) => (Number.isInteger(Number(v)) && Number(v) >= 0 ? Number(v) : NaN);

export function checkParty(input: { male?: unknown; female?: unknown; other?: unknown }): PartyCheck {
  const male = count(input.male ?? 0), female = count(input.female ?? 0), other = count(input.other ?? 0);
  if ([male, female, other].some(Number.isNaN)) return { ok: false, error: 'Each count must be a whole number.' };
  const size = male + female + other;
  if (size < 1) return { ok: false, error: 'Add at least one guest.' };
  if (size > MAX_PARTY) return { ok: false, error: `A party can have up to ${MAX_PARTY} guests.` };
  return { ok: true, size, mix: { male, female, other } };
}

/** What is already booked, as seats: total, and men and women separately. */
export interface Booked { total: number; male: number; female: number }

/** The seats an event has set aside. null = no limit. */
export interface EventSeats { capacity: number | null; male_capacity: number | null; female_capacity: number | null }

export interface SeatsLeft { total: number | null; male: number | null; female: number | null }

/** Seats still free, after everything booked. A gender with no seats set aside draws only on the total pool. */
export function seatsLeft(seats: EventSeats, booked: Booked): SeatsLeft {
  const total = seats.capacity === null ? null : Math.max(0, seats.capacity - booked.total);
  const cap = (own: number | null, used: number) => {
    if (own === null) return total; // no seats set aside for this gender: the pool is its only limit
    return total === null ? Math.max(0, own - used) : Math.min(Math.max(0, own - used), total);
  };
  return { total, male: cap(seats.male_capacity, booked.male), female: cap(seats.female_capacity, booked.female) };
}

/** Whether `mix` fits what is left, and if not, a sentence saying why. */
export function fitsSeats(mix: PartyMix, left: SeatsLeft): { ok: true } | { ok: false; error: string } {
  const size = mix.male + mix.female + mix.other;
  if (left.total !== null && size > left.total) return { ok: false, error: left.total === 0 ? 'This event is full.' : `Only ${left.total} ${left.total === 1 ? 'spot is' : 'spots are'} left for this event.` };
  if (left.male !== null && mix.male > left.male) return { ok: false, error: left.male === 0 ? 'The seats for men are full.' : `Only ${left.male} ${left.male === 1 ? 'seat is' : 'seats are'} left for men.` };
  if (left.female !== null && mix.female > left.female) return { ok: false, error: left.female === 0 ? 'The seats for women are full.' : `Only ${left.female} ${left.female === 1 ? 'seat is' : 'seats are'} left for women.` };
  return { ok: true };
}
