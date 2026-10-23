'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, MessageCircle, Ticket, X } from 'lucide-react';
import type { VenueLiveOffer } from '@/types/offers';
import { useOfferRequest } from './useOfferRequest';
import { press, SPRING } from '@/components/guest/menu/motion';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';
import s from '@/components/guest/luxe/luxe-guest.module.css';

interface OfferActionSheetProps {
  venueId: string;
  tableNumber: string;
  offer: VenueLiveOffer;
  onClose: () => void;
}

/**
 * One live offer, opened like an event: its photo drifting under a curved edge with the saving over it, a few words about
 * it, then redeem it for a code the host settles, or ask the host a question about it.
 */
export function OfferActionSheet({ venueId, tableNumber, offer, onClose }: OfferActionSheetProps) {
  const r = useOfferRequest(venueId, tableNumber, offer);
  const code = r.redemption?.kind === 'redeem' ? r.redemption : null;

  return (
    <div role="dialog" aria-modal="true" aria-label={offer.title} onClick={onClose}
      className="fixed inset-0 z-[120] flex items-end justify-center bg-[#08160f]/55 sm:items-center sm:p-4">
      <motion.div onClick={(e) => e.stopPropagation()} initial={{ y: 70, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={SPRING}
        className="max-h-[94dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[30px] bg-[#fbf9f4] shadow-2xl sm:rounded-[30px]">
        {/* Without a photo the forest panel is shorter: it only has to carry the words. */}
        <div className={`relative overflow-hidden bg-[radial-gradient(circle_at_30%_20%,#1d4632,#0f2a1e)] [border-radius:0_0_50%_50%/0_0_14%_14%] ${offer.image_url ? 'aspect-[16/10]' : 'aspect-[16/8]'}`}>
          {offer.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- the offer's photo, stored by the venue
            <img src={offer.image_url} alt="" className={`${s.slowmo} h-full w-full object-cover`} />
          ) : (
            <Ticket aria-hidden className="absolute left-1/2 top-[36%] h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-[#d9c193]/70" />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,22,15,0.45)_0%,transparent_32%,rgba(8,22,15,0.9)_100%)]" />
          <motion.button type="button" onClick={onClose} aria-label="Close" {...press} className="absolute right-3 top-3 grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-[#f5f1e8]/90 text-[#0f2a1e]">
            <X className="h-4 w-4" />
          </motion.button>
          <div className="absolute inset-x-0 bottom-0 px-6 pb-8 text-[#f5f1e8]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#d9c193]">Live offer · {offer.title}</p>
            <h3 className="mt-1 text-[2rem] font-medium leading-[1.02] [text-wrap:balance]" style={LUXE_SERIF}>{offer.discount_badge}</h3>
          </div>
        </div>

        <div className="space-y-5 px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-5">
          {offer.description && <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-[#10231a]/70">{offer.description}</p>}

          {code ? (
            <div className="space-y-2 rounded-[1.5rem] border border-[#d9c193] bg-[linear-gradient(160deg,#fbf6e8,#f3ead6)] p-5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#8a6d3f]">Your code</p>
              <p className="font-mono text-3xl font-semibold tracking-[0.3em] text-[#10231a]">{code.code}</p>
              {code.status === 'open' && <p className="flex items-center justify-center gap-2 text-xs text-[#10231a]/65"><Loader2 className="h-3.5 w-3.5 animate-spin text-[#8a6d3f]" /> Show this code at the counter. Our team will confirm it shortly.</p>}
              {code.status === 'settled' && <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#173a2a]"><Check className="h-4 w-4" /> Settled. Enjoy!</p>}
              {code.status === 'closed' && <p className="text-xs text-[#10231a]/65">This redemption was cancelled. Please ask our team if you think this is a mistake.</p>}
            </div>
          ) : (
            <motion.button type="button" onClick={() => void r.redeem()} disabled={r.busy} {...press}
              className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] text-[13.5px] font-semibold text-[#f5f1e8] shadow-[0_12px_24px_-12px_rgba(15,42,30,0.85)] ring-1 ring-[#d9c193]/35 disabled:opacity-50">
              {r.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4 text-[#d9c193]" />} Redeem this offer
            </motion.button>
          )}

          <form onSubmit={(e) => { e.preventDefault(); void r.ask(); }} className="space-y-2.5 border-t border-[#e8dfcc] pt-5">
            <label htmlFor={`ask-${offer.id}`} className="block text-[1.35rem] font-medium text-[#10231a]" style={LUXE_SERIF}>Ask our team</label>
            <textarea id={`ask-${offer.id}`} rows={2} maxLength={300} value={r.question} onChange={(e) => r.setQuestion(e.target.value)} placeholder="e.g. Does this work on the terrace too?"
              className="w-full resize-none rounded-2xl border border-[#e8dfcc] bg-[#fbf9f4] px-4 py-3 text-[16px] text-[#10231a] placeholder-[#10231a]/40 outline-none transition focus:border-[#b08d57] focus:ring-4 focus:ring-[#d9c193]/20" />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-[#173a2a]">{r.asked ? 'Sent to our team.' : ' '}</p>
              <button type="submit" disabled={r.busy || !r.question.trim()}
                className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full border border-[#d9c193] bg-[#fbf9f4] px-4 text-xs font-semibold text-[#10231a] hover:border-[#b08d57] disabled:opacity-40">
                <MessageCircle className="h-3.5 w-3.5 text-[#8a6d3f]" /> Send question
              </button>
            </div>
          </form>

          {r.error && <p role="alert" className="rounded-xl border border-[#e7b4a8] bg-[#fbeeea] px-3 py-2 text-xs text-[#8a2d1c]">{r.error}</p>}
        </div>
      </motion.div>
    </div>
  );
}

export default OfferActionSheet;
