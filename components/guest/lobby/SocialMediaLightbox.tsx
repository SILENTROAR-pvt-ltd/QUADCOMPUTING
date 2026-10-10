// components/guest/lobby/SocialMediaLightbox.tsx
'use client';

import React from 'react';
import { X, ZoomIn } from 'lucide-react';

interface SocialMediaLightboxProps {
  imageUrl: string | null;
  onClose: () => void;
  altText?: string;
}

export function SocialMediaLightbox({ imageUrl, onClose, altText = 'Venue moment' }: SocialMediaLightboxProps) {
  if (!imageUrl) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-8 animate-in fade-in duration-200"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-5 sm:top-8 sm:right-8 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20 cursor-pointer z-10"
        aria-label="Close photo preview"
      >
        <X className="w-5 h-5 stroke-[2]" />
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl max-h-[88vh] rounded-2xl overflow-hidden border border-white/25 shadow-2xl bg-neutral-950 flex flex-col items-center justify-center"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={altText}
          className="w-auto h-auto max-w-full max-h-[85vh] object-contain select-none"
        />
        <div className="absolute bottom-3 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[10px] uppercase tracking-widest text-neutral-300 font-mono">
          <ZoomIn className="w-3.5 h-3.5 text-white" />
          <span>High-Resolution Capture</span>
        </div>
      </div>
    </div>
  );
}

export default SocialMediaLightbox;
