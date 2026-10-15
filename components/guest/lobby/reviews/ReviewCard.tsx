'use client';

import React from 'react';
import { PremiumStar } from '@/components/guest/menu/tracker/PremiumStar';
import { timeAgo } from '@/components/guest/vibers-lobby/lobby-format';
import type { ReviewItem } from './review.types';
import { ReviewAvatar } from './ReviewAvatar';

interface ReviewCardProps {
  review: ReviewItem;
  onPhotoClick?: (url: string) => void;
}

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;

/** One guest's review as a quiet testimonial: who, when, the stars, their words in serif, what stood out, and any photos. */
export function ReviewCard({ review, onPhotoClick }: ReviewCardProps) {
  const when = review.createdAt ? timeAgo(review.createdAt) : review.timestamp;
  const photos = review.images ?? [];
  return (
    <article className="rounded-[22px] border border-neutral-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] [content-visibility:auto] [contain-intrinsic-size:auto_190px]">
      <header className="flex items-center gap-3">
        <ReviewAvatar review={review} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-neutral-950">{review.author}</p>
          <p className="truncate text-[11px] text-neutral-500">{review.table ? `Table ${review.table} · ` : ''}{when}</p>
        </div>
        <div className="flex shrink-0 gap-px" role="img" aria-label={`${review.rating} out of 5 stars`}>
          {[1, 2, 3, 4, 5].map((n) => <PremiumStar key={n} filled={n <= Math.round(review.rating)} className="h-4 w-4" />)}
        </div>
      </header>

      {review.comment && (
        <blockquote className="mt-3 whitespace-pre-line break-words text-[16px] italic leading-[1.55] text-[#2b2a33]" style={SERIF}>
          “{review.comment}”
        </blockquote>
      )}

      {photos.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {photos.map((img, idx) => (
            <button key={idx} type="button" onClick={() => onPhotoClick?.(img)} className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100 cursor-pointer active:scale-95">
              {/* eslint-disable-next-line @next/next/no-img-element -- a guest's own photo; images.unoptimized is set */}
              <img src={img} alt={`Review photo ${idx + 1}`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {review.tags?.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {review.tags.map((tag) => (
            <li key={tag} className="rounded-full border border-neutral-200 bg-[#faf8f2] px-2.5 py-1 text-[11px] font-medium text-neutral-600">{tag}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default ReviewCard;
