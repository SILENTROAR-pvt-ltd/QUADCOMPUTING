import { passLink, type PassRow } from './stay-pass.service';
import { passToken } from './pass-token';

/** What the desk sees of a pass: everything, including the link to hand the guest. Never sent to a guest page. */
export function hostPassView(pass: PassRow, origin: string, venue: string) {
  const live = pass.status === 'issued';
  return {
    id: pass.id, status: pass.status, booking_id: pass.booking_id, guest_name: pass.guest_name, guest_phone: pass.guest_phone, guests: pass.guests,
    check_in: pass.check_in, check_out: pass.check_out, nights: pass.nights, lines: pass.lines, amount: Number(pass.amount) || 0,
    payment_method: pass.payment_method, payment_reference: pass.payment_reference, paid_at: pass.paid_at, bill_order_id: pass.bill_order_id,
    used_room_id: pass.used_room_id, expires_at: pass.expires_at,
    // The link exists only while the pass can still be used.
    link: live ? passLink(origin, venue, passToken(pass.id, pass.token_version)) : null,
  };
}
