import { billableNights, buildStayFolio, CLOSED_ORDER_STATUSES } from '@/lib/services/accommodation/stay-folio.util';
import { extrasTotal, readExtras, settleLedger } from './stay-ledger';
import { belongsToStay, stayStartMs } from './stay-scope';
import { stayStartedAt } from './room-access.service';

// The guest's running bill and the room's tax invoice, as the in-room page shows them.

/** The stay's running bill: nights so far at the quoted tariff, add-ons, and every unpaid in-room order. */
export async function roomFolio(db: any, businessId: string, room: any) {
  const { data: orders, error } = await db.from('orders').select('id, created_at, status, grand_total, items, order_type, table_number')
    .eq('room_id', room.id).eq('business_id', businessId).not('status', 'in', CLOSED_ORDER_STATUSES).order('created_at', { ascending: false });
  if (error) throw error;
  const startMs = stayStartMs(room);
  const dining = (orders || []).filter((o: any) => o.order_type !== 'room_stay' && belongsToStay(o, startMs));
  // Where the kitchen has each order: its ticket's status, which the menu's tracker reads the same way.
  const tickets = new Map<string, { status: string | null; ticket_number: string | null }>();
  if (dining.length > 0) {
    const { data: rows } = await db.from('kitchen_tickets').select('order_id, status, ticket_number').eq('business_id', businessId).in('order_id', dining.map((o: any) => o.id));
    for (const t of rows || []) if (t.order_id && !tickets.has(t.order_id)) tickets.set(t.order_id, { status: t.status || null, ticket_number: t.ticket_number || null });
  }
  // Billed for the nights booked, or the nights stayed if that is more: leaving early does not shorten the bill.
  const { billed: nights, stayed, booked } = billableNights({ check_in_time: stayStartedAt(room), check_out_time: room.check_out_time, check_out_date: room.check_out_date });
  const folio = buildStayFolio({
    roomId: room.id, roomNumber: room.room_number, categoryName: room.category?.name,
    rate: Number(room.category?.price) || 0, nights, addons: Array.isArray(room.selected_addons) ? room.selected_addons : [],
  });
  const diningTotal = dining.reduce((s: number, o: any) => s + (Number(o.grand_total) || 0), 0);
  // The room was paid before check-in: the guest's bill shows the stay, the advance as a credit, and only the balance
  // (food and drinks added to the room, and any nights beyond those paid) as still to pay.
  const extras = readExtras(room.stay_extras);
  const ledger = settleLedger({ folioTotal: folio.total, extras, diningTotal, advancePaid: Number(room.advance_paid) || 0 });
  return {
    nights,
    nights_stayed: stayed,
    nights_booked: booked,
    tariff_total: folio.tariffTotal,
    addons_total: folio.addonsTotal,
    extras_total: extrasTotal(extras),
    dining_total: diningTotal,
    total: ledger.gross,
    advance_paid: ledger.credit,
    // Everything paid in advance, not only the part that offsets the nights so far: the guest paid for the whole stay.
    advance_total: Number(room.advance_paid) || 0,
    balance: ledger.payable,
    lines: [...folio.lines, ...extras],
    orders: dining.map((o: any) => ({
      id: o.id, created_at: o.created_at, status: o.status, kot_status: tickets.get(o.id)?.status ?? null, ticket_number: tickets.get(o.id)?.ticket_number ?? null, grand_total: Number(o.grand_total) || 0,
      items: (Array.isArray(o.items) ? o.items : []).map((it: any) => ({ name: it.name || it.item_name, qty: Number(it.qty ?? it.quantity ?? 1), price: Number(it.price) || 0 })),
    })),
  };
}

/**
 * The tax invoice for the room, as the desk printed it when the guest paid: the pass that checked this stay in carries
 * the bill's number, lines, amount and tender. Never the phone or the payment reference. Null for a stay the desk
 * checked in without billing through a pass.
 */
export async function roomInvoice(db: any, businessId: string, room: any) {
  const { data, error } = await db.from('stay_passes')
    .select('id, bill_order_id, guest_name, guests, check_in, check_out, nights, lines, amount, payment_method, paid_at, used_at')
    .eq('business_id', businessId).eq('used_room_id', room.id).eq('status', 'used').order('used_at', { ascending: false }).limit(1);
  if (error) throw error;
  const pass = (data || [])[0];
  if (!pass || !belongsToStay({ created_at: pass.used_at || pass.paid_at }, stayStartMs(room))) return null;
  return {
    invoice_id: pass.bill_order_id || null, guest_name: pass.guest_name, guests: pass.guests, check_in: pass.check_in, check_out: pass.check_out,
    nights: pass.nights, lines: Array.isArray(pass.lines) ? pass.lines : [], amount: Number(pass.amount) || 0, payment_method: pass.payment_method, paid_at: pass.paid_at,
  };
}
