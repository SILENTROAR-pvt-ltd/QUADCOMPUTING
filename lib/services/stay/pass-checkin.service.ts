import { selfCheckIn, SelfCheckInError, type SelfCheckInInput } from './self-checkin.service';
import { assertPassUsable, claimPass, releasePass, type PassRow } from './stay-pass.service';
import { linkBookingToStay } from './booking-link.service';
import type { ExtraLine } from './stay-ledger';

// A paid guest checking themselves in. The pass fixes everything that was billed (room type, dates, phone, party size),
// so the guest supplies only what the desk could not know: the name as on the ID, the ID itself, and an email.

export interface PassCheckInDetails {
  guestName?: string; guestEmail?: string | null; guests?: number;
  idType?: string | null; idNumber?: string | null; idProofPath?: string | null;
  dpdpConsentAccepted?: boolean; consentTimestamp?: string | null;
  isForeignNational?: boolean; passportNumber?: string | null; visaNumber?: string | null; countryOfOrigin?: string | null; visaExpiryDate?: string | null;
}

/** The pass's fee lines as the stay's extras, so the final bill carries them and the advance nets them out. */
export const extrasFromPass = (pass: Pick<PassRow, 'lines'>): ExtraLine[] =>
  (pass.lines || []).filter((l) => l.type === 'early_checkin').map((l) => ({ id: l.id, name: l.name, price: l.price, qty: l.qty, notes: l.notes, type: 'early_checkin' as const }));

/**
 * The desk is checking in a booking the guest has already paid for: take its pass (so the guest's link stops working
 * and cannot check in a second guest), and return what the room must carry so the advance is credited at checkout.
 * Null when the booking has no live pass (it will be paid at checkout as before).
 */
export async function takePassForDeskCheckIn(db: any, businessId: string, bookingId: string): Promise<{ pass: PassRow; fields: { advance_paid: number; stay_extras: ExtraLine[] } } | null> {
  const { data } = await db.from('stay_passes').select('*').eq('business_id', businessId).eq('booking_id', bookingId).eq('status', 'issued').maybeSingle();
  if (!data) return null;
  await claimPass(db, data.id);
  return { pass: data, fields: { advance_paid: Number(data.amount) || 0, stay_extras: extrasFromPass(data) } };
}

/** The desk check-in went through: tie the pass and its bill to the room. */
export async function finishDeskPass(db: any, businessId: string, pass: PassRow, roomId: string) {
  await db.from('stay_passes').update({ used_room_id: roomId }).eq('id', pass.id);
  if (pass.bill_order_id) await db.from('orders').update({ room_id: roomId }).eq('id', pass.bill_order_id).eq('business_id', businessId);
}

export async function checkInWithPass(db: any, businessId: string, pass: PassRow, d: PassCheckInDetails, opts: { today: string; checkoutTime?: string; now?: Date }) {
  if (pass.business_id !== businessId) throw new SelfCheckInError('NOT_FOUND', 'This check-in link is not valid.');
  assertPassUsable(pass, opts.now);
  await claimPass(db, pass.id, opts.now);

  const input: SelfCheckInInput = {
    categoryId: pass.category_id, roomId: null, guestName: (d.guestName || pass.guest_name).replace(/\s+/g, ' ').trim().slice(0, 60),
    guestPhone: pass.guest_phone, guestEmail: d.guestEmail || pass.guest_email, idType: d.idType || null, idNumber: d.idNumber || null,
    idProofPath: d.idProofPath || null, totalGuests: Number(d.guests) || pass.guests, checkOut: pass.check_out, bookingCode: null,
    dpdpConsentAccepted: d.dpdpConsentAccepted, consentTimestamp: d.consentTimestamp, isForeignNational: d.isForeignNational,
    passportNumber: d.passportNumber, visaNumber: d.visaNumber, countryOfOrigin: d.countryOfOrigin, visaExpiryDate: d.visaExpiryDate,
  };

  let result;
  try {
    result = await selfCheckIn(db, businessId, input, { ...opts, advance: { amount: Number(pass.amount) || 0, extras: extrasFromPass(pass) } });
  } catch (err) {
    await releasePass(db, pass.id);
    throw err;
  }

  const room = result.room;
  await db.from('stay_passes').update({ used_room_id: room.id }).eq('id', pass.id);
  if (pass.bill_order_id) await db.from('orders').update({ room_id: room.id }).eq('id', pass.bill_order_id).eq('business_id', businessId);
  if (pass.booking_id) await linkBookingToStay(db, pass.booking_id, room.id, (opts.now || new Date()).toISOString());
  return { room, folioWarning: result.folioWarning };
}
