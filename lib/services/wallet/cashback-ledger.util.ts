// lib/services/wallet/cashback-ledger.util.ts

export interface CashbackCreditPayload {
  business_id?: string | null;
  cafe_id?: string | null;
  cafe_name?: string | null;
  guest_id: string;
  guest_name?: string | null;
  guest_handle?: string | null;
  customer_phone?: string | null;
  guest_session_id?: string | null;
  order_id?: string | null;
  order_total: number;
  table_number?: string | null;
}

export interface WalletTransactionRecord {
  id: string;
  wallet_id: string;
  guest_id: string;
  cafe_id?: string | null;
  cafe_name?: string | null;
  table_number?: string | null;
  order_id: string | null;
  transaction_type: 'CASHBACK' | 'REDEMPTION' | 'ADJUSTMENT';
  rate: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  created_at: string;
}

export interface GuestWalletRecord {
  id: string;
  guest_id: string;
  business_id: string;
  cafe_id?: string | null;
  cafe_name?: string | null;
  balance: number;
  total_cashback_earned: number;
  updated_at: string;
}

export const inMemoryWallets = new Map<string, GuestWalletRecord>();
export const inMemoryTransactions = new Map<string, WalletTransactionRecord[]>();

export function calculateCashback(orderAmount: number): number {
  if (!orderAmount || orderAmount <= 0) return 0;
  return Math.round(Number(orderAmount) * 0.07 * 100) / 100;
}

export function getOrCreateMemoryWallet(guestId: string, businessId: string, cafeName?: string | null): GuestWalletRecord {
  const key = `${guestId}_${businessId}`;
  let wallet = inMemoryWallets.get(key);
  if (!wallet) {
    wallet = {
      id: `wlt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      guest_id: guestId,
      business_id: businessId,
      cafe_id: businessId,
      cafe_name: cafeName || null,
      balance: 0,
      total_cashback_earned: 0,
      updated_at: new Date().toISOString(),
    };
    inMemoryWallets.set(key, wallet);
  } else if (cafeName && !wallet.cafe_name) {
    wallet.cafe_name = cafeName;
  }
  return wallet;
}

export function recordMemoryTx(walletId: string, tx: WalletTransactionRecord) {
  const txs = inMemoryTransactions.get(walletId) || [];
  inMemoryTransactions.set(walletId, [tx, ...txs]);
}
