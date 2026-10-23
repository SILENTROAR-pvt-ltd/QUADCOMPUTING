'use client';

import React from 'react';
import Image from 'next/image';

interface VibeyAvatarProps {
  size?: number;
  /** idle: a slow head-bob; thinking: grooving with a glow ring; still: no motion. */
  mood?: 'idle' | 'thinking' | 'still';
  /** A small green dot: Vibey is available. */
  online?: boolean;
}

/** Vibey's mascot (2-5 KB WebP, public/vibey). The motion is CSS only and stops when the guest prefers reduced motion. */
export function VibeyAvatar({ size = 28, mood = 'still', online = false }: VibeyAvatarProps) {
  const src = size > 48 ? '/vibey/vibey-192.webp' : '/vibey/vibey-96.webp';
  return (
    <span aria-hidden className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      {mood === 'thinking' && <span className="vibey-ring absolute inset-0 rounded-full bg-[#d9c193]/70" />}
      <span className={`relative block h-full w-full overflow-hidden rounded-full bg-white shadow-[0_6px_16px_-8px_rgba(138,109,63,0.6)] ring-1 ring-[#d9c193]/70 ${mood === 'idle' ? 'vibey-bob' : mood === 'thinking' ? 'vibey-groove' : ''}`}>
        <Image src={src} alt="" width={size} height={size} className="h-full w-full object-cover" />
      </span>
      {online && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />}
    </span>
  );
}
