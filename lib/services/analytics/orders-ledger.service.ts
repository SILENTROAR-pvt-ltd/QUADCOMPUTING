import type { SupabaseClient } from '@supabase/supabase-js';
import { adminDb } from '@/lib/supabase/admin';
import { buildLedger, type LedgerOrder, type SessionRow, type WalletTxRow } from './orders-ledger.util';

export const LEDGER_LIMIT = 500;

const ORDER_COLUMNS = [
  'id', 'created_at', 'status', 'payment_method', 'table_number', 'invoice_number', 'items',
  'subtotal', 'discount_type', 'discount_value', 'discount_amount', 'tax_amount', 'grand_total',
  'customer_name', 'customer_phone', 'guest_name', 'session_id',
].join(', ');

/**
 * Sessions and the wallet ledger are read with the service role, but only for
 * order and session ids that came from the host's own (RLS-scoped) orders query.
 */
async function walletAndSessions(orders: any[]): Promise<{ sessions: SessionRow[]; walletTx: WalletTxRow[] }> {
  const ids = orders.map((o) => o.id);
  const sessionIds = Array.from(new Set(orders.map((o) => o.session_id).filter(Boolean)));
  if (ids.length === 0) return { sessions: [], walletTx: [] };
  const db = adminDb();
  const [sess, tx] = await Promise.all([
    sessionIds.length
      ? db.from('dine_in_sessions').select('id, guest_handle').in('id', sessionIds)
      : Promise.resolve({ data: [], error: null }),
    db.from('wallet_transactions').select('order_id, guest_id, transaction_type, amount').in('order_id', ids),
  ]);
  // A missing handle only changes the printed name, so a failed lookup does not fail the list.
  if (sess.error) console.warn('[orders-ledger] sessions lookup failed', sess.error.message);
  if (tx.error) console.warn('[orders-ledger] wallet lookup failed', tx.error.message);
  return { sessions: (sess.data || []) as SessionRow[], walletTx: (tx.data || []) as WalletTxRow[] };
}

export async function fetchOrdersLedger(
  supabase: SupabaseClient,
  businessId: string,
  startISO: string,
  endISO: string,
): Promise<{ orders: LedgerOrder[]; truncated: boolean }> {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_COLUMNS)
    .eq('business_id', businessId)
    .gte('created_at', startISO)
    .lte('created_at', endISO)
    .order('created_at', { ascending: false })
    .limit(LEDGER_LIMIT);
  if (error) throw error;
  const rows = (data || []) as any[];
  const { sessions, walletTx } = await walletAndSessions(rows);
  return { orders: buildLedger(rows, sessions, walletTx), truncated: rows.length >= LEDGER_LIMIT };
}
