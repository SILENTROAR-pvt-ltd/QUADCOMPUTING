// components/guest/lobby/LoungeMediaPreview.tsx
'use client';

import React from 'react';
import { X } from 'lucide-react';

interface LoungeMediaPreviewProps {
  imagePreview: string;
  onClear: () => void;
}

export function LoungeMediaPreview({ imagePreview, onClear }: LoungeMediaPreviewProps) {
  return (
    <div className="relative mb-2.5 inline-block rounded-xl overflow-hidden border border-neutral-200 shadow-sm bg-neutral-100 max-h-[120px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imagePreview}
        alt="Upload thumbnail"
        className="max-h-[120px] max-w-[180px] object-cover"
      />
      <button
        type="button"
        onClick={onClear}
        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/80 border border-white/30 flex items-center justify-center text-white hover:bg-black transition-colors cursor-pointer"
        aria-label="Remove image"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default LoungeMediaPreview;
