// components/guest/lobby/useGuestWallet.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { walletAuthHeaders } from '@/lib/utils/wallet-secret';

export interface WalletTransaction {
  id: string; wallet_id: string; guest_id: string; cafe_id?: string; cafe_name?: string;
  table_number?: string; order_id: string | null; transaction_type: 'CASHBACK' | 'REDEMPTION' | 'ADJUSTMENT';
  rate: string; amount: number; balance_before: number; balance_after: number;
  description: string; created_at: string;
}

export interface GuestWallet {
  id: string; guest_id: string; business_id: string; cafe_id?: string; cafe_name?: string;
  guest_handle?: string; balance: number; total_cashback_earned: number; updated_at: string;
  /** Unique wallet code (QW-XXXXXXXX) assigned by the database. Null for a guest with no wallet yet. */
  wallet_code?: string | null;
}

export function getPersistentWalletIdentifiers(): { primary: string; handle?: string; phone?: string; name?: string } {
  if (typeof window === 'undefined') return { primary: 'gst-current' };
  try {
    const handle = localStorage.getItem('guest_handle') || undefined;
    const phone = localStorage.getItem('quad_guest_phone') || undefined;
    const rawName = localStorage.getItem('quad_guest_name');
    const name = rawName && rawName !== 'Guest' ? rawName : undefined;
    let walletId = localStorage.getItem('quad_guest_wallet_id');
    if (!walletId) {
      walletId = `gw-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem('quad_guest_wallet_id', walletId);
    }
    return { primary: handle || phone || name || walletId, handle, phone, name };
  } catch {
    return { primary: 'gst-current' };
  }
}

export function useGuestWallet(businessId: string = '') {
  const [wallet, setWallet] = useState<GuestWallet>({
    id: 'wlt-current', guest_id: 'gst-current', business_id: businessId, cafe_id: businessId,
    balance: 0, total_cashback_earned: 0, updated_at: new Date().toISOString(),
  });
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [cafeWallets, setCafeWallets] = useState<GuestWallet[]>([]);
  const [globalBalance, setGlobalBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchWallet = useCallback(async () => {
    try {
      const ids = getPersistentWalletIdentifiers();
      const q = new URLSearchParams({ guest_id: ids.primary, cafe_id: businessId, business_id: businessId });
      if (ids.handle) q.set('handle', ids.handle);
      if (ids.phone) q.set('phone', ids.phone);
      const res = await fetch(`/api/guest/wallet?${q.toString()}`, { headers: walletAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        if (data.wallet) setWallet(data.wallet);
        if (data.transactions) setTransactions(data.transactions);
        if (data.cafe_wallets) setCafeWallets(data.cafe_wallets);
        if (data.global_balance !== undefined) setGlobalBalance(data.global_balance);
      }
    } catch (e) {
      console.warn('[useGuestWallet Error]', e);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchWallet();
    const handleRefresh = () => fetchWallet();
    window.addEventListener('focus', handleRefresh);
    window.addEventListener('guest-wallet:refresh', handleRefresh);
    window.addEventListener('storage', handleRefresh);
    // A wallet changes only at settlement or redemption, and both refresh it at once through the events above. This is
    // the safety net, so it runs once a minute and not at all while the tab is hidden.
    const interval = setInterval(() => { if (!document.hidden) fetchWallet(); }, 60_000);
    return () => {
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener('guest-wallet:refresh', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
      clearInterval(interval);
    };
  }, [fetchWallet]);

  return { wallet, transactions, cafeWallets, globalBalance, loading, refreshWallet: fetchWallet };
}

export default useGuestWallet;
