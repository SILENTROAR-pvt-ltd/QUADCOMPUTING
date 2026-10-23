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

const SERIF = { fontFamily: "var(--font-luxe), 'Playfair Display', Georgia, serif" } as const;

/** One guest's review as a quiet testimonial: who, when, the stars, their words in serif, what stood out, and any photos. */
export function ReviewCard({ review, onPhotoClick }: ReviewCardProps) {
  const when = review.createdAt ? timeAgo(review.createdAt) : review.timestamp;
  const photos = review.images ?? [];
  return (
    <article className="relative overflow-hidden rounded-[24px] border border-[#e8dfcc] bg-[#fbf9f4] p-4 shadow-[0_18px_36px_-30px_rgba(15,42,30,0.55)] [content-visibility:auto] [contain-intrinsic-size:auto_190px]">
      <span aria-hidden className="pointer-events-none absolute -bottom-14 right-3 text-[120px] leading-none text-[#d9c193]/30" style={SERIF}>&rdquo;</span>
      <header className="relative flex items-center gap-3">
        <ReviewAvatar review={review} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-[#10231a]">{review.author}</p>
          <p className="truncate text-[10.5px] font-medium uppercase tracking-[0.14em] text-[#8a6d3f]">{review.table ? `Table ${review.table} · ` : ''}{when}</p>
        </div>
        <div className="flex shrink-0 gap-px" role="img" aria-label={`${review.rating} out of 5 stars`}>
          {[1, 2, 3, 4, 5].map((n) => <PremiumStar key={n} filled={n <= Math.round(review.rating)} className="h-4 w-4" />)}
        </div>
      </header>

      {review.comment && (
        <blockquote className="relative mt-3 whitespace-pre-line break-words text-[19px] italic leading-[1.45] text-[#10231a]/90" style={SERIF}>
          “{review.comment}”
        </blockquote>
      )}

      {photos.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {photos.map((img, idx) => (
            <button key={idx} type="button" onClick={() => onPhotoClick?.(img)} className="relative aspect-square overflow-hidden rounded-[14px] bg-[#efe7d6] ring-1 ring-[#e8dfcc] cursor-pointer active:scale-95">
              {/* eslint-disable-next-line @next/next/no-img-element -- a guest's own photo; images.unoptimized is set */}
              <img src={img} alt={`Review photo ${idx + 1}`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {review.tags?.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {review.tags.map((tag) => (
            <li key={tag} className="rounded-full border border-[#d9c193] bg-[#fbf6e8] px-2.5 py-1 text-[11px] font-medium text-[#6f5631]">{tag}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default ReviewCard;
