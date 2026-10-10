// What a host sees about a guest's wallet at their own venue, for the billing screen.
// Scoped to one venue: another venue's wallet, ledger or codes are never returned.
// The host is shown the wallet code and the open redemption code so the right wallet is
// matched to the person at the table; a code is only ever applied by the host, through
// /api/host/wallet/redeem, which re-checks it.

export const HANDLE_PATTERN = /^@[a-z0-9_]{2,30}$/;

export interface HostWalletTransaction {
  id: string;
  transaction_type: 'CASHBACK' | 'REDEMPTION' | 'ADJUSTMENT' | string;
  amount: number;
  balance_after: number;
  table_number: string | null;
  created_at: string;
}

export interface HostWalletView {
  guest_handle: string;
  wallet: { id: string; wallet_code: string | null; balance: number; total_cashback_earned: number } | null;
  transactions: HostWalletTransaction[];
  active_redemption: { code: string; amount: number; status: string; expires_at: string; created_at: string } | null;
}

export async function loadGuestWalletForHost(
  db: any,
  businessId: string,
  handle: string,
  historyLimit = 8,
  now: Date = new Date()
): Promise<HostWalletView> {
  const guestHandle = handle.toLowerCase();
  const empty: HostWalletView = { guest_handle: guestHandle, wallet: null, transactions: [], active_redemption: null };

  const { data: wallet, error: walletErr } = await db
    .from('guest_wallets')
    .select('id, wallet_code, balance, total_cashback_earned')
    .eq('guest_id', guestHandle)
    .or(`business_id.eq.${businessId},cafe_id.eq.${businessId}`)
    .maybeSingle();
  if (walletErr) throw walletErr;

  const [txRes, redemptionRes] = await Promise.all([
    wallet
      ? db
          .from('wallet_transactions')
          .select('id, transaction_type, amount, balance_after, table_number, created_at')
          .eq('wallet_id', wallet.id)
          .order('created_at', { ascending: false })
          .limit(historyLimit)
      : Promise.resolve({ data: [], error: null }),
    db
      .from('wallet_redemptions')
      .select('code, amount, status, expires_at, created_at')
      .eq('guest_id', guestHandle)
      .eq('business_id', businessId)
      .in('status', ['pending', 'verified'])
      .gt('expires_at', now.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (txRes.error) throw txRes.error;
  if (redemptionRes.error) throw redemptionRes.error;

  return {
    guest_handle: guestHandle,
    wallet: wallet
      ? {
          id: wallet.id,
          wallet_code: wallet.wallet_code ?? null,
          balance: Number(wallet.balance || 0),
          total_cashback_earned: Number(wallet.total_cashback_earned || 0),
        }
      : null,
    transactions: ((txRes.data as any[]) || []).map((t) => ({
      id: t.id,
      transaction_type: t.transaction_type,
      amount: Number(t.amount || 0),
      balance_after: Number(t.balance_after || 0),
      table_number: t.table_number ?? null,
      created_at: t.created_at,
    })),
    active_redemption: redemptionRes.data
      ? {
          code: redemptionRes.data.code,
          amount: Number(redemptionRes.data.amount || 0),
          status: redemptionRes.data.status,
          expires_at: redemptionRes.data.expires_at,
          created_at: redemptionRes.data.created_at,
        }
      : null,
  };
}
