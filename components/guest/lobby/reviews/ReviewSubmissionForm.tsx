'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { PremiumStar } from '@/components/guest/menu/tracker/PremiumStar';
import { AVAILABLE_REVIEW_TAGS } from './reviews.constants';
import { RATING_WORDS } from './review-look';
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
  const [hover, setHover] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel(); };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [onCancel, busy]);

  const shown = hover || rating;
  const ready = rating > 0 && (comment.trim().length > 0 || tags.length > 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    const failure = await onSubmit({
      author: currentUserName && currentUserName !== 'You' ? currentUserName : 'Guest',
      table: currentUserTable || 'T-01',
      rating,
      comment: comment.trim(),
      tags,
    });
    setBusy(false);
    if (failure) setError(failure);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-zinc-950/45 sm:items-center sm:p-6" onClick={() => { if (!busy) onCancel(); }}>
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94dvh] w-full max-w-md flex-col overflow-y-auto rounded-t-[28px] bg-[#faf8f2] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] pt-5 shadow-2xl sm:rounded-[28px]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-neutral-400">Your visit</p>
            <h2 id="review-title" className="mt-1 text-[24px] leading-tight text-zinc-950" style={SERIF}>How was {venueName || 'your visit'}?</h2>
          </div>
          <button type="button" onClick={onCancel} disabled={busy} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-zinc-500 hover:bg-black/5 disabled:opacity-40 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 rounded-[22px] border border-neutral-200/80 bg-white px-4 py-5 text-center">
          <div role="radiogroup" aria-label="Your rating" className="flex justify-center gap-1.5" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                className="grid h-12 w-12 place-items-center rounded-full transition-transform duration-200 hover:scale-110 active:scale-90 cursor-pointer"
              >
                <PremiumStar filled={n <= shown} className="h-10 w-10" />
              </button>
            ))}
          </div>
          <p className="mt-1.5 h-5 text-[14px] italic text-zinc-600" style={SERIF}>{RATING_WORDS[shown]}</p>
        </div>

        <div className="mt-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400">{rating > 0 && rating <= 3 ? 'What could be better?' : 'What stood out?'}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {AVAILABLE_REVIEW_TAGS.map((tag) => {
              const on = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setTags((cur) => (on ? cur.filter((x) => x !== tag) : [...cur, tag]))}
                  className={`rounded-full border px-3.5 py-2 text-[12.5px] font-medium transition-colors cursor-pointer ${on ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-neutral-200 bg-white text-zinc-700 hover:border-neutral-300'}`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          <textarea
            value={comment}
            maxLength={COMMENT_MAX}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            aria-label="Your review"
            placeholder="Tell us about your visit, in your own words (optional)"
            className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-[14px] leading-relaxed text-zinc-900 placeholder:text-neutral-400 focus:border-zinc-900 focus:outline-none"
          />
          <p className="mt-1 text-right text-[11px] text-neutral-400">{comment.length}/{COMMENT_MAX}</p>
        </div>

        {error && <p role="alert" className="mt-1 text-center text-[12.5px] font-medium text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={!ready || busy}
          className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-zinc-950 text-[14px] font-semibold text-white shadow-[0_14px_26px_-14px_rgba(0,0,0,0.7)] transition-colors hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-40 cursor-pointer"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {busy ? 'Sending…' : 'Share my review'}
        </button>
        <p className="mt-2.5 text-center text-[11px] leading-snug text-neutral-400">Shown with your name and table, {currentUserName && currentUserName !== 'You' ? currentUserName : 'Guest'} · {currentUserTable || 'T-01'}.</p>
      </form>
    </div>
  );
}

export default ReviewSubmissionForm;
