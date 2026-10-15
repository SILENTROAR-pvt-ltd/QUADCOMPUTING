'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, Wallet } from 'lucide-react';
import { getKnownOrder } from '../hooks/guest-storage.util';
import { SettledBillSheet } from './SettledBillSheet';
import { PremiumStar } from './PremiumStar';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';

interface Props {
  tableNumber: string;
  settledTotal: number;
  cafeName?: string;
  /** Needed to send a review to the right venue. Without it the review box is not shown. */
  venueId?: string;
  /** The order id from the page, when it has one. Otherwise the id this device remembered. */
  orderId?: string | null;
  /** Cashback actually credited to the wallet ledger for this bill: not a client-side 7% of the total, which claimed a credit that may never have been written. */
  cashbackCredited?: number;
  /** Only a signed-in guest has a wallet to credit, so only they are told about cashback. */
  signedIn?: boolean;
}

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;
const THANK_YOU = '/media/stickers/thank-you-v1.webp';
const REVIEW_TAGS = ['Taste', 'On-time service', 'Cleanliness', 'Friendly staff', 'Ambience', 'Value for money'];
const RATING_WORDS = ['', 'We are sorry to hear that', 'Thank you for telling us', 'Thank you', 'We are glad you enjoyed it', 'It was a pleasure to host you'];
const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function TrackerSettledView({ tableNumber, settledTotal, cafeName, venueId, orderId: orderIdProp, cashbackCredited = 0, signedIn = false }: Props) {
  const total = Number(settledTotal || 0);
  const cashback = Number(cashbackCredited || 0);
  const venue = cafeName || 'us';

  // The order this device took part in: the proof that lets it see its own bill.
  const [storedOrder, setStoredOrder] = useState('');
  const orderId = orderIdProp || storedOrder;
  const [sheet, setSheet] = useState<null | 'view' | 'download'>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    if (total <= 0) return;
    try { window.dispatchEvent(new CustomEvent('guest-wallet:refresh')); } catch {}
  }, [total]);
  useEffect(() => { if (venueId) setStoredOrder(getKnownOrder(venueId, tableNumber)); }, [venueId, tableNumber]);

  // One review per settled bill on this phone.
  const reviewKey = `qc_reviewed_${venueId || 'v'}_${tableNumber}_${orderId || total}`;
  useEffect(() => {
    try { if (window.localStorage.getItem(reviewKey)) setSent(true); } catch {}
  }, [reviewKey]);

  if (total <= 0) return null;

  const submitReview = async () => {
    if (!venueId || rating < 1 || sending) return;
    setSending(true); setReviewError('');
    const result = await apiRequest(`/api/guest/reviews?cafe_id=${encodeURIComponent(venueId)}`, jsonRequest('POST', {
      cafe_id: venueId, table: tableNumber, rating, comment: comment.trim(), tags,
    }));
    setSending(false);
    if (!result.ok) { setReviewError('We could not send your review just now. Please try again.'); return; }
    setSent(true);
    try { window.localStorage.setItem(reviewKey, '1'); } catch {}
  };

  return (
    <motion.section
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="mb-6 w-full overflow-hidden rounded-[28px] border border-neutral-200/80 bg-[#fcfaf4] shadow-[0_24px_60px_-30px_rgba(10,50,34,0.45)]"
    >
      {/* The thank-you */}
      <div className="relative px-6 pb-6 pt-7 text-center">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(120,100,60,0.08),transparent_75%)]" />
        {/* eslint-disable-next-line @next/next/no-img-element -- a 105 KB animated sticker from public/media; images.unoptimized is set, and next/image would flatten the animation */}
        <img src={THANK_YOU} alt="Thank you" width={132} height={122} draggable={false} className="relative mx-auto h-[122px] w-[132px] select-none object-contain" />
        <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-400">Table {tableNumber} · Bill settled</p>
        <h3 className="mx-auto mt-2 max-w-sm text-[26px] leading-[1.15] text-zinc-950 [text-wrap:balance]" style={SERIF}>
          Thank you for dining with {venue}.
        </h3>
        <p className="mx-auto mt-2.5 max-w-sm text-[13px] leading-relaxed text-zinc-500 [text-wrap:balance]">
          It was a pleasure to host you. Your payment is complete and the table has been released. We hope to welcome you again very soon.
        </p>
      </div>

      {signedIn && cashback > 0 && (
        <div className="mx-5 mb-4 flex items-center gap-3.5 rounded-2xl border border-neutral-200 bg-white px-4 py-3.5">
          <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-zinc-950 text-white">
            <Wallet className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-400">A little thank-you</p>
            <p className="mt-0.5 text-[17px] leading-snug text-zinc-950" style={SERIF}>{inr(cashback)} added to your wallet</p>
            <p className="mt-0.5 text-[12px] leading-snug text-zinc-500">Ready for your next visit to {venue === 'us' ? 'us' : venue}. We look forward to welcoming you back.</p>
          </div>
        </div>
      )}
      {/* The bill: paid total, and the venue's own bill to view or keep */}
      <div className="mx-5 rounded-2xl border border-neutral-200 bg-white px-4 py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Total paid</span>
          <span className="text-[28px] leading-none text-zinc-950" style={SERIF}>{inr(total)}</span>
        </div>

        {venueId && orderId ? (
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setSheet('view')}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-4 text-[13px] font-semibold text-zinc-900 transition-colors hover:bg-neutral-50 active:scale-[0.98] cursor-pointer"
            >
              <FileText className="h-4 w-4" aria-hidden /> View bill
            </button>
            <button
              type="button"
              onClick={() => setSheet('download')}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-zinc-950 px-4 text-[13px] font-semibold text-white shadow-[0_10px_20px_-12px_rgba(0,0,0,0.6)] transition-colors hover:bg-zinc-800 active:scale-[0.98] cursor-pointer"
            >
              <Download className="h-4 w-4" aria-hidden /> Download bill
            </button>
          </div>
        ) : (
          <p className="mt-3 text-center text-[11.5px] leading-snug text-zinc-400">Your full bill is under the Me tab.</p>
        )}
      </div>
      {/* A review, if the guest would like to leave one */}
      {venueId && (
        <div className="mx-5 mb-5 mt-4 rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-center">
          {sent ? (
            <div className="py-1">
              <p className="text-[15px] text-zinc-950" style={SERIF}>Thank you for your kind words.</p>
              <p className="mt-1 text-[12px] text-zinc-500">Your review helps us look after every guest better.</p>
            </div>
          ) : (
            <>
              <p className="text-[15px] text-zinc-950" style={SERIF}>How was your visit?</p>
              <div role="radiogroup" aria-label="Your rating" className="mt-2.5 flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
                    onClick={() => setRating(n)}
                    className="grid h-11 w-11 place-items-center rounded-full transition-transform duration-200 hover:scale-110 active:scale-90 cursor-pointer"
                  >
                    <PremiumStar filled={n <= rating} className="h-9 w-9" />
                  </button>
                ))}
              </div>              <p className="mt-1 h-4 text-[11.5px] text-zinc-400">{RATING_WORDS[rating]}</p>
              {rating > 0 && (
                <div className="mt-2 space-y-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">{rating >= 4 ? 'What stood out?' : 'What could be better?'}</p>
                    <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                      {REVIEW_TAGS.map((tag) => {
                        const on = tags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            aria-pressed={on}
                            onClick={() => setTags((cur) => (on ? cur.filter((x) => x !== tag) : [...cur, tag]))}
                            className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors cursor-pointer ${on ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-neutral-200 bg-white text-zinc-700 hover:border-neutral-300'}`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value.slice(0, 500))}
                    rows={3}
                    placeholder="Tell us what you enjoyed, or how we can do better (optional)"
                    className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:outline-none"
                  />
                  {reviewError && <p role="alert" className="text-[12px] font-medium text-rose-600">{reviewError}</p>}
                  <button
                    type="button"
                    onClick={submitReview}
                    disabled={sending}
                    className="inline-flex h-11 w-full items-center justify-center rounded-full bg-zinc-950 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                  >
                    {sending ? 'Sending…' : 'Submit review'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
      {!venueId && <div className="pb-5" />}
      {sheet && venueId && orderId && (
        <SettledBillSheet venueId={venueId} table={tableNumber} orderId={orderId} venueName={cafeName} autoDownload={sheet === 'download'} onClose={() => setSheet(null)} />
      )}
    </motion.section>
  );
}
