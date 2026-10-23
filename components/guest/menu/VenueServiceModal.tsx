'use client';

import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, Clock, HandHeart, Sparkles, X } from 'lucide-react';
import { SPRING, press } from '@/components/guest/menu/motion';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';
import s from '@/components/guest/luxe/luxe-guest.module.css';
import { MenuItem } from './types';

interface VenueServiceModalProps {
  service: MenuItem | null;
  onClose: () => void;
  onRequest: (service: MenuItem) => void;
  isSent: boolean;
}

const CHIP = 'inline-flex items-center gap-1.5 rounded-full border border-[#e8dfcc] bg-[#fbf9f4] px-3 py-1.5 text-[12px] font-medium text-[#10231a]/80';
const STEPS = [
  { Icon: BellRing, text: 'You ask for it here, in a single tap.' },
  { Icon: HandHeart, text: 'The host confirms the details with you personally.' },
  { Icon: Clock, text: 'Enjoy it at your own pace. Nothing to pay now.' },
];

/**
 * A venue service, opened like an event or a room: the photograph drifting under a curved edge with the name over it,
 * a few words about it, how the request travels, and the request itself always in reach. The request goes to the host's
 * Reservations and rings their bell.
 */
export const VenueServiceModal: React.FC<VenueServiceModalProps> = ({ service, onClose, onRequest, isSent }) => {
  useEffect(() => {
    if (!service) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [service, onClose]);

  return (
    <AnimatePresence>
      {service && (
        <motion.div className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default bg-[#08160f]/55" />
          <motion.div role="dialog" aria-modal="true" aria-labelledby="service-detail-title" transition={SPRING}
            initial={{ y: 70, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 70, opacity: 0 }}
            className="relative flex max-h-[94dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[30px] bg-[#fbf9f4] shadow-2xl sm:rounded-[30px]">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="relative aspect-[4/3] overflow-hidden bg-[radial-gradient(circle_at_30%_20%,#1d4632,#0f2a1e)] [border-radius:0_0_50%_50%/0_0_12%_12%]">
                {service.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- the venue's own service photo
                  <img src={service.image_url} alt="" className={`${s.slowmo} h-full w-full object-cover`} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <Sparkles aria-hidden className="absolute left-1/2 top-[38%] h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-[#d9c193]/70" />
                )}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,22,15,0.45)_0%,transparent_35%,rgba(8,22,15,0.88)_100%)]" />
                <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-[#f5f1e8]/90 text-[#0f2a1e]"><X className="h-4 w-4" /></button>
                <div className="absolute inset-x-0 bottom-0 px-5 pb-8 text-[#f5f1e8]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#d9c193]">{service.category || 'Venue service'}</p>
                  <h2 id="service-detail-title" className="mt-1.5 text-[2.1rem] font-medium leading-[1.02] [text-wrap:balance]" style={LUXE_SERIF}>{service.name}</h2>
                </div>
              </div>

              <div className="space-y-5 px-5 pb-6 pt-5">
                <div className="flex flex-wrap gap-1.5">
                  <span className={CHIP}><Sparkles className="h-3.5 w-3.5 text-[#8a6d3f]" aria-hidden />Arranged by the house</span>
                  <span className={CHIP}><HandHeart className="h-3.5 w-3.5 text-[#8a6d3f]" aria-hidden />Confirmed personally</span>
                </div>

                <div>
                  <h3 className="text-[1.35rem] font-medium text-[#10231a]" style={LUXE_SERIF}>About the experience</h3>
                  <p className="mt-1.5 whitespace-pre-line text-[13.5px] leading-relaxed text-[#10231a]/70">
                    {service.description || 'A private touch the house arranges for its guests. Ask for it, and the host will take care of the rest.'}
                  </p>
                </div>

                <div>
                  <h3 className="text-[1.35rem] font-medium text-[#10231a]" style={LUXE_SERIF}>How it works</h3>
                  <ol className="mt-2.5 space-y-2.5">
                    {STEPS.map(({ Icon, text }) => (
                      <li key={text} className="flex items-center gap-3 text-[13px] text-[#10231a]/75">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] text-[#d9c193] ring-1 ring-[#d9c193]/35"><Icon className="h-3.5 w-3.5" aria-hidden /></span>
                        {text}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-4 border-t border-[#e8dfcc] bg-[#fbf9f4] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-3.5">
              <p className="leading-tight text-[#10231a]">
                <span className="text-[1.7rem] font-medium" style={LUXE_SERIF}>{service.price ? `₹${Number(service.price).toLocaleString('en-IN')}` : 'On request'}</span>
                <span className="block text-[11px] text-[#10231a]/50">confirmed by the host</span>
              </p>
              <motion.button type="button" disabled={isSent} onClick={() => onRequest(service)} {...press}
                className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-full bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] px-6 text-[13.5px] font-semibold text-[#f5f1e8] shadow-[0_12px_24px_-12px_rgba(15,42,30,0.85)] ring-1 ring-[#d9c193]/35 disabled:cursor-wait disabled:opacity-70">
                {isSent ? 'Sending your request…' : <><BellRing className="h-4 w-4 text-[#d9c193]" aria-hidden /> Request this</>}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
