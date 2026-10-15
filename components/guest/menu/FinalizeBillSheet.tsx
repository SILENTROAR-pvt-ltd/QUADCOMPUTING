"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Receipt, Sparkles, X } from "lucide-react";
import { useGuestAccount } from "@/lib/guest/use-guest-account";
import { useGuestWallet } from "@/components/guest/lobby/useGuestWallet";
import { walletAuthHeaders } from "@/lib/utils/wallet-secret";
import { apiRequest, jsonRequest } from "@/lib/utils/api-client";

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;

const rupees = (n: number) => `₹${Number(n || 0).toFixed(2).replace(/\.00$/, "")}`;

interface Props {
  cafeId: string;
  tableNumber: string;
  /** The running bill, so the wallet is offered only up to what is owed. */
  billTotal: number;
  /** Asks for the bill. Called once the guest has confirmed (and any wallet redemption has been set aside). */
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * A courteous "shall we prepare your bill?" before the bill is asked for. A signed-in guest with cashback may put it towards
 * the bill. The waiter brings the bill and the cashier settles it; nothing is paid from the phone.
 */
export function FinalizeBillSheet({ cafeId, tableNumber, billTotal, onConfirm, onClose }: Props) {
  const { account } = useGuestAccount(cafeId);
  const { wallet } = useGuestWallet(cafeId);
  const [useWallet, setUseWallet] = useState(false);
  const [alreadyOpen, setAlreadyOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const balance = Number(wallet?.balance || 0);
  const total = Math.max(0, Number(billTotal) || 0);
  // Never more than what is owed. If the bill is not known yet, the whole balance is offered.
  const amount = total > 0 ? Math.min(balance, total) : balance;
  const handle = account?.handle;

  // A redemption the guest already asked for stays with the venue; a second one is not offered.
  const checkOpenRedemption = useCallback(async () => {
    if (!handle) return;
    try {
      const res = await fetch(`/api/guest/wallet/redeem?guest_id=${encodeURIComponent(handle)}&cafe_id=${encodeURIComponent(cafeId)}`, {
        headers: walletAuthHeaders(),
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && data.success) setAlreadyOpen(Boolean(data.active_redemption));
    } catch {
      // Not knowing is fine: the venue sees any open code when the bill is settled.
    }
  }, [handle, cafeId]);
  useEffect(() => { void checkOpenRedemption(); }, [checkOpenRedemption]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = previous; };
  }, [onClose, busy]);

  const canOfferWallet = Boolean(account) && amount > 0 && !alreadyOpen;

  const confirm = async () => {
    if (busy) return;
    setError(null);
    const walletPart = useWallet && canOfferWallet ? amount : 0;

    // Setting the wallet aside is the one step the guest waits for, and only when they switched it on.
    if (walletPart > 0 && handle) {
      setBusy(true);
      const result = await apiRequest("/api/guest/wallet/redeem", jsonRequest("POST", {
        guest_id: handle, guest_handle: handle, table_number: tableNumber, cafe_id: cafeId, amount: walletPart,
      }, walletAuthHeaders()));
      setBusy(false);
      if (!result.ok) {
        setError(result.data?.code === "WALLET_NOT_OWNED"
          ? "This wallet was set up on another device, so it cannot be used from this one. You can switch it off and continue."
          : "We could not set your wallet aside just now. Please try again, or switch it off to continue.");
        return;
      }
      window.dispatchEvent(new Event("guest-wallet:refresh"));
    }

    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-zinc-950/45 sm:items-center sm:p-6" onClick={() => { if (!busy) onClose(); }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="finalize-title"
        onClick={(e) => e.stopPropagation()}
        // A plain scrolling block, not a flex column, so the buttons keep their height on a short phone.
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[28px] bg-[#faf8f2] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] pt-5 shadow-2xl sm:rounded-[28px]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span aria-hidden className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-zinc-950 text-white"><Receipt className="h-[18px] w-[18px]" /></span>
            <div>
              <h2 id="finalize-title" className="text-[22px] leading-tight text-zinc-950" style={SERIF}>Shall we prepare your bill?</h2>
              <p className="mt-0.5 text-[12.5px] leading-snug text-zinc-500">
                {total > 0 ? <>Table {tableNumber} · {rupees(total)} so far. </> : null}
                Once you confirm, our team will bring the final bill to your table. You can still order more until it is settled.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-zinc-500 hover:bg-black/5 disabled:opacity-40 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {canOfferWallet && (
          <button
            type="button"
            role="switch"
            aria-checked={useWallet}
            onClick={() => setUseWallet((v) => !v)}
            disabled={busy}
            className={`mt-5 flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors cursor-pointer disabled:opacity-60 ${useWallet ? "border-emerald-700/40 bg-emerald-50" : "border-neutral-200 bg-white"}`}
          >
            <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700"><Sparkles className="h-[18px] w-[18px]" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-zinc-950">Use my wallet balance</span>
              <span className="block text-[12px] leading-snug text-zinc-500">
                You have {rupees(balance)} in cashback. {rupees(amount)} will go towards this bill.
              </span>
            </span>
            <span aria-hidden className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${useWallet ? "bg-emerald-700" : "bg-neutral-300"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${useWallet ? "left-[22px]" : "left-0.5"}`} />
            </span>
          </button>
        )}

        {alreadyOpen && (
          <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12.5px] leading-snug text-emerald-900">
            Your cashback is already set aside for this bill.
          </p>
        )}

        {error && <p role="alert" className="mt-3 text-center text-[12.5px] font-medium text-rose-600">{error}</p>}

        <button
          type="button"
          onClick={() => void confirm()}
          disabled={busy}
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-zinc-950 text-[14px] font-semibold text-white shadow-[0_14px_26px_-14px_rgba(0,0,0,0.7)] transition-colors hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? "One moment…" : useWallet && canOfferWallet ? "Yes, use my wallet and request the bill" : "Yes, please prepare my bill"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-full text-[13.5px] font-medium text-zinc-600 hover:bg-black/5 disabled:opacity-40 cursor-pointer"
        >
          Not yet, I would like to keep dining
        </button>
      </div>
    </div>
  );
}

export default FinalizeBillSheet;
