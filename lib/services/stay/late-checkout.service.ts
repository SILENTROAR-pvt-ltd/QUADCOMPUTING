import { findOption, istInstant, policyFee, type StayPolicies } from './stay-policy';
import { extraLineId, readExtras, type ExtraLine } from './stay-ledger';
import { readTender, StayPassError } from './stay-pass.service';

// Late check-out: the owner's options, answered by the desk. Granting moves the room's check-out time (so the front
// desk's "due out" and overdue flags follow), adds the fee as a line on the final bill, and, because the guest pays it
// now the way any room payment is paid, credits it as an advance so checkout does not charge it twice.

const istDate = (iso: string) => new Date(new Date(iso).getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);

export interface GrantInput { optionId?: string | null; paymentMethod?: string; paymentReference?: string | null }

/** What granting would do, checked but not written: the desk shows this before taking any money. */
export async function planLateCheckout(db: any, businessId: string, roomId: string, input: Pick<GrantInput, 'optionId'>, policies: StayPolicies, now = new Date()) {
  const { data: room, error } = await db.from('rooms').select('*, category:room_categories(id, name, price)').eq('id', roomId).eq('business_id', businessId).maybeSingle();
  if (error) throw new StayPassError('FAILED', 'Could not read the room.');
  if (!room) throw new StayPassError('NOT_FOUND', 'Room not found.');
  if (String(room.status).toUpperCase() !== 'OCCUPIED') throw new StayPassError('CONFLICT', 'There is no guest checked in to this room.');

  const optionId = input.optionId || room.late_checkout_request?.option_id;
  const option = findOption(policies, 'late_checkout', optionId);
  if (!option) throw new StayPassError('INVALID', 'Choose a late check-out option.');

  const currentOut = room.check_out_time || room.check_out_date || now.toISOString();
  const day = istDate(currentOut);
  const until = istInstant(day, option.time);
  if (Date.parse(until) <= Date.parse(currentOut)) throw new StayPassError('INVALID', 'The guest already has a check-out at or after that time.');

  const lineId = extraLineId('late_checkout', `${day}${option.id}`);
  const extras = readExtras(room.stay_extras);
  if (extras.some((e) => e.id === lineId)) throw new StayPassError('CONFLICT', 'This late check-out was already granted.');

  const fee = policyFee(option, Number(room.category?.price) || 0);
  const line: ExtraLine = { id: lineId, name: option.label, price: fee, qty: 1, notes: `Check-out moved to ${option.time}`, type: 'late_checkout' };
  return { room, option, until, fee, line, extras };
}

export async function grantLateCheckout(db: any, businessId: string, roomId: string, input: GrantInput, policies: StayPolicies, now = new Date()) {
  const { room, until, fee, line, extras, option } = await planLateCheckout(db, businessId, roomId, input, policies, now);
  const pay = fee > 0 ? readTender(input.paymentMethod, input.paymentReference) : null;
  let billId: string | null = null;
  if (pay) {
    const { data: bill, error: billErr } = await db.from('orders').insert({
      business_id: businessId, room_id: roomId, order_type: 'room_advance', order_source: 'POS', status: 'SETTLED', table_number: `ADV R${room.room_number}`.slice(0, 12),
      customer_name: room.guest_name || 'Guest', customer_phone: room.guest_phone || '', items: [line], subtotal: fee, grand_total: fee, total_amount: fee, payment_method: pay.tender,
    }).select('id').maybeSingle();
    if (billErr || !bill) throw new StayPassError('FAILED', 'The bill could not be saved. Nothing was changed; please try again.');
    billId = bill.id;
  }

  const { data: updated, error: updErr } = await db.from('rooms').update({
    check_out_date: until, check_out_time: until, advance_paid: (Number(room.advance_paid) || 0) + fee, stay_extras: [...extras, line], late_checkout_request: null,
  }).eq('id', roomId).eq('business_id', businessId).eq('status', 'OCCUPIED').select('id, check_out_time').maybeSingle();
  if (updErr || !updated) {
    if (billId) await db.from('orders').delete().eq('id', billId).eq('business_id', businessId);
    throw new StayPassError('FAILED', 'The room could not be updated. Nothing was charged; please try again.');
  }
  return { until, fee, label: option.label, billId, roomNumber: room.room_number, guestName: room.guest_name as string | null, tender: pay?.tender || null, reference: pay?.reference || null };
}

/** The desk says no. The guest's page shows it, and they may ask again. */
export async function declineLateCheckout(db: any, businessId: string, roomId: string) {
  const { data: room } = await db.from('rooms').select('late_checkout_request, status').eq('id', roomId).eq('business_id', businessId).maybeSingle();
  if (!room?.late_checkout_request) throw new StayPassError('NOT_FOUND', 'There is no late check-out request to decline.');
  const { error } = await db.from('rooms').update({ late_checkout_request: { ...room.late_checkout_request, status: 'declined' } }).eq('id', roomId).eq('business_id', businessId).eq('status', 'OCCUPIED');
  if (error) throw new StayPassError('FAILED', 'Could not save that. Please try again.');
}
