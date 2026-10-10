'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, Wallet } from 'lucide-react';

interface OrderSuccessModalProps {
  isOpen: boolean;
  tableNumber: string;
  businessName: string;
  onClose: () => void;
  onExploreServices: () => void;
  isAddon?: boolean;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  isOpen,
  tableNumber,
  businessName,
  onClose,
  onExploreServices,
  isAddon = false,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-between p-8 sm:p-12 text-center animate-in fade-in duration-300 pb-[calc(env(safe-area-inset-bottom,20px)+2rem)]">
          {/* Top Table Pill */}
          <div className="w-full flex justify-center pt-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-1.5 text-xs text-zinc-600 font-medium tracking-wide">
              <span className="h-1.5 w-1.5 rounded-full bg-black" />
              {tableNumber} • {isAddon ? 'Add-on Confirmed' : 'Confirmed'}
            </span>
          </div>

          {/* Center Editorial Message */}
          <div className="max-w-md mx-auto space-y-5 my-auto w-full">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-black">
              <Check className="h-8 w-8 stroke-[2]" />
            </div>

            <div className="space-y-2">
              <h2 className="font-editorial text-3xl sm:text-4xl font-normal text-zinc-950 tracking-tight">
                {isAddon ? 'Add-on sent to the kitchen.' : 'The kitchen has received your order.'}
              </h2>
              <p className="text-sm text-zinc-500 font-light max-w-sm mx-auto leading-relaxed pt-1">
                {isAddon
                  ? `Your new items have been appended to Table ${tableNumber}'s active bill and dispatched to the Executive Chef.`
                  : `Your dishes are being prepared with artisanal care by the Executive Chef for ${tableNumber}.`}
              </p>
            </div>

            {/* Premium CTA Buttons */}
            <div className="pt-6 space-y-3">
              <button
                onClick={onExploreServices}
                className="w-full inline-flex items-center justify-center gap-2.5 rounded-full bg-black py-4 px-8 text-xs font-medium uppercase tracking-[0.2em] text-white hover:bg-zinc-800 transition-colors shadow-lg active:scale-95 cursor-pointer"
              >
                <span>While your order is being prepared → Explore Services</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={onClose}
                className="w-full py-2 text-xs text-zinc-400 hover:text-black transition-colors cursor-pointer"
              >
                Stay on Menu / View Active Bill
              </button>
            </div>

            {/* Wallet Cashback Banner */}
            <div className="pt-8">
              <div
                onClick={onExploreServices}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 p-4 shadow-sm transition-transform active:scale-[0.98] hover:border-neutral-700"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800 text-white">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-semibold text-white tracking-tight">Unlock Your Wallet</h4>
                    <p className="text-xs text-neutral-400 font-medium">Get 7% cashback on this order</p>
                  </div>
                </div>
                <div className="flex items-center text-neutral-400">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Subtle Brand */}
          <div className="pb-2">
            <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-400">
              {businessName}
            </p>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
