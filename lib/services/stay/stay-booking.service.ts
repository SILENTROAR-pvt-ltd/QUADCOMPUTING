import { todayIst } from '@/lib/services/reservations/venue-hours.service';
import { categoryAvailability } from './stay-availability.service';
import { newConfirmationCode } from './booking-code';

// An advance booking from the public showcase: pay on arrival, confirmed at once when the category has a free room
// for every night, and kept under a short code the guest shows at the desk.

export type StayBookingCode = 'INVALID' | 'NOT_FOUND' | 'NO_AVAILABILITY' | 'FAILED';
export class StayBookingError extends Error {
  constructor(public code: StayBookingCode, message: string) { super(message); }
}

export interface StayBookingInput {
  categoryId: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  checkIn: string;
  checkOut: string;
  guests: number;
  note?: string | null;
  /** 'standard', 'late', or 'early:<option id>'; the route checks it against the owner's options. */
  expectedArrival?: string | null;
  /** The Vibers ID the guest was signed in with, when they were. */
  guestAccountId?: string | null;
}

/** What a signed-in guest's account supplies to a reservation: who they are, and the mobile the browser never sees. */
export interface BookingAccount { id: string; display_name: string; phone: string | null }

export const MAX_NIGHTS = 30;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PHONE = /^[0-9]{10}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY_MS = 86_400_000;

export const nightsBetween = (checkIn: string, checkOut: string) =>
  Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / DAY_MS);

/** Why the booking cannot be taken, or null. Dates are India calendar dates. */
export function validateStayBooking(i: StayBookingInput, today = todayIst()): string | null {
  if (!UUID.test(i.categoryId || '')) return 'Choose a room type.';
  if (!i.guestName || i.guestName.trim().length < 2 || i.guestName.length > 60) return 'Enter the guest name.';
  if (!PHONE.test(i.guestPhone || '')) return 'Enter a 10-digit mobile number.';
  if (i.guestEmail && !EMAIL.test(i.guestEmail)) return 'That email address does not look right.';
  if (!DATE.test(i.checkIn) || !DATE.test(i.checkOut)) return 'Choose check-in and check-out dates.';
  if (i.checkIn < today) return 'Check-in cannot be in the past.';
  const nights = nightsBetween(i.checkIn, i.checkOut);
  if (!Number.isFinite(nights) || nights < 1) return 'Check-out must be after check-in.';
  if (nights > MAX_NIGHTS) return `Stays are booked for up to ${MAX_NIGHTS} nights at a time.`;
  if (!Number.isInteger(i.guests) || i.guests < 1 || i.guests > 20) return 'How many guests are staying?';
  if (i.note && i.note.length > 300) return 'Keep the note under 300 characters.';
  return null;
}

/**
 * Reads a request body into a booking input, trimming text and coercing numbers; validation is separate. A signed-in
 * guest's account fills in whatever they left blank: their name, and the mobile number the browser only ever sees masked.
 */
export function readStayBookingInput(body: any, account: BookingAccount | null = null): StayBookingInput {
  const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
  return {
    categoryId: text(body?.category_id, 40),
    guestName: text(body?.guest_name, 60) || text(account?.display_name, 60),
    guestPhone: String(body?.guest_phone ?? '').replace(/\D/g, '').slice(-10) || String(account?.phone ?? '').replace(/\D/g, '').slice(-10),
    guestEmail: text(body?.guest_email, 120) || null,
    checkIn: text(body?.check_in, 10),
    checkOut: text(body?.check_out, 10),
    guests: Number(body?.guests),
    note: text(body?.note, 300) || null,
    expectedArrival: text(body?.expected_arrival, 40) || null,
    guestAccountId: account?.id || null,
  };
}

export async function createStayBooking(db: any, businessId: string, input: StayBookingInput, today = todayIst(), source: 'web' | 'desk' = 'web') {
  const invalid = validateStayBooking(input, today);
  if (invalid) throw new StayBookingError('INVALID', invalid);

  const { data: category, error: catErr } = await db.from('room_categories').select('id, name, price, occupancy')
    .eq('id', input.categoryId).eq('business_id', businessId).maybeSingle();
  if (catErr) throw new StayBookingError('FAILED', 'Could not read the room type.');
  if (!category) throw new StayBookingError('NOT_FOUND', 'That room type is not offered here.');

  const availability = await categoryAvailability(db, businessId, category.id, input.checkIn, input.checkOut);
  if (availability.available < 1) {
    throw new StayBookingError('NO_AVAILABILITY', `${category.name} is fully booked for those dates.`);
  }

  const row = {
    business_id: businessId, category_id: category.id, check_in: input.checkIn, check_out: input.checkOut,
    guests: input.guests, guest_name: input.guestName.trim(), guest_phone: input.guestPhone, guest_email: input.guestEmail,
    note: input.note, status: 'confirmed', source, expected_arrival: input.expectedArrival || 'standard',
    guest_account_id: input.guestAccountId || null,
  };
  // The code is unique; on the rare collision a new one is drawn.
  for (let attempt = 0; attempt < 3; attempt++) {
    const confirmation_code = newConfirmationCode();
    const { data, error } = await db.from('stay_booking_requests').insert({ ...row, confirmation_code }).select().maybeSingle();
    if (!error && data) return { booking: data, code: confirmation_code, category, nights: nightsBetween(input.checkIn, input.checkOut) };
    if (error?.code !== '23505') throw new StayBookingError('FAILED', 'The booking could not be saved. Please try again.');
  }
  throw new StayBookingError('FAILED', 'The booking could not be saved. Please try again.');
}
