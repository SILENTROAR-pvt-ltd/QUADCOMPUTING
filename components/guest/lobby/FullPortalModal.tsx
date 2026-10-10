'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { VENUE_PORTAL_SERVICES } from './lobby.constants';

interface FullPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserTable: string;
  portalBookSuccess: string | null;
  setPortalBookSuccess: (val: string | null) => void;
}

export function FullPortalModal({
  isOpen,
  onClose,
  currentUserTable,
  portalBookSuccess,
  setPortalBookSuccess,
}: FullPortalModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md p-0 sm:p-6">
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          className="w-full max-w-2xl rounded-t-3xl sm:rounded-3xl bg-neutral-900 p-6 sm:p-8 border-t sm:border border-neutral-800 shadow-2xl text-white max-h-[85vh] flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-neutral-400 font-medium block">
                  Venue Experience
                </span>
                <h3 className="font-serif text-2xl font-normal text-white mt-0.5">
                  Full Portal: Stays & Services
                </h3>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {portalBookSuccess ? (
              <div className="py-12 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-neutral-950">
                  <Check className="h-6 w-6 stroke-[2]" />
                </div>
                <h4 className="text-lg font-light text-white">Request Registered</h4>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto font-light">
                  The concierge has received your booking inquiry for{' '}
                  <span className="font-medium text-white">{portalBookSuccess}</span>. A host will attend
                  your table shortly.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-800 max-h-[50vh] overflow-y-auto pr-1 my-4">
                {VENUE_PORTAL_SERVICES.map((serv) => (
                  <div key={serv.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={serv.image}
                        alt={serv.title}
                        className="w-20 h-16 rounded-xl object-cover shrink-0 shadow-xs border border-neutral-800"
                      />
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-medium">
                          {serv.category}
                        </span>
                        <h4 className="text-sm font-medium text-white">{serv.title}</h4>
                        <p className="text-xs text-neutral-400 font-light line-clamp-1">{serv.desc}</p>
                        <p className="text-xs font-semibold text-neutral-200">{serv.price}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setPortalBookSuccess(serv.title)}
                      className="shrink-0 rounded-full border border-neutral-700 bg-neutral-800 px-4 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 transition-colors cursor-pointer"
                    >
                      Book / Request
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-neutral-800 pt-4 flex justify-between items-center text-xs">
            <span className="text-neutral-400 font-light">Direct billing linked to Table {currentUserTable}</span>
            <button
              onClick={onClose}
              className="rounded-xl bg-white px-6 py-2.5 text-xs font-bold text-neutral-950 hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
