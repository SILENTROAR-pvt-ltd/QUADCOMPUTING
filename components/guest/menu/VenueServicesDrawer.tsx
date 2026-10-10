'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { MenuItem } from './types';

export interface VenueServicesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  services: MenuItem[];
  onSelectService: (service: MenuItem) => void;
}

export function VenueServicesDrawer({
  isOpen,
  onClose,
  services,
  onSelectService,
}: VenueServicesDrawerProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
        {/* Backdrop click */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-lg bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/70 shrink-0">
            <div>
              <div className="flex items-center gap-1.5 text-neutral-700 mb-0.5">
                <Sparkles size={14} />
                <span className="text-[10px] uppercase font-bold tracking-widest">
                  VIP Concierge
                </span>
              </div>
              <h2
                className="text-lg font-serif font-bold text-zinc-900 tracking-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Explore Venue Services
              </h2>
              <p className="text-[11px] text-zinc-500 font-medium">
                Complimentary &amp; premium experiences available at your table
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-zinc-200/60 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Services List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {services.length === 0 ? (
              <div className="py-12 text-center text-zinc-400">
                <p className="text-sm font-medium">No specialized services available right now</p>
              </div>
            ) : (
              services.map((service) => (
                <div
                  key={service.id}
                  onClick={() => onSelectService(service)}
                  className="group p-3.5 bg-zinc-50/70 hover:bg-white border border-zinc-200/80 hover:border-zinc-300 rounded-2xl shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-4"
                >
                  {service.image_url && (
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-100 shrink-0 border border-zinc-200/60">
                      <img
                        src={service.image_url}
                        alt={service.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-zinc-200/70 text-zinc-700">
                        {service.category || 'Service'}
                      </span>
                      {service.price > 0 && (
                        <span className="text-xs font-mono font-bold text-zinc-900">
                          ₹{service.price}
                        </span>
                      )}
                    </div>
                    <h4
                      className="text-sm font-serif font-semibold text-zinc-900 truncate"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      {service.name}
                    </h4>
                    {service.description && (
                      <p className="text-[11px] text-zinc-500 font-light line-clamp-1 mt-0.5">
                        {service.description}
                      </p>
                    )}
                  </div>

                  <div className="w-8 h-8 rounded-full bg-zinc-100 group-hover:bg-[#0A3222] group-hover:text-white text-zinc-600 flex items-center justify-center shrink-0 transition-colors">
                    <ArrowRight size={14} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer note */}
          <div className="px-6 py-3 bg-zinc-50/90 border-t border-zinc-100 text-center shrink-0">
            <p className="text-[10px] text-zinc-400 font-medium">
              Tap any service to request host assistance or view full details
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
