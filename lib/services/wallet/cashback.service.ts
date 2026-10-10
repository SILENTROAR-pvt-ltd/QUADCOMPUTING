// lib/services/wallet/cashback.service.ts
//
// NOTE: cashback crediting for orders is now handled atomically inside the
// `execute_atomic_bill_settlement` RPC at settlement time (see
// lib/services/session/settle-session.service.ts). The standalone
// `creditOrderCashback` helper that used to be called separately from
// settlement (risking double-crediting against the RPC's own cashback
// section) has been removed as dead code.
import {
  getOrCreateMemoryWallet,
  inMemoryWallets,
  inMemoryTransactions,
} from './cashback-ledger.util';

export * from './cashback-ledger.util';

/** The wallet store could not be read. Callers must fail the request, never show a guessed balance. */
export class WalletStoreError extends Error {
  status = 503;
  code = 'WALLET_STORE_UNAVAILABLE';
  constructor(message: string) {
    super(message);
    this.name = 'WalletStoreError';
  }
}

function emptyWallet(guestId: string, businessId: string) {
  return {
    id: null,
    wallet_code: null,
    guest_id: guestId,
    business_id: businessId,
    cafe_id: businessId,
    balance: 0,
    total_cashback_earned: 0,
    updated_at: null,
  };
}

/**
 * The guest's wallet at one venue. When a database client is given, the database is the only
 * source: a read error throws WalletStoreError, and a guest with no wallet yet gets an empty wallet
 * with `id: null`. The in-memory ledger is used only when there is no database at all (tests, local
 * tooling). It used to be consulted after a failed or empty read, which could show a balance that
 * exists only in one server instance's memory and could back a redemption with a wallet id that is
 * not in the database.
 */
export async function getGuestWallet(supabase: any, guestId: string, businessId?: string, extraIdentifiers: string[] = []) {
  const resolvedBiz = businessId || '';
  const candidateIds = Array.from(new Set([guestId, ...extraIdentifiers].filter((id): id is string => Boolean(id && typeof id === 'string' && id.trim().length > 0 && id !== 'Guest'))));
  if (candidateIds.length === 0) candidateIds.push(guestId || 'gst-current');

  if (!supabase) return memoryWallet(candidateIds, guestId, resolvedBiz);

  // 1. The wallet for this venue (preferred), then every wallet for these identifiers.
  const { data: cafeWalletData, error: cafeErr } = await supabase
    .from('guest_wallets')
    .select('*')
    .or(`business_id.eq.${resolvedBiz},cafe_id.eq.${resolvedBiz}`)
    .in('guest_id', candidateIds)
    .order('balance', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (cafeErr) throw new WalletStoreError(cafeErr.message);

  const { data: allWallets, error: allErr } = await supabase
    .from('guest_wallets')
    .select('*')
    .in('guest_id', candidateIds);
  if (allErr) throw new WalletStoreError(allErr.message);

  const globalBalance = (allWallets || []).reduce((sum: number, w: any) => sum + Number(w.balance || 0), 0);
  const resolvedWallet = cafeWalletData || (businessId ? null : allWallets?.[0]) || null;
  if (!resolvedWallet) {
    return { success: true, wallet: emptyWallet(guestId, resolvedBiz), transactions: [], cafe_wallets: allWallets || [], global_balance: globalBalance };
  }

  // 2. Ledger rows for every wallet of these identifiers.
  const allWalletIds = (allWallets || []).map((w: any) => w.id).filter(Boolean);
  let txs: any[] = [];
  if (allWalletIds.length > 0) {
    const { data: dbTxs, error: txErr } = await supabase
      .from('wallet_transactions')
      .select('*')
      .in('wallet_id', allWalletIds)
      .order('created_at', { ascending: false });
    if (txErr) throw new WalletStoreError(txErr.message);
    txs = dbTxs || [];
  }

  const cafeName = resolvedWallet.cafe_name || (await getCafeName(supabase, resolvedBiz));
  const filteredTxs = txs.filter((t: any) => !t.cafe_id || t.cafe_id === resolvedBiz || t.wallet_id === resolvedWallet.id);
  const mergedTxs = filteredTxs.map((t: any) => ({
    ...t,
    cafe_id: t.cafe_id || resolvedBiz,
    cafe_name: t.cafe_name || cafeName,
  }));

  return {
    success: true,
    wallet: {
      id: resolvedWallet.id,
      wallet_code: resolvedWallet.wallet_code ?? null,
      guest_id: resolvedWallet.guest_id,
      business_id: resolvedWallet.business_id || resolvedBiz,
      cafe_id: resolvedWallet.cafe_id || resolvedBiz,
      cafe_name: cafeName,
      balance: Number(resolvedWallet.balance || 0),
      total_cashback_earned: Number(resolvedWallet.total_cashback_earned || 0),
      updated_at: resolvedWallet.updated_at,
    },
    transactions: mergedTxs,
    cafe_wallets: allWallets || [],
    global_balance: globalBalance,
  };
}

function memoryWallet(candidateIds: string[], guestId: string, resolvedBiz: string) {
  for (const cid of candidateIds) {
    const mem = inMemoryWallets.get(`${cid}_${resolvedBiz}`);
    if (mem) {
      const allMems = Array.from(inMemoryWallets.values()).filter((w) => candidateIds.includes(w.guest_id));
      const globalBalance = allMems.reduce((sum, w) => sum + Number(w.balance || 0), 0);
      return {
        success: true,
        wallet: mem,
        transactions: inMemoryTransactions.get(mem.id) || [],
        cafe_wallets: allMems,
        global_balance: globalBalance,
      };
    }
  }
  const mem = inMemoryWallets.get(`${guestId}_${resolvedBiz}`) || getOrCreateMemoryWallet(candidateIds[0] || guestId, resolvedBiz);
  return { success: true, wallet: mem, transactions: inMemoryTransactions.get(mem.id) || [], global_balance: mem.balance, cafe_wallets: [mem] };
}

async function getCafeName(supabase: any, bizId: string): Promise<string | null> {
  if (!supabase || !bizId) return null;
  try {
    const { data } = await supabase.from('businesses').select('*').eq('id', bizId).maybeSingle();
    return data?.business_name || data?.name || null;
  } catch {
    return null;
  }
}
