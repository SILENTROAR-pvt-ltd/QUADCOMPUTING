import { resolveGuestIdentity, type GuestIdentity } from './guest-identity.util';
import { normaliseBill } from './z-report-sales.util';

export interface WalletTxRow { order_id: string | null; guest_id: string | null; transaction_type: string; amount: number | string }
export interface SessionRow { id: string; guest_handle?: string | null }

export interface LedgerOrder {
  id: string;
  created_at: string;
  status: string;
  payment_method: string | null;
  table_number: string | null;
  invoice_number: string | null;
  items: unknown[];
  subtotal: number;
  discount_type: string | null;
  discount_value: number;
  discount_amount: number;
  tax_amount: number;
  grand_total: number;
  guest: GuestIdentity;
  wallet: { redeemed: number; cashback: number };
}

const num = (v: unknown) => Number(v) || 0;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** One row per bill with the guest resolved and the wallet credit it used and earned. */
export function buildLedger(orders: any[], sessions: SessionRow[], walletTx: WalletTxRow[]): LedgerOrder[] {
  const handleBySession = new Map(sessions.map((s) => [s.id, s.guest_handle || null]));
  const txByOrder = new Map<string, WalletTxRow[]>();
  for (const tx of walletTx) {
    if (!tx.order_id) continue;
    txByOrder.set(tx.order_id, [...(txByOrder.get(tx.order_id) || []), tx]);
  }

  return orders.map(normaliseBill).map((o) => {
    const txs = txByOrder.get(o.id) || [];
    const sum = (type: string) => round2(txs.filter((t) => t.transaction_type === type).reduce((a, t) => a + Math.abs(num(t.amount)), 0));
    const guest = resolveGuestIdentity(o, handleBySession.get(o.session_id), ...txs.map((t) => t.guest_id));
    return {
      id: o.id,
      created_at: o.created_at,
      status: String(o.status || '').toLowerCase(),
      payment_method: o.payment_method || null,
      table_number: o.table_number || null,
      invoice_number: o.invoice_number || null,
      items: Array.isArray(o.items) ? o.items : [],
      subtotal: num(o.subtotal),
      discount_type: o.discount_type || null,
      discount_value: num(o.discount_value),
      discount_amount: num(o.discount_amount),
      tax_amount: num(o.tax_amount),
      grand_total: num(o.grand_total),
      guest,
      wallet: { redeemed: sum('REDEMPTION'), cashback: sum('CASHBACK') },
    };
  });
}
