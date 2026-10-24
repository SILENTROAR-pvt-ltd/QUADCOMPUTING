import { useState, useEffect, useCallback, useRef } from 'react';
import type { VenueSubscription, VenueWallet, UsageLedgerItem, VenueTopupRequest } from '@/types/wallet';
import { planCharge, topupSetupDue, type PlanInfo } from '@/lib/services/wallet/plans';
import { canBuyVibeyAddon, canUse, entitlementsOf } from '@/lib/services/billing/entitlements';
import { PLAN_REFRESH_EVENT } from '@/components/host/plan/usePlanFeatures';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';
import { usePoll } from '@/lib/utils/use-poll';

/** A plan payment or a first top-up carries the one-time setup this venue still owes (worked out when it is opened). */
export type PaymentTarget = { kind: 'topup'; amount: number; setup?: number } | { kind: 'plan'; plan: PlanInfo; setup?: number } | { kind: 'addon' };
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
  const openPayment = (target: PaymentTarget) => {
    if (hasPendingApproval) return;
    setActionError(null);
    setPayFor(target.kind === 'plan' ? { ...target, setup: planCharge(target.plan, data.subscription).setup }
      : target.kind === 'topup' ? { ...target, setup: topupSetupDue(data.subscription) } : target);
  };

  // The free month is offered only once the subscription row carries trial_used_at (the plans migration) and it is empty.
  const sub = data.subscription as (VenueSubscription & { trial_used_at?: string | null }) | null;
  const trialAvailable = Boolean(sub && 'trial_used_at' in sub && !sub.trial_used_at);
  const [starting, setStarting] = useState(false);
  const startTrial = async (plan: PlanInfo) => {
    setStarting(true);
    const res = await apiRequest('/api/host/wallet', jsonRequest('POST', { action: 'start_trial', planTier: plan.id, venueId }));
    setActionError(res.ok ? null : res.error);
    setStarting(false);
    fetchWalletData();
    window.dispatchEvent(new CustomEvent(PLAN_REFRESH_EVENT));
  };

  const switchToPayAsYouGo = async () => {
    setSwitching(true);
    const res = await apiRequest('/api/host/wallet', jsonRequest('POST', { action: 'select_plan', planTier: 'pay_as_you_go', venueId }));
    setActionError(res.ok ? null : res.error);
    setSwitching(false);
    fetchWalletData();
    window.dispatchEvent(new CustomEvent(PLAN_REFRESH_EVENT));
  };

  const access = entitlementsOf(data.subscription);
  return {
    ...data,
    plan: access.state,
    /** The Vibey add-on: whether this plan can take it, and when a running one ends. */
    vibeyAddon: { eligible: canBuyVibeyAddon(access), included: canUse(access, 'vibey') && !access.vibeyUntil, until: access.vibeyUntil },
    hasPendingApproval,
    loading,
    switching,
    actionError,
    payFor,
    openPayment,
    closePayment: () => setPayFor(null),
    fetchWalletData,
    switchToPayAsYouGo,
    trialAvailable,
    starting,
    startTrial,
  };
}
