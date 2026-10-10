// components/guest/lobby/VaultPhotoCard.tsx
'use client';

import React from 'react';
import { ZoomIn, Calendar, Clock } from 'lucide-react';
import type { VaultPhoto } from './vault.constants';

interface VaultPhotoCardProps {
  item: VaultPhoto;
  onSelect: (item: VaultPhoto) => void;
}

export function VaultPhotoCard({ item, onSelect }: VaultPhotoCardProps) {
  return (
    <article
      onClick={() => onSelect(item)}
      className="group relative flex flex-col rounded-2xl overflow-hidden border border-white/15 bg-neutral-950/80 backdrop-blur-md shadow-lg transition-all duration-300 hover:border-white/35 hover:shadow-2xl cursor-pointer"
    >
      {/* High-Aspect Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          loading="lazy"
        />

        {/* Ambient Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent opacity-80" />

        {/* Category Pill */}
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/20 text-[10px] uppercase tracking-wider font-mono text-white/90 shadow-sm">
            {item.category}
          </span>
        </div>

        {/* Zoom Cue */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="p-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/25 text-white shadow-md">
            <ZoomIn className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Date & Time Badges */}
          <div className="flex items-center gap-2 text-[11px] text-neutral-400 mb-2">
            {item.timeTag || item.time_tag ? (
              <span className="inline-flex items-center gap-1.5 font-mono text-white/80 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                <Clock className="w-3 h-3 text-emerald-400" />
                {item.timeTag || item.time_tag}
              </span>
            ) : (
              <>
                {item.date && (
                  <span className="inline-flex items-center gap-1 font-mono text-white/70">
                    <Calendar className="w-3 h-3 text-neutral-400" />
                    {item.date}
                  </span>
                )}
                {item.date && item.time && <span className="text-neutral-600">·</span>}
                {item.time && (
                  <span className="inline-flex items-center gap-1 font-mono text-white/70">
                    <Clock className="w-3 h-3 text-neutral-400" />
                    {item.time}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Title */}
          <h4 className="font-serif text-lg sm:text-xl font-normal text-white tracking-tight leading-snug group-hover:text-neutral-100 transition-colors">
            {item.title}
          </h4>

          {/* Editorial Description */}
          <p className="mt-2 text-xs text-neutral-400 font-light leading-relaxed line-clamp-2">
            {item.description}
          </p>
        </div>
      </div>
    </article>
  );
}

export default VaultPhotoCard;
