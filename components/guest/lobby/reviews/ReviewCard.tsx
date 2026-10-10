'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Star, CheckCircle2, ThumbsUp } from 'lucide-react';
import { ReviewItem } from './review.types';
import { ReviewAvatar } from './ReviewAvatar';

interface ReviewCardProps {
  review: ReviewItem;
  onPhotoClick?: (url: string) => void;
}

export function ReviewCard({ review, onPhotoClick }: ReviewCardProps) {
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount || 0);
  const [hasVotedHelpful, setHasVotedHelpful] = useState(false);

  const toggleHelpful = () => {
    if (hasVotedHelpful) {
      setHelpfulCount((prev) => Math.max(0, prev - 1));
      setHasVotedHelpful(false);
    } else {
      setHelpfulCount((prev) => prev + 1);
      setHasVotedHelpful(true);
    }
  };

  return (
    <article className="bg-white border border-neutral-200 hover:border-neutral-300 transition-all rounded-2xl p-5 flex flex-col justify-between gap-4 group relative overflow-hidden">
      <div>
        {/* Header row: Author, Table, Stars & Verified Pill */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <ReviewAvatar review={review} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-serif text-base font-normal tracking-tight text-neutral-950 truncate">
                  {review.author}
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium text-neutral-600 bg-neutral-50 border border-neutral-200">
                  {review.table}
                </span>
                {review.verified && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    Verified Visit
                  </span>
                )}
              </div>
              <p className="text-[10px] text-neutral-500 mt-0.5">{review.timestamp}</p>
            </div>
          </div>

          {/* Ancient Light Cream Glowing Stars */}
          <div className="flex items-center gap-1 flex-shrink-0 pt-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-3.5 h-3.5 ${
                  i < review.rating
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-transparent text-neutral-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Editorial Feedback Text */}
        <p className="text-xs sm:text-[13px] leading-relaxed text-neutral-700 font-normal">
          {review.comment}
        </p>

        {/* Guest Attached Photos Grid */}
        {review.images && review.images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3.5">
            {review.images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onPhotoClick?.(img)}
                className="relative aspect-video sm:aspect-square w-full rounded-xl overflow-hidden border border-neutral-200 group/img cursor-pointer transition-transform hover:scale-[1.03] active:scale-95 shadow-md"
              >
                <Image
                  src={img}
                  alt={`Review photo ${idx + 1}`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover/img:scale-105"
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/20 group-hover/img:bg-transparent transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer: Experience Tags & Helpful Button */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-neutral-200 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {review.tags?.map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-medium text-neutral-500 bg-neutral-50 px-2 py-0.5 rounded-md border border-neutral-200"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Helpful Counter Button with Ancient Light Cream Accent */}
        <button
          type="button"
          onClick={toggleHelpful}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all cursor-pointer ${
            hasVotedHelpful
              ? 'bg-neutral-950 text-white border border-neutral-950'
              : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-950 border border-neutral-200'
          }`}
          aria-label="Mark review as helpful"
        >
          <ThumbsUp className="w-3 h-3" />
          <span>Helpful ({helpfulCount})</span>
        </button>
      </div>
    </article>
  );
}

export default ReviewCard;
