// components/guest/lobby/VaultLightboxModal.tsx
'use client';

import React from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import type { VaultPhoto } from './vault.constants';

interface VaultLightboxModalProps {
  selectedItem: VaultPhoto | null;
  onClose: () => void;
}

export function VaultLightboxModal({ selectedItem, onClose }: VaultLightboxModalProps) {
  if (!selectedItem) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/92 backdrop-blur-md p-4 sm:p-6 md:p-8 animate-in fade-in duration-200"
    >
      {/* Close Button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20 cursor-pointer z-10"
        aria-label="Close photo preview"
      >
        <X className="w-5 h-5 stroke-[2]" />
      </button>

      {/* Modal Dialog Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-3xl w-full max-h-[90vh] rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-neutral-950 flex flex-col"
      >
        {/* High-Res Image View */}
        <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden bg-neutral-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedItem.imageUrl}
            alt={selectedItem.title}
            className="w-full h-full object-cover select-none"
          />
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/25 text-xs uppercase tracking-wider font-mono text-white/90">
              {selectedItem.category}
            </span>
          </div>
        </div>

        {/* Modal Metadata Footer */}
        <div className="p-5 sm:p-6 bg-neutral-950/95 border-t border-white/10 space-y-2">
          <div className="flex items-center gap-2.5 text-xs text-neutral-400">
            {selectedItem.timeTag || selectedItem.time_tag ? (
              <span className="inline-flex items-center gap-1.5 text-white/90 font-mono bg-white/10 px-2.5 py-1 rounded-md border border-white/15">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                {selectedItem.timeTag || selectedItem.time_tag}
              </span>
            ) : (
              <>
                {selectedItem.date && (
                  <span className="inline-flex items-center gap-1 text-white/80 font-mono">
                    <Calendar className="w-3.5 h-3.5" />
                    {selectedItem.date}
                  </span>
                )}
                {selectedItem.date && selectedItem.time && <span className="text-neutral-600">·</span>}
                {selectedItem.time && (
                  <span className="inline-flex items-center gap-1 text-white/80 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    {selectedItem.time}
                  </span>
                )}
              </>
            )}
          </div>

          <h3 className="font-serif text-xl sm:text-2xl font-normal text-white tracking-tight">
            {selectedItem.title}
          </h3>

          <p className="text-xs sm:text-sm text-neutral-300 font-light leading-relaxed">
            {selectedItem.description}
          </p>
        </div>
      </div>
    </div>
  );
}

export default VaultLightboxModal;
