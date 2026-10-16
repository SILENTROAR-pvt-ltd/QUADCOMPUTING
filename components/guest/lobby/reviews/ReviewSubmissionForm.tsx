'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { BottomSheet } from '@/components/guest/shared/BottomSheet';
import { press } from '@/components/guest/menu/motion';
import { AVAILABLE_REVIEW_TAGS } from './reviews.constants';
import { RatingStars } from './RatingStars';
import type { ReviewSubmissionPayload } from './review.types';

interface ReviewSubmissionFormProps {
  currentUserName: string;
  currentUserTable: string;
  venueName?: string;
  /** Resolves with an error message when the review could not be saved. */
  onSubmit: (payload: ReviewSubmissionPayload) => Promise<string | null>;
  onCancel: () => void;
}

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;
const COMMENT_MAX = 600;

/**
 * Writing a review, as a sheet over the page: tap the stars, say what stood out, add a few words if you like. Nothing is
 * pre-filled (no rating, no tags), and the review is only shown as posted once the venue has saved it.
 */
export function ReviewSubmissionForm({ currentUserName, currentUserTable, venueName, onSubmit, onCancel }: ReviewSubmissionFormProps) {
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const author = currentUserName && currentUserName !== 'You' ? currentUserName : 'Guest';
  const table = currentUserTable || 'T-01';
  const ready = rating > 0 && (comment.trim().length > 0 || tags.length > 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    const failure = await onSubmit({ author, table, rating, comment: comment.trim(), tags });
    setBusy(false);
    if (failure) setError(failure);
  };

  return (
    <BottomSheet labelledBy="review-title" onClose={onCancel} locked={busy}>
      <form onSubmit={submit} className="flex flex-col">
        <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-neutral-400">Your visit</p>
        <h2 id="review-title" className="mt-1 text-[24px] leading-tight text-zinc-950" style={SERIF}>How was {venueName || 'your visit'}?</h2>

        <RatingStars rating={rating} onRate={setRating} />

        <div className="mt-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400">{rating > 0 && rating <= 3 ? 'What could be better?' : 'What stood out?'}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {AVAILABLE_REVIEW_TAGS.map((tag) => {
              const on = tags.includes(tag);
              return (
                <motion.button key={tag} type="button" aria-pressed={on} {...press} onClick={() => setTags((cur) => (on ? cur.filter((x) => x !== tag) : [...cur, tag]))}
                  className={`cursor-pointer rounded-full border px-3.5 py-2.5 text-[12.5px] font-medium transition-colors ${on ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-neutral-200 bg-white text-zinc-700'}`}>
                  {tag}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          <textarea value={comment} maxLength={COMMENT_MAX} onChange={(e) => setComment(e.target.value)} rows={4} aria-label="Your review"
            placeholder="Tell us about your visit, in your own words (optional)"
            className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-[16px] leading-relaxed text-zinc-900 placeholder:text-neutral-400 focus:border-zinc-900 focus:outline-none" />
          <p className="mt-1 text-right text-[11px] text-neutral-400">{comment.length}/{COMMENT_MAX}</p>
        </div>

        {error && <p role="alert" className="mt-1 text-center text-[12.5px] font-medium text-rose-600">{error}</p>}

        <motion.button type="submit" disabled={!ready || busy} {...press}
          className="mt-3 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-zinc-950 text-[14px] font-semibold text-white shadow-[0_14px_26px_-14px_rgba(0,0,0,0.7)] hover:bg-zinc-800 disabled:opacity-40">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {busy ? 'Sending…' : 'Share my review'}
        </motion.button>
        <p className="mt-2.5 text-center text-[11px] leading-snug text-neutral-400">Shown with your name and table, {author} · {table}.</p>
      </form>
    </BottomSheet>
  );
}

export default ReviewSubmissionForm;
