import { policyFee, readPolicies } from './stay-policy';
import { categoryAvailability } from './stay-availability.service';

// Late check-out as the guest sees it: the owner's options priced for this room, the check-out time now, where their
// request stands, and whether the room is free after them. The fee is computed here from the room's rate, never taken
// from the page.

export function lateCheckoutView(room: any, business: any, available = true) {
  const rate = Number(room.category?.price) || 0;
  const req = room.late_checkout_request && typeof room.late_checkout_request === 'object' ? room.late_checkout_request : null;
  return {
    current: room.check_out_time || room.check_out_date || null,
    options: readPolicies(business.stay_policies).late_checkout.map((o) => ({ id: o.id, label: o.label, time: o.time, fee: policyFee(o, rate) })),
    request: req ? { status: req.status === 'declined' ? 'declined' : 'pending', label: String(req.label || ''), fee: Number(req.fee) || 0 } : null,
    // False when another guest is due in a room of this type on the check-out day: the desk then cannot promise the time.
    available,
  };
}

/**
 * Whether a room of this type is free for the night after the guest's check-out, so a late check-out can be offered:
 * the rooms of the type, less the reservations due that night, less the guests still in (this room's own guest leaves
 * that day, so their room counts as free). No check-out date or no type: offered, the desk decides.
 */
export async function lateCheckoutAvailable(db: any, businessId: string, room: any): Promise<boolean> {
  const out = String(room.check_out_time || room.check_out_date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(out) || !room.category_id) return true;
  const next = new Date(`${out}T00:00:00Z`); next.setUTCDate(next.getUTCDate() + 1);
  const a = await categoryAvailability(db, businessId, room.category_id, out, next.toISOString().slice(0, 10));
  return a.available >= 1;
}
