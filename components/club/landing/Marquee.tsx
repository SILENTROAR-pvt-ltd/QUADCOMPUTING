import React from 'react';
import { Sparkle } from './Doodles';
import { CLUB_DISPLAY } from '../fonts';

const WORDS = ['Find travel buddies', 'Post your plans', "See who's going", 'Join in a tap', 'Verified stays', 'Escrow-safe payments', 'Better trips together'];

/** A forest ribbon of what the club does, in italic serif, drifting slowly (still for reduced motion). */
export function Marquee() {
  const row = [...WORDS, ...WORDS];
  return (
    <div aria-hidden="true" className="overflow-hidden bg-[#17301f] py-4 text-[#f6f4ec]">
      <div className="flex w-max animate-marquee items-center gap-8 motion-reduce:animate-none">
        {row.map((w, i) => (
          <span key={i} className="flex items-center gap-8">
            <span className={`${CLUB_DISPLAY} whitespace-nowrap text-2xl italic`}>{w}</span>
            <Sparkle className="h-4 w-4 text-[#c8da4a]" />
          </span>
        ))}
      </div>
    </div>
  );
}
