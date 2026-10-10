'use client';

import React from 'react';
import { Trash2, Clock, Sparkles } from 'lucide-react';
import type { VaultPhoto } from '@/components/guest/lobby/vault.constants';

interface PhotoVaultGridProps {
  photos: VaultPhoto[];
  onDelete: (id: string, title: string) => void;
  deletingId: string | null;
}

export function PhotoVaultGrid({ photos, onDelete, deletingId }: PhotoVaultGridProps) {
  if (photos.length === 0) {
    return (
      <div className="py-12 text-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50">
        <Sparkles className="w-6 h-6 text-neutral-400 mx-auto mb-2" />
        <p className="text-xs font-semibold text-neutral-700">No photo vault moments yet</p>
        <p className="text-[11px] text-neutral-400 mt-0.5">
          Ingest your first acoustic session or sunset moment to broadcast to guests.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {photos.map((photo) => {
        const isDeleting = deletingId === photo.id;
        const timeDisplay = photo.timeTag || photo.time_tag || (photo.time ? `${photo.date} @ ${photo.time}` : photo.date);

        return (
          <div
            key={photo.id}
            className="group relative flex flex-col rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-xs hover:border-neutral-300 transition-all"
          >
            {/* Image Container */}
            <div className="relative aspect-[16/10] w-full bg-neutral-900 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.imageUrl || photo.image_url}
                alt={photo.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* Category Pill */}
              <div className="absolute top-2.5 left-2.5">
                <span className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[9px] uppercase tracking-wider font-mono text-white">
                  {photo.category}
                </span>
              </div>

              {/* Delete Button */}
              <div className="absolute top-2.5 right-2.5 opacity-90 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => onDelete(photo.id, photo.title)}
                  disabled={isDeleting}
                  className="p-1.5 rounded-full bg-black/60 hover:bg-rose-600 text-white backdrop-blur-md transition-colors cursor-pointer"
                  title="Remove from vault"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Live Tag Pill */}
              <div className="absolute bottom-2 left-2.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-white/90 font-medium">Live on Guest Lobby</span>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-3.5 flex-1 flex flex-col justify-between space-y-1.5">
              <div>
                {timeDisplay && (
                  <div className="flex items-center gap-1 text-[10px] text-neutral-500 font-mono mb-1">
                    <Clock className="w-3 h-3 text-neutral-400" />
                    <span>{timeDisplay}</span>
                  </div>
                )}
                <h4 className="font-serif text-sm font-medium text-neutral-900 leading-snug line-clamp-1">
                  {photo.title}
                </h4>
                {photo.description && (
                  <p className="text-[11px] text-neutral-500 line-clamp-2 mt-0.5 leading-relaxed font-light">
                    {photo.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PhotoVaultGrid;
