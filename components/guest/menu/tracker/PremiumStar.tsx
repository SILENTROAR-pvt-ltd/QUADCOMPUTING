'use client';

import React, { useId } from 'react';

interface PremiumStarProps {
  filled: boolean;
  className?: string;
}

/**
 * A rating star with some light in it: a champagne-gold gradient, a fine darker edge, a soft highlight across the top and a
 * gentle glow when lit. Unlit stars are a pale outline. Drawn inline, so there is nothing to download.
 */
export function PremiumStar({ filled, className = 'h-8 w-8' }: PremiumStarProps) {
  const id = useId().replace(/:/g, '');
  const path = 'M12 2.4l2.9 6.1 6.7.9-4.9 4.6 1.2 6.6L12 17.4l-5.9 3.2 1.2-6.6L2.4 9.4l6.7-.9L12 2.4z';
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`${className} transition-[filter] duration-500 ${filled ? 'drop-shadow-[0_2px_6px_rgba(214,165,52,0.55)]' : ''}`}>
      <defs>
        <linearGradient id={`g${id}`} x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff1b8" />
          <stop offset="0.38" stopColor="#f2c24b" />
          <stop offset="1" stopColor="#c98a1a" />
        </linearGradient>
        <linearGradient id={`s${id}`} x1="12" y1="2" x2="12" y2="13" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {filled ? (
        <>
          <path d={path} fill={`url(#g${id})`} stroke="#b9801a" strokeWidth="0.6" strokeLinejoin="round" />
          <path d={path} fill={`url(#s${id})`} />
        </>
      ) : (
        <path d={path} fill="#faf7ef" stroke="#d9d3c3" strokeWidth="1" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export default PremiumStar;
