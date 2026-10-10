'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, History, Loader2, Wallet, XCircle } from 'lucide-react';
import type { HostWalletView } from '@/lib/services/wallet/host-wallet-view.service';
import { POSWalletHistoryDialog, inr } from './POSWalletHistoryDialog';

interface Props {
  /** The guest linked to the table being billed (null when none is linked). */
  guestHandle: string | null;
  /** The redemption code currently applied to the bill, if any. */
  appliedCode: string | null;
  /** Called after the host verifies a code; the parent applies it as the bill's discount. */
  onApply: (args: { code: string; amount: number; guestHandle: string | null; walletCode: string | null }) => void;
  onRemove: () => void;
}

const REFRESH_MS = 15000;

function timeOf(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

/**
 * The linked guest's wallet on the billing screen: the wallet code to match the person, the open
 * redemption code (shown without typing), and a button for the ledger. The host applies a code with
 * one click; the server re-checks it before the discount is taken.
 */
export function POSGuestWalletPanel({ guestHandle, appliedCode, onApply, onRemove }: Props) {
  const [view, setView] = useState<HostWalletView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [newCodeAlert, setNewCodeAlert] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const lastCodeRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!guestHandle) return;
    try {
      const res = await fetch(`/api/host/wallet/guest?handle=${encodeURIComponent(guestHandle)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not load the guest wallet.');
      setView(data as HostWalletView);
      setLoadError(null);
      const code = data.active_redemption?.code ?? null;
      if (code && code !== lastCodeRef.current) setNewCodeAlert(true);
      lastCodeRef.current = code;
    } catch (e: any) {
      setLoadError(e?.message || 'Could not load the guest wallet.');
    }
  }, [guestHandle]);

  useEffect(() => {
    setView(null);
    setMessage(null);
    setNewCodeAlert(false);
    setHistoryOpen(false);
    lastCodeRef.current = null;
    if (!guestHandle) return;
    void load();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [guestHandle, load]);

  if (!guestHandle) return null;

  const active = view?.active_redemption ?? null;
  const applied = Boolean(active && appliedCode && appliedCode === active.code);
  const balance = view?.wallet?.balance ?? 0;
  const ledgerCount = view?.transactions.length ?? 0;

  const applyCode = async () => {
    if (!active) return;
    setApplying(true);
    setMessage(null);
    try {
      const res = await fetch('/api/host/wallet/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: active.code }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ text: data.error || 'The code could not be applied.', error: true });
        return;
      }
      onApply({
        code: data.redemption.code,
        amount: Number(data.redemption.amount),
        guestHandle: data.guest_handle || guestHandle,
        walletCode: data.wallet_code ?? view?.wallet?.wallet_code ?? null,
      });
      setNewCodeAlert(false);
      setMessage({ text: `Applied up to ${inr(data.redemption.amount)} from the wallet`, error: false });
    } catch {
      setMessage({ text: 'Could not reach the server. Try again.', error: true });
    } finally {
      setApplying(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm" aria-label="Guest wallet">
      <header className="flex items-start justify-between gap-3 border-b border-neutral-100 px-4 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            <Wallet className="h-3.5 w-3.5" /> Guest wallet
          </p>
          <p className="truncate text-sm font-semibold text-neutral-900">{guestHandle}</p>
        </div>
        {view?.wallet?.wallet_code ? (
          <span className="shrink-0 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 font-mono text-[11px] font-bold text-neutral-800" title="Wallet ID">
            {view.wallet.wallet_code}
          </span>
        ) : null}
      </header>

      <div className="space-y-3 px-4 py-3">
        {loadError && <p className="text-xs text-rose-600">{loadError}</p>}
        {!view && !loadError && <p className="flex items-center gap-1.5 text-xs text-neutral-500"><Loader2 className="h-3 w-3 animate-spin" /> Loading wallet…</p>}

        {view && (
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-serif text-2xl text-neutral-950">{inr(balance)}</p>
              <p className="text-[11px] text-neutral-500">Wallet balance at this venue</p>
            </div>
            <p className="text-[11px] text-neutral-500">Earned {inr(view.wallet?.total_cashback_earned ?? 0)}</p>
          </div>
        )}

        {view && active && (
          <div className={`rounded-xl border p-3 ${applied ? 'border-emerald-300 bg-emerald-50/60' : 'border-amber-300 bg-amber-50/60'}`}>
            {newCodeAlert && !applied && (
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-800">Guest requested a wallet redemption</p>
            )}
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">Redemption code</p>
            <p className="mt-0.5 font-mono text-xl font-bold tracking-widest text-neutral-950">{active.code}</p>
            <p className="text-[11px] text-neutral-600">
              Up to {inr(active.amount)} off this bill · {active.status === 'verified' ? 'verified' : 'waiting for you'} · valid until {timeOf(active.expires_at)}
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              {applied ? (
                <>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" /> Applied to this bill</span>
                  <button type="button" onClick={onRemove} className="ml-auto cursor-pointer text-[11px] font-medium text-neutral-600 hover:text-rose-600">Remove</button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={applyCode}
                  disabled={applying || Boolean(appliedCode)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white hover:bg-black disabled:opacity-40"
                >
                  {applying && <Loader2 className="h-3 w-3 animate-spin" />}
                  Apply {inr(active.amount)} to bill
                </button>
              )}
            </div>
          </div>
        )}

        {view && !active && (
          <p className="text-xs text-neutral-500">
            {balance > 0
              ? 'No redemption requested. The guest can request one from their phone (cart or Me tab).'
              : 'No wallet balance to redeem yet.'}
          </p>
        )}

        {message && (
          <p className={`flex items-center gap-1 text-xs font-medium ${message.error ? 'text-rose-600' : 'text-emerald-700'}`}>
            {message.error ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />} {message.text}
          </p>
        )}

        {view && ledgerCount > 0 && (
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-neutral-200 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            <History className="h-3.5 w-3.5" /> View wallet history · {ledgerCount}
          </button>
        )}
      </div>

      {historyOpen && view && (
        <POSWalletHistoryDialog guestHandle={guestHandle} transactions={view.transactions} onClose={() => setHistoryOpen(false)} />
      )}
    </section>
  );
}

export default POSGuestWalletPanel;
