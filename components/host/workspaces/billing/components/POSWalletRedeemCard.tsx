'use client';

import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface Props {
  cafeId?: string | null;
  tableNumber?: string | null;
  redemptionCode: string | null;
  setRedemptionCode: (code: string | null) => void;
  verifiedRedemption: any;
  setVerifiedRedemption: (val: any) => void;
  onApplyDiscount: (amount: number, code: string) => void;
  onClearRedemption: () => void;
}

export function POSWalletRedeemCard({
  cafeId, redemptionCode, verifiedRedemption, setVerifiedRedemption, onApplyDiscount, onClearRedemption,
}: Props) {
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const handleVerify = async () => {
    const code = (inputCode || redemptionCode || '').trim().toUpperCase();
    if (!code) return setStatusMsg({ text: 'Enter redemption code', error: true });
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/host/wallet/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, cafe_id: cafeId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatusMsg({ text: data.error || 'Verification failed', error: true });
        return;
      }
      // The host applies the discount; the settlement debits only what is applied.
      onApplyDiscount(data.redemption.amount, data.redemption.code);
      setVerifiedRedemption({
        code: data.redemption.code,
        amount: data.redemption.amount,
        guest_handle: data.guest_handle || null,
        wallet_code: data.wallet_code || null,
      });
      setInputCode(data.redemption.code);
      setStatusMsg({ text: `Verified up to ₹${data.redemption.amount}` });
    } catch {
      setStatusMsg({ text: 'Failed to verify code', error: true });
    } finally {
      setLoading(false);
    }
  };

  if (verifiedRedemption) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/50 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <span className="font-semibold text-emerald-950">Up to ₹{verifiedRedemption.amount} wallet credit</span>
            <span className="text-[10px] text-emerald-700 ml-2 font-mono">[{verifiedRedemption.code}]</span>
            <p className="text-[10px] text-emerald-800 mt-0.5">
              {verifiedRedemption.guest_handle || 'Guest'}{verifiedRedemption.wallet_code ? ` · Wallet ${verifiedRedemption.wallet_code}` : ''}
            </p>
          </div>
        </div>
        <button type="button" onClick={onClearRedemption} className="text-[11px] text-neutral-500 hover:text-rose-600 font-medium">Remove</button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-neutral-700" /> Guest Wallet Cashback Redemption
        </label>
        {statusMsg && (
          <span className={`text-[10px] font-medium flex items-center gap-1 ${statusMsg.error ? 'text-rose-600' : 'text-emerald-600'}`}>
            {statusMsg.error ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />} {statusMsg.text}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={inputCode}
          onChange={(e) => setInputCode(e.target.value.toUpperCase())}
          placeholder="Code (e.g. QC-RDM-XXXX)"
          className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-mono tracking-wider focus:outline-none focus:border-black"
        />
        <button
          type="button"
          onClick={handleVerify}
          disabled={loading || !inputCode.trim()}
          className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black disabled:opacity-40 transition-colors flex items-center gap-1 shrink-0"
        >
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
          <span>Verify & Apply</span>
        </button>
      </div>
    </div>
  );
}
export default POSWalletRedeemCard;
