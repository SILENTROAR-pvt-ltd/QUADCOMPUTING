'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { walletAuthHeaders } from '@/lib/utils/wallet-secret';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';
import { WalletHostPass, type ActiveRedemption } from './WalletHostPass';

interface Props {
  balance: number;
  guestId?: string;
  guestHandle?: string;
  /** Unique wallet code shown to the host with the pass, so the right wallet is matched. */
  walletCode?: string | null;
  tableNumber: string;
  cafeId?: string;
}

const REFRESH_MS = 15000;

/**
 * Redeem wallet cashback towards this table's bill. Asking creates a one-time code that the host
 * verifies; the same request is used on the wallet sheet, the cart and the open bill.
 */
export function WalletRedeemPass({ balance, guestId, guestHandle, walletCode, tableNumber, cafeId }: Props) {
  const [activeCode, setActiveCode] = useState<ActiveRedemption | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = guestHandle || guestId;

  // The server is the only source for an open pass. It drops out as soon as the host settles
  // the bill (or the code expires), so this view never shows a code that can no longer be used.
  const fetchActive = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/guest/wallet/redeem?guest_id=${encodeURIComponent(id)}${cafeId ? `&cafe_id=${encodeURIComponent(cafeId)}` : ''}`, {
        headers: walletAuthHeaders(),
        cache: 'no-store',
      });
      const data = await res.json();
      if (res.ok && data.success) setActiveCode(data.active_redemption ?? null);
    } catch {}
  }, [id, cafeId]);

  useEffect(() => {
    void fetchActive();
    const onRefresh = () => void fetchActive();
    window.addEventListener('guest-wallet:refresh', onRefresh);
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void fetchActive(); }, REFRESH_MS);
    return () => {
      window.removeEventListener('guest-wallet:refresh', onRefresh);
      clearInterval(timer);
    };
  }, [fetchActive]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    const result = await apiRequest('/api/guest/wallet/redeem', jsonRequest('POST', {
      guest_id: guestId || guestHandle || 'guest', guest_handle: guestHandle,
      table_number: tableNumber, cafe_id: cafeId, amount: balance,
    }, walletAuthHeaders()));
    setLoading(false);
    if (result.ok && result.data?.redemption) {
      setActiveCode(result.data.redemption);
    } else {
      setError(result.data?.code === 'WALLET_NOT_OWNED'
        ? 'This wallet was set up on another device, so it cannot be redeemed from this one.'
        : result.error || 'Could not create your redemption code. Please try again.');
    }
  };

  if (activeCode) return <WalletHostPass redemption={activeCode} walletCode={walletCode} />;
  if (balance <= 0) return null;

  return (
    <div className="my-3 flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-neutral-950">
          <Sparkles className="h-3.5 w-3.5 text-amber-600" /> Redeem Cashback
        </p>
        <p className="text-[10px] text-neutral-500">Get a one-time code for our team to apply</p>
        {error && <p role="alert" className="mt-1 text-[10px] text-rose-600">{error}</p>}
      </div>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="flex shrink-0 items-center gap-1 rounded-xl bg-neutral-950 px-3.5 py-2 text-xs font-bold text-white transition-all hover:bg-neutral-800 active:scale-95 disabled:opacity-50 cursor-pointer"
      >
        {loading && <Loader2 className="h-3 w-3 animate-spin" />}
        <span>Redeem ₹{balance.toFixed(0)}</span>
      </button>
    </div>
  );
}

export default WalletRedeemPass;
