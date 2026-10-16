// components/guest/lobby/VaultLightboxModal.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, Loader2, Sparkles, X } from 'lucide-react';
import type { VaultPhoto } from './vault.constants';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';
import { press, SPRING } from '@/components/guest/menu/motion';

interface VaultLightboxModalProps {
  selectedItem: VaultPhoto | null;
  onClose: () => void;
  /** With these two, the sheet offers "Request this", which tells the venue's team (with the table). */
  venueId?: string;
  tableNumber?: string;
}

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;
type SendState = 'idle' | 'sending' | 'sent' | 'failed';

/** A moment in full: its photo, when it is, what it is, and a way to ask the venue's team about it. */
export function VaultLightboxModal({ selectedItem: item, onClose, venueId, tableNumber }: VaultLightboxModalProps) {
  const [state, setState] = useState<SendState>('idle');

  // Each moment starts fresh: a request sent for one does not mark the next as sent.
  useEffect(() => { setState('idle'); }, [item?.id]);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, onClose]);

  if (!item) return null;

  const when = item.timeTag || item.time_tag || [item.date, item.time].filter(Boolean).join(' · ');
  const canRequest = Boolean(venueId && tableNumber);

  const request = async () => {
    if (!canRequest || state === 'sending' || state === 'sent') return;
    setState('sending');
    const note = `Interested in "${item.title}"${when ? ` (${when})` : ''}`;
    const result = await apiRequest('/api/guest/call-staff', jsonRequest('POST', {
      venue_id: venueId, table_number: tableNumber, type: 'SERVICE', message: note.slice(0, 140),
    }));
    setState(result.ok ? 'sent' : 'failed');
  };

  return (
    <motion.div role="dialog" aria-modal="true" aria-label={item.title} onClick={onClose}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <motion.div onClick={(e) => e.stopPropagation()} initial={{ y: 24, scale: 0.97 }} animate={{ y: 0, scale: 1 }} transition={SPRING}
        className="max-h-[90dvh] w-full max-w-md space-y-5 overflow-y-auto overscroll-contain rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl sm:p-7">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{item.category || 'From the venue'}</span>
          <motion.button type="button" onClick={onClose} aria-label="Close" {...press} className="-mr-2 grid h-10 w-10 cursor-pointer place-items-center text-zinc-400 hover:text-black">
            <X className="h-4 w-4" />
          </motion.button>
        </div>

        {item.imageUrl && (
          <div className="h-48 w-full overflow-hidden rounded-2xl bg-zinc-100">
            {/* eslint-disable-next-line @next/next/no-img-element -- the venue-uploaded photo; images.unoptimized is set */}
            <img src={item.imageUrl} alt={item.title} className="h-full w-full select-none object-cover" />
          </div>
        )}

        <div className="space-y-2">
          {when && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0A3222]/[0.07] px-2.5 py-1 text-[11px] font-semibold text-[#0A3222]">
              <Clock className="h-3.5 w-3.5" aria-hidden /> {when}
            </span>
          )}
          <h3 className="text-[22px] font-normal leading-tight text-zinc-950" style={SERIF}>{item.title}</h3>
          {item.description && <p className="text-[13px] font-light leading-relaxed text-zinc-600">{item.description}</p>}
        </div>

        <div className="flex flex-col gap-2 pt-1">
          {canRequest && (
            <motion.button type="button" onClick={() => void request()} disabled={state === 'sending' || state === 'sent'} {...press}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-black py-3.5 text-xs font-medium uppercase tracking-wider text-white shadow-sm hover:bg-zinc-800 disabled:cursor-default disabled:opacity-90">
              {state === 'sent' ? <><Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden /><span>Request sent. We will be in touch</span></>
                : state === 'sending' ? <><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /><span>Sending…</span></>
                : <><Sparkles className="h-3.5 w-3.5" aria-hidden /><span>Request this</span></>}
            </motion.button>
          )}
          {state === 'failed' && <p role="alert" className="text-center text-[12px] font-medium text-rose-600">We could not send that just now. Please try again.</p>}
          <button type="button" onClick={onClose} className="min-h-11 w-full cursor-pointer text-xs text-zinc-500 transition-colors hover:text-black">Close</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default VaultLightboxModal;
