'use client';

import React from 'react';
import { initials } from '@/components/guest/vibers-lobby/lobby-format';
import type { ReviewItem } from './review.types';

/** The reviewer's photo, or their emoji avatar, or initials for a review written before accounts. */
export function ReviewAvatar({ review }: { review: Pick<ReviewItem, 'author' | 'avatarUrl' | 'avatarEmoji'> }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#e8e2d5] bg-[#faf8f5] text-sm font-semibold text-neutral-700">
      {review.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={review.avatarUrl} alt={review.author} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true" className={review.avatarEmoji ? 'text-lg' : ''}>
          {review.avatarEmoji || initials(review.author)}
        </span>
      )}
    </span>
  );
}

export default ReviewAvatar;
