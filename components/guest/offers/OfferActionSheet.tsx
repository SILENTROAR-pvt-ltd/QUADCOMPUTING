'use client';

import React, { useEffect, useState } from 'react';
import { Check, Loader2, MessageCircle, Ticket, X } from 'lucide-react';
import type { VenueLiveOffer } from '@/types/offers';
import { fetchOfferRequestStatus, sendOfferRequest, type OfferRequestStatus } from '@/lib/guest/offer-requests-client';

interface OfferActionSheetProps {
  venueId: string;
  tableNumber: string;
  offer: VenueLiveOffer;
  onClose: () => void;
}

const POLL_MS = 5000;

/** One live offer: redeem it for a code the host settles, or ask the host a question about it. */
export function OfferActionSheet({ venueId, tableNumber, offer, onClose }: OfferActionSheetProps) {
  const [redemption, setRedemption] = useState<OfferRequestStatus | null>(null);
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redemptionId = redemption?.id;
  const stillOpen = redemption?.status === 'open';

  // While a redemption is open, follow it until the host settles or cancels it.
  useEffect(() => {
    if (!redemptionId || !stillOpen) return;
    const timer = setInterval(async () => {
      const out = await fetchOfferRequestStatus(venueId, redemptionId);
      if (out.ok) setRedemption(out.value);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [redemptionId, stillOpen, venueId]);

  const redeem = async () => {
    setBusy(true);
    setError(null);
    const out = await sendOfferRequest(venueId, tableNumber, { offer_id: offer.id, kind: 'redeem' });
    setBusy(false);
    if (out.ok) setRedemption({ id: out.value.id, kind: 'redeem', code: out.value.code, status: 'open', offer_title: offer.title });
    else setError(out.error);
  };

  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const out = await sendOfferRequest(venueId, tableNumber, { offer_id: offer.id, kind: 'inquiry', message: question.trim() });
    setBusy(false);
    if (out.ok) { setAsked(true); setQuestion(''); }
    else setError(out.error);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={offer.title} className="fixed inset-0 z-[120] flex items-end justify-center bg-neutral-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md space-y-5 rounded-t-3xl border border-neutral-200 bg-white p-6 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-block rounded-full border border-amber-300/80 bg-amber-50 px-3 py-0.5 font-mono text-xs font-bold text-amber-900">{offer.discount_badge}</span>
            <h3 className="mt-2 font-serif text-xl text-neutral-950">{offer.title}</h3>
            {offer.description && <p className="mt-1 text-xs leading-relaxed text-neutral-600">{offer.description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 rounded-full border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-50 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {redemption?.kind === 'redeem' ? (
          <div className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Your code</p>
            <p className="font-mono text-3xl font-bold tracking-[0.3em] text-neutral-950">{redemption.code}</p>
            {redemption.status === 'open' && (
              <p className="flex items-center justify-center gap-2 text-xs text-neutral-600"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Show this code at the counter. Waiting for the host.</p>
            )}
            {redemption.status === 'settled' && (
              <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700"><Check className="h-4 w-4" /> Settled. Enjoy!</p>
            )}
            {redemption.status === 'closed' && <p className="text-xs text-neutral-600">This redemption was cancelled. Ask the host if you think this is a mistake.</p>}
          </div>
        ) : (
          <button
            type="button"
            onClick={redeem}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-950 py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ticket className="h-3.5 w-3.5" />} Redeem this offer
          </button>
        )}

        <form onSubmit={ask} className="space-y-2 border-t border-neutral-200 pt-4">
          <label htmlFor={`ask-${offer.id}`} className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Ask the host</label>
          <textarea
            id={`ask-${offer.id}`}
            rows={2}
            maxLength={300}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Does this work on the terrace too?"
            className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-neutral-500">{asked ? 'Sent to the host.' : ' '}</p>
            <button
              type="submit"
              disabled={busy || !question.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-900 hover:bg-neutral-50 disabled:opacity-40 cursor-pointer"
            >
              <MessageCircle className="h-3.5 w-3.5" /> Send question
            </button>
          </div>
        </form>

        {error && <p role="alert" className="text-xs font-medium text-rose-600">{error}</p>}
      </div>
    </div>
  );
}

export default OfferActionSheet;
