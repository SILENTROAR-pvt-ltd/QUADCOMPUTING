// components/guest/lobby/LoungePostMedia.tsx
'use client';

import React from 'react';
import { ZoomIn } from 'lucide-react';

interface LoungePostMediaProps {
  imageUrl: string;
  onOpenPhoto: (url: string) => void;
}

export function LoungePostMedia({ imageUrl, onOpenPhoto }: LoungePostMediaProps) {
  return (
    <div
      onClick={() => onOpenPhoto(imageUrl)}
      className="group/media relative overflow-hidden rounded-xl mb-2 cursor-pointer border border-white/15 shadow-md max-h-[260px] sm:max-h-[300px] bg-neutral-950"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="Venue moment"
        className="object-cover w-full max-h-[260px] sm:max-h-[300px] group-hover/media:scale-[1.02] transition-transform duration-300"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/media:opacity-100 transition-opacity flex items-end justify-end p-2.5">
        <div className="flex items-center gap-1 text-[10px] text-white bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/20">
          <ZoomIn className="w-3 h-3" />
          <span>Zoom</span>
        </div>
      </div>
    </div>
  );
}

export default LoungePostMedia;
