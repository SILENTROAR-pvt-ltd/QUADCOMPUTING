import React, { useId } from 'react';

/**
 * The Vibers Club verified mark: a ringed seal with "VERIFIED · VIBERS CLUB" set around a gold check.
 * Drawn as SVG so it stays sharp at any size and needs no image file.
 */
export function VerifiedSeal({ size = 60, className = '' }: { size?: number; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg role="img" aria-label="Verified member" width={size} height={size} viewBox="0 0 100 100" className={className}>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e7b4" />
          <stop offset="0.5" stopColor="#d9bf7a" />
          <stop offset="1" stopColor="#a8873a" />
        </linearGradient>
        <path id={`${id}r`} d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0" />
      </defs>
      <circle cx="50" cy="50" r="48" fill="#26231e" stroke={`url(#${id}g)`} strokeWidth="2" />
      <circle cx="50" cy="50" r="43.5" fill="none" stroke="#d9bf7a" strokeOpacity="0.4" strokeWidth="0.8" strokeDasharray="0.8 2.6" strokeLinecap="round" />
      <text fontSize="8.6" fontWeight="700" fill="#ecd9a1" fontFamily="inherit">
        <textPath href={`#${id}r`} textLength="228" lengthAdjust="spacing">VERIFIED · VIBERS CLUB · </textPath>
      </text>
      <circle cx="50" cy="50" r="23" fill={`url(#${id}g)`} />
      <circle cx="50" cy="50" r="19.5" fill="none" stroke="#26231e" strokeOpacity="0.25" strokeWidth="1" />
      <path d="M40 50.5 l7.5 7.5 L61 43" fill="none" stroke="#26231e" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
