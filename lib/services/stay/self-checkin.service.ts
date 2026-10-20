import { checkInFields, type CheckInFields } from '@/lib/services/accommodation/room-guest-fields.util';
import { openStayFolio } from '@/lib/services/accommodation/check-in.service';
import { normalizeConfirmationCode } from './booking-code';

// A guest checking themselves in at the property: the same room record and stay folio the front desk writes
// (room-guest-fields.util, check-in.service), opened by the guest with a vacant room of the type they chose.

export type SelfCheckInCode = 'INVALID' | 'NO_ROOM' | 'NOT_FOUND' | 'FAILED';
export class SelfCheckInError extends Error {
  constructor(public code: SelfCheckInCode, message: string) { super(message); }
}

export interface SelfCheckInInput {
  categoryId?: string | null;
  roomId?: string | null;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  idType?: string | null;
  idNumber?: string | null;
  idProofPath?: string | null;
  totalGuests: number;
  checkOut?: string | null;
  bookingCode?: string | null;
}

export const ROOM_SELECT = '*, category:room_categories(id, name, price, occupancy, photos, amenities, addons, available_addons)';
const PHONE = /^[0-9]{10}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function readSelfCheckInInput(body: any): SelfCheckInInput {
  const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
  return {
    categoryId: text(body?.category_id, 40) || null,
    roomId: text(body?.room_id, 40) || null,
    guestName: text(body?.guest_name, 60),
    guestPhone: String(body?.guest_phone ?? '').replace(/\D/g, '').slice(-10),
    guestEmail: text(body?.guest_email, 120) || null,
    idType: text(body?.id_type, 40) || null,
    idNumber: text(body?.id_number, 40) || null,
    idProofPath: text(body?.id_proof_path, 200) || null,
    totalGuests: Number(body?.total_guests) || 1,
    checkOut: text(body?.check_out, 10) || null,
    bookingCode: normalizeConfirmationCode(body?.booking_code),
  };
}

export function validateSelfCheckIn(i: SelfCheckInInput, today: string): string | null {
  if (!i.guestName || i.guestName.length < 2) return 'Enter the guest name.';
  if (!PHONE.test(i.guestPhone)) return 'Enter a 10-digit mobile number.';
  if (!i.idProofPath && !i.idNumber) return 'A photo of a government ID is required to check in.';
  if (i.idProofPath && !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(i.idProofPath)) return 'The ID photo upload is not valid.';
  if (!i.roomId && !i.categoryId && !i.bookingCode) return 'Choose a room type.';
  if (i.roomId && !UUID.test(i.roomId)) return 'Choose a room.';
  if (i.categoryId && !UUID.test(i.categoryId)) return 'Choose a room type.';
  if (!Number.isInteger(i.totalGuests) || i.totalGuests < 1 || i.totalGuests > 20) return 'How many guests are staying?';
  if (i.checkOut && (!DATE.test(i.checkOut) || i.checkOut <= today)) return 'Expected check-out must be after today.';
  return null;
}

/** Expected check-out at the venue's check-out hour (11:00 India time by default) on the given date. */
export const checkOutIso = (date: string, checkoutTime = '11:00') => new Date(`${date}T${checkoutTime}:00+05:30`).toISOString();

export async function selfCheckIn(db: any, businessId: string, input: SelfCheckInInput, opts: { today: string; checkoutTime?: string; now?: Date }) {
  const invalid = validateSelfCheckIn(input, opts.today);
  if (invalid) throw new SelfCheckInError('INVALID', invalid);
  const nowIso = (opts.now || new Date()).toISOString();

  let booking: any = null;
  if (input.bookingCode) {
    const code = normalizeConfirmationCode(input.bookingCode);
    const { data } = code
      ? await db.from('stay_booking_requests').select('*').eq('business_id', businessId)
        .eq('confirmation_code', code).in('status', ['confirmed', 'requested']).maybeSingle()
      : { data: null };
    if (!data) throw new SelfCheckInError('NOT_FOUND', 'That booking code was not found. Check the code or choose a room type.');
    booking = data;
  }
  const categoryId = input.categoryId || booking?.category_id || null;

  let q = db.from('rooms').select(ROOM_SELECT).eq('business_id', businessId).eq('status', 'VACANT');
  q = input.roomId ? q.eq('id', input.roomId) : q.eq('category_id', categoryId);
  const { data: vacant, error: vacantErr } = await q.order('room_number', { ascending: true }).limit(5);
  if (vacantErr) throw new SelfCheckInError('FAILED', 'Could not read the rooms. Please try again.');
  if (!vacant?.length) throw new SelfCheckInError('NO_ROOM', 'No room of that type is free right now. Please ask at the desk.');

  const checkOutDate = input.checkOut || booking?.check_out || null;
  const fields: CheckInFields = checkInFields({
    guest_name: input.guestName, guest_phone: input.guestPhone, guest_email: input.guestEmail || undefined,
    id_type: input.idType || (input.idProofPath ? 'Photo ID' : undefined), id_number: input.idNumber || undefined,
    check_in_time: nowIso, check_out_time: checkOutDate ? checkOutIso(checkOutDate, opts.checkoutTime) : null,
    total_guests: input.totalGuests, purpose_of_visit: 'Leisure', selected_addons: [],
  }, nowIso);
  const update = { ...fields, checkin_source: booking ? 'booking' : 'self', id_proof_path: input.idProofPath || null, id_verified_at: null };

  // The first vacant room that is still vacant when written wins; another guest may have taken one meanwhile.
  for (const room of vacant) {
    const { data: updated, error } = await db.from('rooms').update(update)
      .eq('id', room.id).eq('business_id', businessId).eq('status', 'VACANT').select(ROOM_SELECT).maybeSingle();
    if (error) throw new SelfCheckInError('FAILED', 'The check-in could not be saved. Please try again.');
    if (!updated) continue;

    let folioWarning: string | null = null;
    try {
      await openStayFolio(db, businessId, updated, fields, { id_proof_path: input.idProofPath || null, checkin_source: update.checkin_source });
    } catch (err) {
      console.error('[self check-in] folio could not be opened', err);
      folioWarning = 'Checked in; the desk will confirm the tariff.';
    }
    if (booking) {
      await db.from('stay_booking_requests').update({ status: 'checked_in', room_id: updated.id, updated_at: nowIso }).eq('id', booking.id);
    }
    return { room: updated, booking, folioWarning };
  }
  throw new SelfCheckInError('NO_ROOM', 'That room was just taken. Please choose another.');
}
