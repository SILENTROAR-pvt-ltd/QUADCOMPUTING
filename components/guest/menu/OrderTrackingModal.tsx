'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Sparkles,
  Wallet,
  ChevronRight,
  Clock,
  UtensilsCrossed,
  X,
  Check,
} from 'lucide-react';

export interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
  tableNo?: string;
  tableNumber?: string;
  businessName?: string;
  onOpenServices: () => void;
  onViewActiveBill?: () => void;
}

export function OrderTrackingModal({
  isOpen,
  onClose,
  tableNo,
  tableNumber,
  businessName,
  onOpenServices,
  onViewActiveBill,
}: OrderTrackingModalProps) {
  const [cashbackClaimed, setCashbackClaimed] = useState(false);

  if (!isOpen) return null;

  const displayTable = tableNo || tableNumber || 'T-05';

  const handleClaimCashback = () => {
    setCashbackClaimed(true);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
        {/* Backdrop click */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-lg bg-neutral-950 rounded-3xl p-6 sm:p-7 border border-neutral-800 shadow-2xl text-center my-auto overflow-hidden text-white"
        >
          {/* Top Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-neutral-900 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {/* Live Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-white text-xs font-semibold mb-5">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>Table {displayTable} &middot; Order Confirmed</span>
          </div>

          {/* Hero Icon & Title */}
          <div className="w-16 h-16 bg-neutral-900 border border-neutral-800 rounded-full flex items-center justify-center mx-auto mb-3.5 text-white shadow-xs">
            <CheckCircle2 size={36} strokeWidth={1.8} />
          </div>

          <h2
            className="text-2xl font-serif font-semibold text-white tracking-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            The kitchen has received your order
          </h2>
          <p className="text-xs text-neutral-400 font-light mt-1.5 max-w-xs mx-auto leading-relaxed">
            Your dishes are being prepared with artisanal care by the Executive Chef.
          </p>

          {/* Live Stepper Indicator */}
          <div className="my-5 p-4 bg-neutral-900/60 rounded-2xl border border-neutral-800 flex items-center justify-around text-xs font-medium">
            <div className="flex flex-col items-center text-white">
              <CheckCircle2 className="mb-1" size={18} />
              <span>Confirmed</span>
            </div>
            <div className="h-0.5 w-8 bg-neutral-700" />
            <div className="flex flex-col items-center text-neutral-300 animate-pulse">
              <Clock className="mb-1" size={18} />
              <span>Preparing</span>
            </div>
            <div className="h-0.5 w-8 bg-neutral-800" />
            <div className="flex flex-col items-center text-neutral-500">
              <UtensilsCrossed className="mb-1" size={18} />
              <span>Serving</span>
            </div>
          </div>

          {/* ACTION 1: Explore Services Pop-up Trigger */}
          <button
            type="button"
            onClick={onOpenServices}
            className="w-full py-3 px-4 bg-neutral-900 hover:bg-neutral-850 text-white border border-neutral-800 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-md transition-all active:scale-[0.98] mb-3 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="text-white shrink-0" size={16} />
              <span className="truncate">While your order is being prepared &rarr; Explore Services</span>
            </div>
            <ChevronRight size={16} className="shrink-0" />
          </button>

          {/* ACTION 2: Unlock Wallet 7% Cashback Banner */}
          <div className="w-full p-3.5 bg-neutral-900/80 rounded-2xl border border-neutral-800 flex items-center justify-between text-left mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neutral-800 text-white rounded-xl shadow-xs">
                <Wallet size={18} />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white">Unlock Your Wallet</h5>
                <p className="text-[10px] text-neutral-400 font-medium">
                  {cashbackClaimed
                    ? '7% instant cashback applied to your table bill!'
                    : 'Get 7% instant cashback on this bill'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClaimCashback}
              disabled={cashbackClaimed}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer ${
                cashbackClaimed
                  ? 'bg-neutral-800 text-neutral-400 cursor-default'
                  : 'bg-white hover:bg-neutral-200 text-black active:scale-95'
              }`}
            >
              {cashbackClaimed ? (
                <span className="inline-flex items-center gap-1">
                  <Check size={12} /> Claimed
                </span>
              ) : (
                'Claim 7%'
              )}
            </button>
          </div>

          {/* Secondary Actions */}
          <div className="flex items-center justify-center gap-4 text-xs text-neutral-400 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="hover:text-white font-medium transition-colors cursor-pointer"
            >
              Stay on Menu
            </button>
            {onViewActiveBill && (
              <>
                <span>&middot;</span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onViewActiveBill();
                  }}
                  className="hover:text-white font-medium transition-colors cursor-pointer"
                >
                  View Active Bill
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
