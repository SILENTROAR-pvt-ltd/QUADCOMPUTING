'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, MessageCircle, Ticket, X } from 'lucide-react';
import type { VenueLiveOffer } from '@/types/offers';
import { useOfferRequest } from './useOfferRequest';
import { press, SPRING } from '@/components/guest/menu/motion';

interface OfferActionSheetProps {
  venueId: string;
  tableNumber: string;
  offer: VenueLiveOffer;
  onClose: () => void;
}

/** One live offer: redeem it for a code the host settles, or ask the host a question about it. */
export function OfferActionSheet({ venueId, tableNumber, offer, onClose }: OfferActionSheetProps) {
  const r = useOfferRequest(venueId, tableNumber, offer);
  const code = r.redemption?.kind === 'redeem' ? r.redemption : null;

  return (
    <div role="dialog" aria-modal="true" aria-label={offer.title} onClick={onClose}
      className="fixed inset-0 z-[120] flex items-end justify-center bg-neutral-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <motion.div onClick={(e) => e.stopPropagation()} initial={{ y: 56, opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} transition={SPRING}
        className="max-h-[92dvh] w-full max-w-md space-y-5 overflow-y-auto overscroll-contain rounded-t-3xl border border-neutral-200 bg-white p-6 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-block rounded-full border border-amber-300/80 bg-amber-50 px-3 py-0.5 font-mono text-xs font-bold text-amber-900">{offer.discount_badge}</span>
            <h3 className="mt-2 font-sans text-[19px] font-semibold leading-snug tracking-tight text-neutral-950">{offer.title}</h3>
            {offer.description && <p className="mt-1 text-xs leading-relaxed text-neutral-600">{offer.description}</p>}
          </div>
          <motion.button type="button" onClick={onClose} aria-label="Close" {...press} className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full border border-neutral-200 text-neutral-600 hover:bg-neutral-50">
            <X className="h-4 w-4" />
          </motion.button>
        </div>

        {code ? (
          <div className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Your code</p>
            <p className="font-mono text-3xl font-bold tracking-[0.3em] text-neutral-950">{code.code}</p>
            {code.status === 'open' && <p className="flex items-center justify-center gap-2 text-xs text-neutral-600"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Show this code at the counter. Our team will confirm it shortly.</p>}
            {code.status === 'settled' && <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700"><Check className="h-4 w-4" /> Settled. Enjoy!</p>}
            {code.status === 'closed' && <p className="text-xs text-neutral-600">This redemption was cancelled. Please ask our team if you think this is a mistake.</p>}
          </div>
        ) : (
          <motion.button type="button" onClick={() => void r.redeem()} disabled={r.busy} {...press}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-neutral-950 py-3.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-neutral-800 disabled:opacity-50">
            {r.busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ticket className="h-3.5 w-3.5" />} Redeem this offer
          </motion.button>
        )}

        <form onSubmit={(e) => { e.preventDefault(); void r.ask(); }} className="space-y-2 border-t border-neutral-200 pt-4">
          <label htmlFor={`ask-${offer.id}`} className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Ask our team</label>
          <textarea id={`ask-${offer.id}`} rows={2} maxLength={300} value={r.question} onChange={(e) => r.setQuestion(e.target.value)} placeholder="e.g. Does this work on the terrace too?"
            className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[16px] text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none" />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-neutral-500">{r.asked ? 'Sent to our team.' : ' '}</p>
            <button type="submit" disabled={r.busy || !r.question.trim()}
              className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-neutral-200 px-4 text-xs font-semibold text-neutral-900 hover:bg-neutral-50 disabled:opacity-40">
              <MessageCircle className="h-3.5 w-3.5" /> Send question
            </button>
          </div>
        </form>

        {r.error && <p role="alert" className="text-xs font-medium text-rose-600">{r.error}</p>}
      </motion.div>
    </div>
  );
}

export default OfferActionSheet;
