// Everything the desk can know about one past stay, from its log: the guest as registered, the invoice the checkout
// issued, the room-service orders settled with it, what was paid in advance, and the cashback the guest earned.

const HOUR = 3600_000;

export interface StayOrder {
  id: string; order_type: string; status: string; created_at: string; grand_total: number; subtotal: number; tax_amount: number;
  payment_method: string | null; invoice_number: string | null; guest_handle: string | null;
  items: Array<{ name: string; qty: number; price: number; notes?: string | null; type?: string }>;
}

export interface StayDetail {
  stay: any;
  room: { id: string; room_number: string; category: { id: string; name: string; price: number } | null } | null;
  /** The stay's tax invoice (the room_stay order), or null for a stay closed without one. */
  invoice: StayOrder | null;
  /** Room payments taken before checkout: the reservation's room bill, a late check-out fee. */
  advances: StayOrder[];
  /** Food and drinks charged to the room during the stay. */
  orders: StayOrder[];
  cashback: { amount: number; handle: string } | null;
}

const num = (v: unknown) => Number(v) || 0;

function toOrder(o: any): StayOrder {
  const items = Array.isArray(o.items) ? o.items : [];
  return {
    id: o.id, order_type: o.order_type || 'dine_in', status: String(o.status || ''), created_at: o.created_at, grand_total: num(o.grand_total ?? o.total_amount),
    subtotal: num(o.subtotal), tax_amount: num(o.tax_amount), payment_method: o.payment_method || null, invoice_number: o.invoice_number || null,
    guest_handle: o.guest_handle || null,
    items: items.map((i: any) => ({ name: i.name || i.item_name || 'Item', qty: num(i.qty ?? i.quantity) || 1, price: num(i.price), notes: i.notes || null, type: i.type })),
  };
}

/** The stay log with its room, or null when it is not this venue's. `ledgerDb` reads the wallet (a server-only table). */
export async function loadStayDetail(db: any, ledgerDb: any, businessId: string, logId: string): Promise<StayDetail | null> {
  const { data: stay, error } = await db.from('room_stay_logs')
    .select('*, room:rooms(id, room_number, category:room_categories(id, name, price))')
    .eq('id', logId).eq('business_id', businessId).maybeSingle();
  if (error) throw error;
  if (!stay) return null;

  const start = Date.parse(stay.check_in_time) || Date.now();
  const end = stay.check_out_time ? Date.parse(stay.check_out_time) : Date.now();
  // The reservation's room bill is taken before the guest arrives; the food comes once the stay has begun.
  const { data: rows, error: ordErr } = await db.from('orders').select('*')
    .eq('business_id', businessId).eq('room_id', stay.room_id)
    .gte('created_at', new Date(start - 24 * HOUR).toISOString()).lte('created_at', new Date(end + HOUR / 6).toISOString())
    .order('created_at', { ascending: true });
  if (ordErr) throw ordErr;
  const all: StayOrder[] = (rows || []).map(toOrder);
  const stays = all.filter((o) => o.order_type === 'room_stay');
  const invoice = stays.length ? stays[stays.length - 1] : null;
  const advances = all.filter((o) => o.order_type === 'room_advance');
  const orders = all.filter((o) => o.order_type !== 'room_stay' && o.order_type !== 'room_advance' && Date.parse(o.created_at) >= start - 60_000);

  let cashback: StayDetail['cashback'] = null;
  if (invoice) {
    const { data: tx } = await ledgerDb.from('wallet_transactions').select('amount, guest_id')
      .eq('order_id', invoice.id).eq('transaction_type', 'CASHBACK').limit(1).maybeSingle();
    if (tx) cashback = { amount: num(tx.amount), handle: String(tx.guest_id || '') };
  }
  const { room, ...log } = stay;
  return { stay: log, room: room || null, invoice, advances, orders, cashback };
}
