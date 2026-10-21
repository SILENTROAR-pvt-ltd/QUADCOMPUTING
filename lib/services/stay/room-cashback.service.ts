import { billOwner } from '@/lib/services/wallet/bill-owner.util';
import { calculateCashback } from '@/lib/services/wallet/cashback-ledger.util';

// Cashback on food and drinks charged to a room, credited when the stay checks out, by the same rule as a table bill
// (settle-session.service.ts): 7% of each room-service order's subtotal, to the one signed-in guest who ordered every
// dish on it, nothing on an order shared with other guests or with anyone who had no account. The credit is written
// against the stay's invoice, once, ever: a retried checkout finds the ledger entry and leaves the wallet alone, and the
// guest's bills show one room invoice carrying its cashback, not the invoice and each order beside it. The room's
// tariff earns nothing; it was paid at the desk before the stay.

const MISSING_COLUMN = new Set(['42703', 'PGRST204']);

export interface RoomDiningOrder { id: string; subtotal?: number | string | null; grand_total?: number | string | null }
export interface RoomDiningCredit { handle: string; amount: number; orders: string[] }
export interface RoomCashbackResult { credited: RoomDiningCredit[]; total: number; /** The one guest behind every eligible order, or null. */ handle: string | null }

async function creditOne(db: any, p: { businessId: string; roomNumber: string; invoiceOrderId: string; handle: string; amount: number }): Promise<void> {
  const { data: wallet, error: walletErr } = await db.from('guest_wallets').select('id, balance, total_cashback_earned')
    .eq('guest_id', p.handle).eq('business_id', p.businessId).limit(1).maybeSingle();
  if (walletErr) throw walletErr;

  let walletId: string;
  const before = Number(wallet?.balance) || 0;
  if (wallet) {
    const { error } = await db.from('guest_wallets')
      .update({ balance: before + p.amount, total_cashback_earned: (Number(wallet.total_cashback_earned) || 0) + p.amount, updated_at: new Date().toISOString() })
      .eq('id', wallet.id);
    if (error) throw error;
    walletId = wallet.id;
  } else {
    const { data: made, error } = await db.from('guest_wallets')
      .insert({ guest_id: p.handle, business_id: p.businessId, cafe_id: p.businessId, balance: p.amount, total_cashback_earned: p.amount })
      .select('id').maybeSingle();
    if (error || !made) throw error || new Error('wallet not created');
    walletId = made.id;
  }

  const { error: txErr } = await db.from('wallet_transactions').insert({
    wallet_id: walletId, guest_id: p.handle, business_id: p.businessId, cafe_id: p.businessId, table_number: `ROOM ${p.roomNumber}`,
    order_id: p.invoiceOrderId, transaction_type: 'CASHBACK', rate: '7%', amount: p.amount, balance_before: before, balance_after: before + p.amount,
    description: `7% Cashback on Room ${p.roomNumber}`,
  });
  if (txErr) throw txErr;
}

/** Credits the room-service cashback of this stay, against its invoice, to each guest who ordered whole orders. Returns what was credited this time. */
export async function creditRoomDiningCashback(db: any, p: { businessId: string; roomNumber: string; invoiceOrderId: string; orders: RoomDiningOrder[] }): Promise<RoomCashbackResult> {
  const none: RoomCashbackResult = { credited: [], total: 0, handle: null };
  if (p.orders.length === 0) return none;
  const { data: already, error: seenErr } = await db.from('wallet_transactions').select('id').eq('order_id', p.invoiceOrderId).eq('transaction_type', 'CASHBACK').limit(1);
  if (seenErr) throw seenErr;
  if ((already || []).length > 0) return none;

  const byHandle = new Map<string, RoomDiningCredit>();
  for (const order of p.orders) {
    const { data: rows, error } = await db.from('order_items').select('guest_handle').eq('order_id', order.id);
    // Without the ownership column (migration 20261014000002) nobody can be credited: guessing credited the wrong guest.
    if (error) { if (MISSING_COLUMN.has(error.code)) return none; throw error; }
    const owner = billOwner(rows || []);
    const amount = owner.handle ? calculateCashback(Number(order.subtotal) || Number(order.grand_total) || 0) : 0;
    if (!owner.handle || amount <= 0) continue;
    const key = owner.handle.toLowerCase();
    const prev = byHandle.get(key) || { handle: owner.handle, amount: 0, orders: [] };
    byHandle.set(key, { ...prev, amount: Math.round((prev.amount + amount) * 100) / 100, orders: [...prev.orders, order.id] });
  }

  const credited = Array.from(byHandle.values());
  for (const c of credited) await creditOne(db, { businessId: p.businessId, roomNumber: p.roomNumber, invoiceOrderId: p.invoiceOrderId, handle: c.handle, amount: c.amount });
  const total = Math.round(credited.reduce((s, c) => s + c.amount, 0) * 100) / 100;
  return { credited, total, handle: credited.length === 1 ? credited[0].handle : null };
}

/** Marks a bill as the guest's (orders.guest_handle, migration 20261010000017), so their invoices page lists it. Quiet before that migration. */
export async function stampBillOwner(db: any, businessId: string, orderIds: string[], handle: string): Promise<void> {
  if (orderIds.length === 0) return;
  const { error } = await db.from('orders').update({ guest_handle: handle }).in('id', orderIds).eq('business_id', businessId);
  if (error && !MISSING_COLUMN.has(error.code)) console.error('[room cashback] could not stamp the bill owner', error.message);
}
