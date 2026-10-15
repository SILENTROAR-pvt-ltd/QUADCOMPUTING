'use client';

import React from 'react';
import { PremiumStar } from '@/components/guest/menu/tracker/PremiumStar';
import type { StarDistributionItem } from './review.types';

interface ReviewScoreSummaryProps {
  overallScore: number;
  totalReviews: number;
  distribution: StarDistributionItem[];
  /** The star row currently used as a filter (5, 4 or 3 meaning "3 and below"), or null. */
  activeStar: number | null;
  onSelectStar: (star: number | null) => void;
}

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;

/** The venue's rating: the score in large type, lit stars, and one tappable bar per star count. Real reviews only. */
export function ReviewScoreSummary({ overallScore, totalReviews, distribution, activeStar, onSelectStar }: ReviewScoreSummaryProps) {
  const lit = Math.round(overallScore);
  return (
    <div className="rounded-[24px] border border-neutral-200/80 bg-white p-5 shadow-[0_18px_34px_-26px_rgba(40,30,10,0.45)]">
      <div className="flex items-center gap-5">
        <div className="shrink-0 text-center">
          <p className="text-[52px] leading-none text-zinc-950" style={SERIF}>{totalReviews === 0 ? '–' : overallScore.toFixed(1)}</p>
          <div className="mt-2 flex justify-center gap-0.5" role="img" aria-label={totalReviews === 0 ? 'No ratings yet' : `${overallScore.toFixed(1)} out of 5`}>
            {[1, 2, 3, 4, 5].map((n) => <PremiumStar key={n} filled={totalReviews > 0 && n <= lit} className="h-[17px] w-[17px]" />)}
          </div>
          <p className="mt-1.5 text-[11px] text-neutral-500">{totalReviews === 0 ? 'No ratings yet' : `${totalReviews} ${totalReviews === 1 ? 'review' : 'reviews'}`}</p>
        </div>

        <div className="min-w-0 flex-1 space-y-1" aria-label="Ratings by number of stars">
          {distribution.map((item) => {
            // The 3, 2 and 1 star rows all filter to "3 and below", so each row has one honest action.
            const target = item.stars >= 4 ? item.stars : 3;
            const active = activeStar === target && (item.stars >= 4 || item.stars === 3);
            return (
              <button
                key={item.stars}
                type="button"
                onClick={() => onSelectStar(activeStar === target ? null : target)}
                aria-pressed={active}
                aria-label={`${item.stars} stars: ${item.count} ${item.count === 1 ? 'review' : 'reviews'}`}
                className={`flex w-full items-center gap-2 rounded-full px-1.5 py-[3px] text-left transition-colors cursor-pointer ${active ? 'bg-neutral-100' : 'hover:bg-neutral-50'}`}
              >
                <span className="w-3 text-[11px] font-medium tabular-nums text-neutral-600">{item.stars}</span>
                <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-neutral-100">
                  <span className="block h-full rounded-full bg-gradient-to-r from-[#f2c24b] to-[#c98a1a] transition-[width] duration-700" style={{ width: `${item.percentage}%` }} />
                </span>
                <span className="w-7 text-right text-[10.5px] tabular-nums text-neutral-400">{item.count}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ReviewScoreSummary;
