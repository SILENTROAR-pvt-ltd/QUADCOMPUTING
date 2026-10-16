'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { PremiumStar } from './PremiumStar';
import { press } from '../motion';
import type { useVisitReview } from './useVisitReview';

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;
const TAGS = ['Taste', 'On-time service', 'Cleanliness', 'Friendly staff', 'Ambience', 'Value for money'];
const WORDS = ['', 'We are sorry to hear that', 'Thank you for telling us', 'Thank you', 'We are glad you enjoyed it', 'It was a pleasure to host you'];

/** "How was your visit?": five stars, then (once rated) what stood out, a note and Submit. Becomes a thank-you when sent. */
export function VisitReviewBox({ review }: { review: ReturnType<typeof useVisitReview> }) {
  const r = review;
  if (r.sent) {
    return (
      <div className="mx-5 mb-5 mt-4 rounded-2xl border border-neutral-200 bg-white px-4 py-5 text-center">
        <p className="text-[15px] text-zinc-950" style={SERIF}>Thank you for your kind words.</p>
        <p className="mt-1 text-[12px] text-zinc-500">Your review helps us look after every guest better.</p>
      </div>
    );
  }
  return (
    <div className="mx-5 mb-5 mt-4 rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-center">
      <p className="text-[15px] text-zinc-950" style={SERIF}>How was your visit?</p>
      <div role="radiogroup" aria-label="Your rating" className="mt-2.5 flex justify-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <motion.button key={n} type="button" role="radio" aria-checked={r.rating === n} aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
            onClick={() => r.setRating(n)} {...press} className="grid h-11 w-11 cursor-pointer place-items-center rounded-full">
            <PremiumStar filled={n <= r.rating} className="h-9 w-9" />
          </motion.button>
        ))}
      </div>
      <p className="mt-1 h-4 text-[11.5px] text-zinc-400">{WORDS[r.rating]}</p>

      {r.rating > 0 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-2 space-y-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">{r.rating >= 4 ? 'What stood out?' : 'What could be better?'}</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {TAGS.map((tag) => {
              const on = r.tags.includes(tag);
              return (
                <motion.button key={tag} type="button" aria-pressed={on} onClick={() => r.toggleTag(tag)} {...press}
                  className={`cursor-pointer rounded-full border px-3 py-2 text-[12px] font-medium ${on ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-neutral-200 bg-white text-zinc-700'}`}>
                  {tag}
                </motion.button>
              );
            })}
          </div>
          <textarea value={r.comment} onChange={(e) => r.setComment(e.target.value)} rows={3}
            placeholder="Tell us what you enjoyed, or how we can do better (optional)"
            className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-[16px] text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:outline-none sm:text-[13px]" />
          {r.error && <p role="alert" className="text-[12px] font-medium text-rose-600">{r.error}</p>}
          <motion.button type="button" onClick={() => void r.submit()} disabled={r.sending} {...press}
            className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-full bg-zinc-950 text-[13px] font-semibold text-white disabled:opacity-60">
            {r.sending ? 'Sending…' : 'Submit review'}
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
