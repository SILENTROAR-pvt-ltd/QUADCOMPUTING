'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Sparkles } from 'lucide-react';
import { MenuItem } from './types';

interface VenueServiceModalProps {
  service: MenuItem | null;
  onClose: () => void;
  onRequest: (service: MenuItem) => void;
  isSent: boolean;
}

export const VenueServiceModal: React.FC<VenueServiceModalProps> = ({
  service,
  onClose,
  onRequest,
  isSent,
}) => {
  return (
    <AnimatePresence>
      {service && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md rounded-3xl bg-white border border-zinc-200 shadow-2xl p-6 sm:p-7 space-y-5 overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500">
                {service.category || 'Venue Service'}
              </span>
              <button
                onClick={onClose}
                className="p-1 text-zinc-400 hover:text-black cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {service.image_url && (
              <div className="h-44 w-full rounded-2xl overflow-hidden bg-zinc-100">
                {/* eslint-disable-next-line @next/next/no-img-element -- the venue-uploaded photo; images.unoptimized is set, so next/image would not resize it either */}
                <img
                  src={service.image_url}
                  alt={service.name}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-editorial text-xl font-normal text-zinc-950">
                  {service.name}
                </h3>
                <span className="font-mono text-base font-semibold text-zinc-900 shrink-0">
                  ₹{service.price}
                </span>
              </div>
              <p className="text-xs text-zinc-600 font-light leading-relaxed">
                {service.description || 'Exclusive concierge offering tailored for in-house guests.'}
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => onRequest(service)}
                disabled={isSent}
                className="w-full rounded-full bg-black py-3.5 text-xs font-medium uppercase tracking-wider text-white hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2"
              >
                {isSent ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Concierge Request Sent!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                    <span>Request via Host Concierge</span>
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="w-full py-2 text-xs text-zinc-500 hover:text-black transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
