"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Receipt } from "lucide-react";
import { useGuestAccount } from "@/lib/guest/use-guest-account";
import { useGuestWallet } from "@/components/guest/lobby/useGuestWallet";
import { walletAuthHeaders } from "@/lib/utils/wallet-secret";
import { apiRequest, jsonRequest } from "@/lib/utils/api-client";
import { BottomSheet } from "@/components/guest/shared/BottomSheet";
import { SheetHeader } from "@/components/guest/shared/SheetHeader";
import { WalletSwitch } from "./bill/WalletSwitch";
import { press } from "./motion";
import { tableLabel } from "@/lib/guest/room-mode";

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
  const canOfferWallet = Boolean(account) && amount > 0 && !alreadyOpen;

  // A redemption the guest already asked for stays with the venue; a second one is not offered.
  const checkOpenRedemption = useCallback(async () => {
    if (!handle) return;
    try {
      const res = await fetch(`/api/guest/wallet/redeem?guest_id=${encodeURIComponent(handle)}&cafe_id=${encodeURIComponent(cafeId)}`, { headers: walletAuthHeaders(), cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.success) setAlreadyOpen(Boolean(data.active_redemption));
    } catch {
      // Not knowing is fine: the venue sees any open code when the bill is settled.
    }
  }, [handle, cafeId]);
  useEffect(() => { void checkOpenRedemption(); }, [checkOpenRedemption]);

  const confirm = async () => {
    if (busy) return;
    setError(null);
    const part = useWallet && canOfferWallet ? amount : 0;

    // Setting the wallet aside is the one step the guest waits for, and only when they switched it on.
    if (part > 0 && handle) {
      setBusy(true);
      const result = await apiRequest("/api/guest/wallet/redeem", jsonRequest("POST", {
        guest_id: handle, guest_handle: handle, table_number: tableNumber, cafe_id: cafeId, amount: part,
      }, walletAuthHeaders()));
      setBusy(false);
      if (!result.ok) {
        return setError(result.data?.code === "WALLET_NOT_OWNED"
          ? "This wallet was set up on another device, so it cannot be used from this one. You can switch it off and continue."
          : "We could not set your wallet aside just now. Please try again, or switch it off to continue.");
      }
      window.dispatchEvent(new Event("guest-wallet:refresh"));
    }
    onConfirm();
    onClose();
  };

  return (
    <BottomSheet labelledBy="finalize-title" onClose={onClose} locked={busy}>
      <SheetHeader
        id="finalize-title" icon={<Receipt className="h-[18px] w-[18px]" />} title="Shall we prepare your bill?" onClose={onClose} disabled={busy}
        subtitle={<>{total > 0 ? <>{tableLabel(tableNumber)} · {rupees(total)} so far. </> : null}Once you confirm, our team will bring the final bill to your table. You can still order more until it is settled.</>}
      />

      {canOfferWallet && <WalletSwitch on={useWallet} busy={busy} balance={balance} amount={amount} onToggle={() => setUseWallet((v) => !v)} />}
      {alreadyOpen && (
        <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12.5px] leading-snug text-emerald-900">Your cashback is already set aside for this bill.</p>
      )}
      {error && <p role="alert" className="mt-3 text-center text-[12.5px] font-medium text-rose-600">{error}</p>}

      <motion.button type="button" onClick={() => void confirm()} disabled={busy} {...press}
        className="mt-5 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-zinc-950 text-[14px] font-semibold text-white shadow-[0_14px_26px_-14px_rgba(0,0,0,0.7)] hover:bg-zinc-800 disabled:opacity-60">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {busy ? "One moment…" : useWallet && canOfferWallet ? "Yes, use my wallet and request the bill" : "Yes, please prepare my bill"}
      </motion.button>
      <button type="button" onClick={onClose} disabled={busy}
        className="mt-2 inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-full text-[13.5px] font-medium text-zinc-600 hover:bg-black/5 disabled:opacity-40">
        Not yet, I would like to keep dining
      </button>
    </BottomSheet>
  );
}

export default FinalizeBillSheet;
