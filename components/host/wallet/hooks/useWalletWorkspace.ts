import { useState, useEffect, useCallback, useRef } from 'react';
import type { VenueSubscription, VenueWallet, UsageLedgerItem, VenueTopupRequest } from '@/types/wallet';
import type { PlanInfo } from '@/lib/services/wallet/plans';
import { planState } from '@/lib/services/wallet/subscription-state';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';
import { usePoll } from '@/lib/utils/use-poll';

export type PaymentTarget = { kind: 'topup'; amount: number } | { kind: 'plan'; plan: PlanInfo };
export interface PlatformPayment { upi_id: string; payee_name: string }

interface WalletData {
  wallet: VenueWallet | null;
  subscription: VenueSubscription | null;
  ledger: UsageLedgerItem[];
  pendingRequest: VenueTopupRequest | null;
  payment: PlatformPayment | null;
}

const EMPTY: WalletData = { wallet: null, subscription: null, ledger: [], pendingRequest: null, payment: null };
const cacheKey = (venueId: string) => `quad_wallet_${venueId}`;

function readCache(venueId: string): WalletData | null {
  try { const raw = sessionStorage.getItem(cacheKey(venueId)); return raw ? { ...EMPTY, ...JSON.parse(raw) } : null; } catch { return null; }
}

export function useWalletWorkspace(venueId: string) {
  const cached = useRef(typeof window === 'undefined' ? null : readCache(venueId)).current;
  const [data, setData] = useState<WalletData>(cached || EMPTY);
  const [loading, setLoading] = useState(!cached);
  const [payFor, setPayFor] = useState<PaymentTarget | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  const fetchWalletData = useCallback(async () => {
    const res = await apiRequest<any>(`/api/host/wallet?venue_id=${venueId}`, { cache: 'no-store' });
    if (res.ok && res.data?.success) {
      const next: WalletData = {
        wallet: res.data.wallet ?? null,
        subscription: res.data.subscription ?? null,
        ledger: res.data.ledger || [],
        pendingRequest: res.data.pendingRequest || null,
        payment: res.data.payment || null,
      };
      setData(next);
      try { sessionStorage.setItem(cacheKey(venueId), JSON.stringify(next)); } catch {}
    }
    setLoading(false);
  }, [venueId]);

  useEffect(() => {
    fetchWalletData();
    const onRefresh = () => fetchWalletData();
    window.addEventListener('wallet:refresh', onRefresh);
    return () => window.removeEventListener('wallet:refresh', onRefresh);
  }, [fetchWalletData]);
  usePoll(() => { void fetchWalletData(); }, 15_000);

  const hasPendingApproval = Boolean(data.pendingRequest);
  const openPayment = (target: PaymentTarget) => { if (!hasPendingApproval) { setActionError(null); setPayFor(target); } };

  const switchToPayAsYouGo = async () => {
    setSwitching(true);
    const res = await apiRequest('/api/host/wallet', jsonRequest('POST', { action: 'select_plan', planTier: 'pay_as_you_go', venueId }));
    setActionError(res.ok ? null : res.error);
    setSwitching(false);
    fetchWalletData();
  };

  return {
    ...data,
    plan: planState(data.subscription),
    hasPendingApproval,
    loading,
    switching,
    actionError,
    payFor,
    openPayment,
    closePayment: () => setPayFor(null),
    fetchWalletData,
    switchToPayAsYouGo,
  };
}
