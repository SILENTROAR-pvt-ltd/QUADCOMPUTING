"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Banknote, Check, CheckCircle2, Copy, CreditCard, Loader2, QrCode, Receipt, Smartphone, Sparkles, X } from "lucide-react";
import { useGuestAccount } from "@/lib/guest/use-guest-account";
import { useBillPayment } from "@/lib/guest/use-bill-payment";
import { useGuestWallet } from "@/components/guest/lobby/useGuestWallet";
import { walletAuthHeaders } from "@/lib/utils/wallet-secret";
import { apiRequest, jsonRequest } from "@/lib/utils/api-client";
import { upiPayLink } from "@/lib/utils/upi";
import { billGrewAfterPayment, guestPaymentLine, payableAfterWallet, remainingToPay, type PaymentMethod } from "@/lib/services/payments/bill-payment.rules";
import { UpiAppButtons } from "./UpiAppButtons";
import { ThankYouBlock } from "./tracker/ThankYouBlock";

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;

const rupees = (n: number) => `₹${Number(n || 0).toFixed(2).replace(/\.00$/, "")}`;

type Step = "choose" | "pay" | "status";

interface Props {
  cafeId: string;
  tableNumber: string;
  /** The running bill, so the wallet is offered only up to what is owed. */
  billTotal: number;
  /** The bill has already been asked for: opening the sheet again goes straight to paying. */
  alreadyRequested?: boolean;
  /** Asks for the bill. Called once the guest has confirmed (and any wallet redemption has been set aside). */
  onConfirm: () => void;
  onClose: () => void;
}

const METHOD_COPY: Record<PaymentMethod, { label: string; hint: string; icon: typeof Smartphone }> = {
  UPI: { label: "UPI", hint: "Pay now from your phone", icon: Smartphone },
  CASH: { label: "Cash", hint: "Pay your waiter", icon: Banknote },
  CARD: { label: "Card", hint: "Waiter brings the machine", icon: CreditCard },
};

type Saved = Awaited<ReturnType<ReturnType<typeof useBillPayment>["choose"]>>;

/**
 * The last steps before the bill is paid: a courteous "shall we prepare it?", the wallet choice for a signed-in guest, how they
 * would like to pay (UPI from their phone, cash or card), and where their payment has got to. Every step opens at once from
 * what the phone already knows; the server is told in the background, so nothing waits and nothing freezes.
 *
 * Only what is still owed is ever shown. Money already confirmed on this bill is counted, so a guest who adds to their order
 * after paying sees the new part to pay, never the old "payment confirmed" for items that were not paid.
 */
