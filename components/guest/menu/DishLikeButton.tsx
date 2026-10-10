'use client';

import React from 'react';
import { Heart } from 'lucide-react';

interface DishLikeButtonProps {
  dishName: string;
  liked: boolean;
  count: number;
  busy?: boolean;
  onToggle: () => void;
}

/** A glass heart on the dish photo: tap to save a dish you love; shows how many guests love it. */
export function DishLikeButton({ dishName, liked, count, busy, onToggle }: DishLikeButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={liked}
      aria-label={liked ? `Remove ${dishName} from your favourites` : `Love ${dishName}`}
      disabled={busy}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={`inline-flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-semibold backdrop-blur-md transition-all active:scale-90 cursor-pointer disabled:opacity-70 ${
        liked
          ? 'bg-rose-500/95 text-white shadow-[0_4px_16px_-2px_rgba(244,63,94,0.55)]'
          : 'bg-white/85 text-zinc-700 shadow-sm hover:bg-white'
      }`}
    >
      <Heart size={13} strokeWidth={2.4} className={liked ? 'fill-white' : ''} />
      {count > 0 && <span className="tabular-nums">{count}</span>}
    </button>
  );
}

export default DishLikeButton;
