import { readTender, StayPassError } from './stay-pass.service';
import { roomFolio } from './room-folio.service';
import { readCashTender } from '@/lib/services/billing/cash-tender';

// A payment taken during the stay: the room at check-in ("pay now"), or the running bill when the guest asks to settle
// before leaving. Recorded like any room payment (a settled room_advance bill with its tender) and carried on the room
// as advance_paid, so the guest's bill, the desk's folio and checkout all show it as paid and bill only the balance.

const ROOM_SELECT = '*, category:room_categories(id, name, price)';

/** What the guest owes right now, as the desk sees it before taking money: lines for the receipt, and the balance. */
export async function quoteRoomPayment(db: any, businessId: string, roomId: string) {
  const { data: room, error } = await db.from('rooms').select(ROOM_SELECT).eq('id', roomId).eq('business_id', businessId).maybeSingle();
  if (error) throw new StayPassError('FAILED', 'Could not read the room.');
  if (!room) throw new StayPassError('NOT_FOUND', 'Room not found.');
  if (String(room.status).toUpperCase() !== 'OCCUPIED') throw new StayPassError('CONFLICT', 'There is no guest checked in to this room.');
  const folio = await roomFolio(db, businessId, room);
  const lines = [
    ...folio.lines.map((l) => ({ id: l.id, name: l.name, price: l.price, qty: l.qty, notes: l.notes })),
    ...(folio.dining_total > 0 ? [{ id: 'dining', name: `Food & drinks to the room (${folio.orders.length})`, price: folio.dining_total, qty: 1 }] : []),
    ...(folio.advance_paid > 0 ? [{ id: 'paid', name: 'Paid so far', price: -folio.advance_paid, qty: 1 }] : []),
  ];
  return { room, amount: folio.balance, lines, paidSoFar: folio.advance_total, gross: folio.total };
}

export interface RoomPaymentInput {
  amount?: unknown; paymentMethod?: unknown; paymentReference?: unknown; purpose?: unknown;
  /** 'till': the POS receipt, where UPI is confirmed with a tick and carries no reference. */
  source?: 'desk' | 'till';
  /** Cash handed over, when more than the amount: the change is recorded with the bill. */
  cashTendered?: unknown;
}

/**
 * Takes the money: a settled bill for the amount, then the room's advance raised by it, conditional on the room still
 * being occupied. Clears the guest's "pay now" request. A failed room update removes the bill, so nothing is charged twice.
 */
export async function recordRoomPayment(db: any, businessId: string, roomId: string, input: RoomPaymentInput, now = new Date()) {
  const { tender, reference } = readTender(input.paymentMethod, input.paymentReference, { referenceOptional: input.source === 'till' });
  const q = await quoteRoomPayment(db, businessId, roomId);
  const asked = Number(input.amount);
  const amount = Number.isFinite(asked) && asked > 0 ? Math.round(asked * 100) / 100 : q.amount;
  if (amount <= 0) throw new StayPassError('INVALID', 'There is nothing to collect right now.');
  if (amount > q.amount + 0.01) throw new StayPassError('INVALID', `The guest owes ₹${q.amount.toLocaleString('en-IN')} right now; a larger amount cannot be taken.`);

  const cash = readCashTender(tender, amount, input.cashTendered);
  if (cash.error) throw new StayPassError('INVALID', cash.error);

  const purpose = input.purpose === 'stay' ? 'stay' : 'balance';
  const line = { id: `payment-${now.getTime()}`, name: purpose === 'stay' ? `Room payment · Room ${q.room.room_number}` : `Payment on account · Room ${q.room.room_number}`, price: amount, qty: 1, notes: `Taken during the stay${input.source === 'till' ? ' at the till' : ''}, ${now.toISOString().slice(0, 10)}`, type: 'advance' };
  const { data: bill, error: billErr } = await db.from('orders').insert({
    business_id: businessId, room_id: roomId, order_type: 'room_advance', order_source: 'POS', status: 'SETTLED', table_number: `ADV R${q.room.room_number}`.slice(0, 12),
    customer_name: q.room.guest_name || 'Guest', customer_phone: q.room.guest_phone || '', items: [line], subtotal: amount, grand_total: amount, total_amount: amount, payment_method: tender,
    ...(cash.tender ? { cash_tendered: cash.tender.cash_tendered, cash_change: cash.tender.cash_change } : {}),
  }).select('id').maybeSingle();
  if (billErr || !bill) throw new StayPassError('FAILED', 'The bill could not be saved. Nothing was recorded; please try again.');

  const request = q.room.checkout_request && q.room.checkout_request.kind === 'bill' ? null : q.room.checkout_request ?? null;
  const { data: updated, error: updErr } = await db.from('rooms')
    .update({ advance_paid: (Number(q.room.advance_paid) || 0) + amount, checkout_request: request })
    .eq('id', roomId).eq('business_id', businessId).eq('status', 'OCCUPIED').select('id, advance_paid').maybeSingle();
  if (updErr || !updated) {
    await db.from('orders').delete().eq('id', bill.id).eq('business_id', businessId);
    throw new StayPassError('FAILED', 'The room could not be updated. Nothing was charged; please try again.');
  }
  return {
    billId: bill.id as string, amount, tender, reference: reference || null, change: cash.tender?.cash_change ?? null,
    paidSoFar: Number(updated.advance_paid) || 0, balance: Math.max(0, q.amount - amount), roomNumber: q.room.room_number as string,
    guestName: (q.room.guest_name as string) || null, guestPhone: (q.room.guest_phone as string) || null, paidAt: now.toISOString(),
  };
}
