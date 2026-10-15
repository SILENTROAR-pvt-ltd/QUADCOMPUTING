// components/guest/lobby/VaultLightboxModal.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { X, Calendar, Clock, Check, Loader2, Sparkles } from 'lucide-react';
import type { VaultPhoto } from './vault.constants';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';

interface VaultLightboxModalProps {
  selectedItem: VaultPhoto | null;
  onClose: () => void;
  /** "light" is the menu's version, in the style of the venue-service detail; "dark" is the lounge's. */
  variant?: 'dark' | 'light';
  /** With these two, the light version offers "Request this", which tells the venue's team. */
  venueId?: string;
  tableNumber?: string;
}

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;

export function VaultLightboxModal({ selectedItem, onClose, variant = 'dark', venueId, tableNumber }: VaultLightboxModalProps) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  // Each moment starts fresh: a request sent for one does not mark the next as sent.
  useEffect(() => { setState('idle'); }, [selectedItem?.id]);

  if (!selectedItem) return null;

  const when = selectedItem.timeTag || selectedItem.time_tag || [selectedItem.date, selectedItem.time].filter(Boolean).join(' · ');

  if (variant === 'light') {
    const canRequest = Boolean(venueId && tableNumber);

    const request = async () => {
      if (!canRequest || state === 'sending' || state === 'sent') return;
      setState('sending');
      const note = `Interested in "${selectedItem.title}"${when ? ` (${when})` : ''}`;
      const result = await apiRequest('/api/guest/call-staff', jsonRequest('POST', {
        venue_id: venueId, table_number: tableNumber, type: 'SERVICE', message: note.slice(0, 140),
      }));
      setState(result.ok ? 'sent' : 'failed');
    };

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={selectedItem.title}
        onClick={onClose}
        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="max-h-[90dvh] w-full max-w-md space-y-5 overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl sm:p-7"
        >
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{selectedItem.category || 'From the venue'}</span>
            <button type="button" onClick={onClose} className="cursor-pointer p-1 text-zinc-400 hover:text-black" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          {selectedItem.imageUrl && (
            <div className="h-48 w-full overflow-hidden rounded-2xl bg-zinc-100">
              {/* eslint-disable-next-line @next/next/no-img-element -- the venue-uploaded photo; images.unoptimized is set */}
              <img src={selectedItem.imageUrl} alt={selectedItem.title} className="h-full w-full select-none object-cover" />
            </div>
          )}

          <div className="space-y-2">
            {when && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0A3222]/[0.07] px-2.5 py-1 text-[11px] font-semibold text-[#0A3222]">
                <Clock className="h-3.5 w-3.5" aria-hidden /> {when}
              </span>
            )}
            <h3 className="text-[22px] font-normal leading-tight text-zinc-950" style={SERIF}>{selectedItem.title}</h3>
            {selectedItem.description && <p className="text-[13px] font-light leading-relaxed text-zinc-600">{selectedItem.description}</p>}
          </div>

          <div className="flex flex-col gap-2 pt-1">
            {canRequest && (
              <button
                type="button"
                onClick={() => void request()}
                disabled={state === 'sending' || state === 'sent'}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-black py-3.5 text-xs font-medium uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-zinc-800 disabled:cursor-default disabled:opacity-90"
              >
                {state === 'sent' ? (
                  <><Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden /><span>Request sent. We will be in touch</span></>
                ) : state === 'sending' ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /><span>Sending…</span></>
                ) : (
                  <><Sparkles className="h-3.5 w-3.5" aria-hidden /><span>Request this</span></>
                )}
              </button>
            )}
            {state === 'failed' && (
              <p role="alert" className="text-center text-[12px] font-medium text-rose-600">We could not send that just now. Please try again.</p>
            )}
            <button type="button" onClick={onClose} className="w-full cursor-pointer py-2 text-xs text-zinc-500 transition-colors hover:text-black">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

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