export function FinalizeBillSheet({ cafeId, tableNumber, billTotal, alreadyRequested = false, onConfirm, onClose }: Props) {
  const { account } = useGuestAccount(cafeId);
  const { wallet } = useGuestWallet(cafeId);
  const pay = useBillPayment(cafeId, tableNumber);
  const [step, setStep] = useState<Step>("choose");
  const [method, setMethod] = useState<PaymentMethod>("UPI");
  const [useWallet, setUseWallet] = useState(false);
  const [alreadyOpen, setAlreadyOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);
  const [paidTapped, setPaidTapped] = useState(false);
  const [claimFailed, setClaimFailed] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  /** What the guest will pay, worked out on the phone the moment they confirm, until the server's own figure arrives. */
  const [local, setLocal] = useState<{ amount: number; wallet: number } | null>(null);
  const jumped = useRef(false);
  const saving = useRef<Promise<Saved> | null>(null);
  const refreshedFor = useRef<number | null>(null);

  const balance = Number(wallet?.balance || 0);
  // The server's figure for the open bill is preferred; the page's running total covers the moment before it arrives.
  const bill = Math.max(0, Number(pay.billTotal ?? billTotal) || 0);
  const paid = pay.paidSoFar;
  /** What is still owed: the bill less anything already paid and confirmed. */
  const total = remainingToPay(bill, paid);
  /** The order grew after a payment was confirmed. */
  const grew = billGrewAfterPayment(bill, paid);
  /** The payment the screens talk about. A confirmed payment that no longer covers the bill is not shown as "confirmed". */
  const livePay = grew && pay.payment?.status === "verified" ? null : pay.payment;

  // Never more than what is owed. If the bill is not known yet, the whole balance is offered.
  const amount = total > 0 ? Math.min(balance, total) : balance;
  const handle = account?.handle;
  const due = livePay ? livePay.amount : local ? local.amount : payableAfterWallet(total, useWallet ? amount : 0).amount;
  const walletSet = livePay ? livePay.wallet_amount : local ? local.wallet : 0;

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

  // A guest who comes back to the sheet lands where they left off: the pay screen, or the status of their payment.
  useEffect(() => {
    if (jumped.current || !pay.loaded) return;
    jumped.current = true;
    const p = livePay;
    if (!p) return;
    setMethod(p.method);
    if (p.status === "claimed" || p.status === "verified") setPaidTapped(true);
    setStep(p.method === "UPI" && p.status === "chosen" ? "pay" : "status");
  }, [pay.loaded, livePay]);

  // The order grew while a confirmation was on screen: back to choosing how to pay for the new part.
  useEffect(() => {
    if (grew && step !== "choose" && (!livePay || livePay.status === "verified" || livePay.status === "claimed")) {
      setStep("choose");
      setPaidTapped(false);
      setLocal(null);
    }
  }, [grew, step, livePay]);

  // A payment waiting to be paid for an older total is brought up to what is owed now, so the guest never pays a stale amount.
  useEffect(() => {
    const p = livePay;
    if (!p || p.status !== "chosen" || pay.ready !== true) return;
    if (Math.abs(p.amount + p.wallet_amount - total) <= 0.5 || refreshedFor.current === total) return;
    refreshedFor.current = total;
    void pay.choose(p.method, p.wallet_amount);
  }, [livePay, total, pay]);

  // UPI is not offered at a venue that has not saved a UPI ID: the default moves to cash.
  useEffect(() => {
    if (pay.ready === true && !pay.upi.available && method === "UPI") setMethod("CASH");
  }, [pay.ready, pay.upi.available, method]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = previous; };
  }, [onClose, busy]);

  const canOfferWallet = Boolean(account) && amount > 0 && !alreadyOpen;
  const paymentsOn = pay.ready === true;
  const qrLink = pay.upi.vpa ? upiPayLink({ upiId: pay.upi.vpa, payee: pay.upi.payee || "Venue", amount: due, note: `Table ${tableNumber}` }) : null;

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

    if (!alreadyRequested) onConfirm();

    // The venue's payments are not set up: the bill is asked for and the waiter brings it, as before.
    if (!paymentsOn) {
      onClose();
      return;
    }

    // Show the next screen at once; the choice is saved in the background and any problem brings the guest back here.
    setLocal(payableAfterWallet(total, walletPart));
    setPaidTapped(false);
    setClaimFailed(false);
    setOpened(false);
    setStep(method === "UPI" ? "pay" : "status");
    const attempt = pay.choose(method, walletPart);
    saving.current = attempt;
    void attempt.then((r) => {
      if (r.ok) return;
      if (r.code === "PAYMENTS_NOT_READY") { onClose(); return; }
      setStep("choose");
      setError(r.code === "UPI_NOT_AVAILABLE" ? "UPI is not set up here yet. Please choose cash or card." : r.error);
    });
  };

  // "I have paid": the thank-you shows this instant; staff are told in the background, and a failure offers a retry.
  const claim = () => {
    setPaidTapped(true);
    setClaimFailed(false);
    setStep("status");
    void (async () => {
      const saved = saving.current ? await saving.current : null;
      const ok = await pay.claim(saved && saved.ok ? saved.payment.id : undefined);
      if (!ok) setClaimFailed(true);
    })();
  };

  const copyVpa = async () => {
    try {
      if (pay.upi.vpa) await navigator.clipboard.writeText(pay.upi.vpa);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* copying is a convenience */ }
  };

  const verified = livePay?.status === "verified";
  const venueName = pay.upi.payee && pay.upi.payee !== "Venue" ? pay.upi.payee : "us";
  const shownMethod = livePay?.method ?? method;
  const StatusIcon = METHOD_COPY[shownMethod].icon;
  const title = step === "choose" ? (grew ? "Your order has grown" : "Shall we prepare your bill?") : step === "pay" ? "Pay with UPI" : pay.settled ? "Thank you!" : verified ? "Payment confirmed" : paidTapped ? "Thank you!" : "Your payment";

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-zinc-950/45 sm:items-center sm:p-6" onClick={() => { if (!busy) onClose(); }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="finalize-title"
        onClick={(e) => e.stopPropagation()}
        // A plain scrolling block, not a flex column: in a column with a maximum height every button shrinks to fit the screen
        // instead of the sheet scrolling, which squashed "Yes, I have paid" on a short phone.
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[28px] bg-[#faf8f2] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] pt-5 shadow-2xl sm:rounded-[28px]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span aria-hidden className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-zinc-950 text-white"><Receipt className="h-[18px] w-[18px]" /></span>
            <div>
              <h2 id="finalize-title" className="text-[22px] leading-tight text-zinc-950" style={SERIF}>{title}</h2>
              <p className="mt-0.5 text-[12.5px] leading-snug text-zinc-500">
                {step === "choose" && (
                  grew ? (
                    <>
                      You added to your order after paying. {rupees(paid)} is already paid, so {rupees(total)} is left for the new items.
                    </>
                  ) : (
                    <>
                      {bill > 0 ? <>Table {tableNumber} · {rupees(bill)} so far. </> : null}
                      Once you confirm, our team will bring the final bill to your table. You can still order more until it is settled.
                    </>
                  )
                )}
                {step === "pay" && <>Table {tableNumber}{pay.upi.payee ? ` · ${pay.upi.payee}` : ""}</>}
                {step === "status" && <>Table {tableNumber}</>}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-zinc-500 hover:bg-black/5 disabled:opacity-40 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === "choose" && (
          <>
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

            {paymentsOn && (
              <div className="mt-5">
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-zinc-500">How would you like to pay?</p>
                <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-3 gap-2">
                  {(["UPI", "CASH", "CARD"] as const).map((m) => {
                    const c = METHOD_COPY[m];
                    const Icon = c.icon;
                    const off = m === "UPI" && !pay.upi.available;
                    const on = method === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        disabled={off}
                        onClick={() => setMethod(m)}
                        className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-center transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 ${on ? "border-zinc-950 bg-white ring-1 ring-zinc-950" : "border-neutral-200 bg-white active:bg-neutral-50"}`}
                      >
                        <Icon className="h-5 w-5 text-zinc-900" aria-hidden />
                        <span className="text-[13px] font-semibold text-zinc-950">{c.label}</span>
                        <span className="text-[10.5px] leading-tight text-zinc-500">{off ? "Not set up" : c.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {error && <p role="alert" className="mt-3 text-center text-[12.5px] font-medium text-rose-600">{error}</p>}

            <button
              type="button"
              onClick={() => void confirm()}
              disabled={busy}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-zinc-950 text-[14px] font-semibold text-white shadow-[0_14px_26px_-14px_rgba(0,0,0,0.7)] transition-colors hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy
                ? "One moment…"
                : !paymentsOn
                  ? useWallet && canOfferWallet ? "Yes, use my wallet and request the bill" : "Yes, please prepare my bill"
                  : method === "UPI"
                    ? `Continue to pay ${rupees(payableAfterWallet(total, useWallet && canOfferWallet ? amount : 0).amount)}`
                    : `Yes, I will pay by ${METHOD_COPY[method].label.toLowerCase()}`}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-full text-[13.5px] font-medium text-zinc-600 hover:bg-black/5 disabled:opacity-40 cursor-pointer"
            >
              Not yet, I would like to keep dining
            </button>
          </>
        )}

        {step === "pay" && (
          <>
            <div className="mt-5 rounded-2xl border border-neutral-200 bg-white p-4 text-center">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-zinc-500">Amount to pay</p>
              <p className="mt-1 font-mono text-[34px] font-bold leading-none text-zinc-950">{rupees(due)}</p>
              {paid > 0 && <p className="mt-2 text-[12px] text-zinc-500">{rupees(paid)} was already paid on this bill.</p>}
              {walletSet > 0 && <p className="mt-1 text-[12px] text-emerald-800">{rupees(walletSet)} of your cashback goes towards this bill.</p>}
            </div>

            {pay.upi.vpa ? (
              <div className="mt-4">
                <UpiAppButtons vpa={pay.upi.vpa} payee={pay.upi.payee || "Venue"} amount={due} note={`Table ${tableNumber}`} onOpened={() => setOpened(true)} />

                <button type="button" onClick={() => setShowQr((v) => !v)} aria-expanded={showQr}
                  className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-medium text-zinc-600 hover:bg-black/5 cursor-pointer">
                  <QrCode className="h-4 w-4" aria-hidden /> {showQr ? "Hide the QR code" : "Pay from another phone (QR code)"}
                </button>
                {showQr && qrLink && (
                  <div className="mt-1 flex flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-white p-4">
                    <QRCodeSVG value={qrLink} size={168} level="M" />
                    <button type="button" onClick={() => void copyVpa()} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-600 cursor-pointer">
                      <span className="font-mono">{pay.upi.vpa}</span> {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-4 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-center text-[12.5px] text-zinc-600">
                <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" aria-hidden /> Getting the payment ready…
              </p>
            )}

            <button
              type="button"
              onClick={claim}
              className={`mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-[14px] font-semibold transition-colors active:scale-[0.99] cursor-pointer ${opened ? "bg-emerald-700 text-white" : "border border-neutral-300 bg-white text-zinc-900"}`}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden /> Yes, I have paid
            </button>
            <p className="mt-2 text-center text-[11.5px] leading-snug text-zinc-500">
              After paying, show the success screen on your phone to your waiter so they can confirm.
            </p>
            <button type="button" onClick={() => { setStep("choose"); setError(null); }}
              className="mt-1 inline-flex h-10 w-full items-center justify-center rounded-full text-[13px] font-medium text-zinc-600 hover:bg-black/5 cursor-pointer">
              Pay another way
            </button>
          </>
        )}

        {step === "status" && (
          <>
            <div className="mt-5 rounded-2xl border border-neutral-200 bg-white p-5 text-center">
              {pay.settled ? (
                <ThankYouBlock
                  compact
                  eyebrow={`Table ${tableNumber} · Bill settled`}
                  title={`Thank you for dining with ${venueName}.`}
                  body="It was a pleasure to host you. We hope to welcome you again very soon."
                />
              ) : verified ? (
                <>
                  <ThankYouBlock
                    compact
                    eyebrow={`Table ${tableNumber} · Payment confirmed`}
                    title={`Thank you for dining with ${venueName}.`}
                    body="Your payment is confirmed. Your bill will be settled in a moment."
                  />
                  <p className="mt-3 font-mono text-[22px] font-bold leading-none text-zinc-950">{rupees(due)}</p>
                </>
              ) : paidTapped ? (
                <>
                  <ThankYouBlock
                    compact
                    eyebrow={`Table ${tableNumber} · Payment received`}
                    title={`Thank you for dining with ${venueName}.`}
                    body="We have let our team know. They will confirm your payment in a moment."
                  />
                  <p className="mt-3 font-mono text-[22px] font-bold leading-none text-zinc-950">{rupees(due)}</p>
                </>
              ) : (
                <>
                  <StatusIcon className="mx-auto h-9 w-9 text-zinc-700" aria-hidden />
                  <p className="mt-2 font-mono text-[26px] font-bold leading-none text-zinc-950">{rupees(due)}</p>
                  <p className="mt-2 text-[13px] leading-snug text-zinc-600">{guestPaymentLine({ method: shownMethod, status: "chosen" })}</p>
                </>
              )}
            </div>

            {claimFailed && (
              <div role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-center">
                <p className="text-[12.5px] font-medium text-amber-900">We could not reach our team just now.</p>
                <button type="button" onClick={claim} className="mt-1 text-[13px] font-semibold text-amber-900 underline cursor-pointer">Tell them again</button>
              </div>
            )}

            {!paidTapped && shownMethod === "UPI" && (
              <button type="button" onClick={() => setStep("pay")}
                className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-zinc-950 text-[14px] font-semibold text-white cursor-pointer">
                <Smartphone className="h-4 w-4" aria-hidden /> Pay with UPI
              </button>
            )}
            {!verified && !pay.settled && (
              <button type="button" onClick={() => { setStep("choose"); setError(null); setPaidTapped(false); }}
                className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-full text-[13px] font-medium text-zinc-600 hover:bg-black/5 cursor-pointer">
                Pay another way
              </button>
            )}
            <button type="button" onClick={onClose}
              className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-full bg-zinc-950 text-[14px] font-semibold text-white cursor-pointer">
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default FinalizeBillSheet;
