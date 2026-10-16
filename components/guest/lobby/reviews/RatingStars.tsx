'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PremiumStar } from '@/components/guest/menu/tracker/PremiumStar';
import { press } from '@/components/guest/menu/motion';
import { RATING_WORDS } from './review-look';

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;

/** Five stars to tap. Hovering previews a rating and a word for it; nothing is pre-selected. */
export function RatingStars({ rating, onRate }: { rating: number; onRate: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || rating;
  return (
    <div className="mt-5 rounded-[22px] border border-neutral-200/80 bg-white px-4 py-5 text-center">
      <div role="radiogroup" aria-label="Your rating" className="flex justify-center gap-1.5" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <motion.button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
            onClick={() => onRate(n)} onMouseEnter={() => setHover(n)} {...press} className="grid h-12 w-12 cursor-pointer place-items-center rounded-full">
            <PremiumStar filled={n <= shown} className="h-10 w-10" />
          </motion.button>
        ))}
      </div>
      <p className="mt-1.5 h-5 text-[14px] italic text-zinc-600" style={SERIF}>{RATING_WORDS[shown]}</p>
    </div>
  );
}
