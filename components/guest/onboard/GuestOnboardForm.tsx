'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface GuestOnboardFormProps {
  guestName: string;
  setGuestName: (name: string) => void;
  tableNumber: string;
  setTableNumber: (table: string) => void;
  availableTables: string[];
  isFormValid: boolean;
  isLoading: boolean;
  errorMessage: string;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function GuestOnboardForm({
  guestName,
  setGuestName,
  tableNumber,
  setTableNumber,
  availableTables,
  isFormValid,
  isLoading,
  errorMessage,
  onSubmit,
}: GuestOnboardFormProps) {
  return (
    <form onSubmit={onSubmit} className="w-full text-left space-y-4">
      {/* Field 1: Guest Name */}
      <div>
        <label className="block text-[9px] font-medium tracking-[0.3em] text-neutral-400 uppercase mb-2 text-left w-full font-mono">
          Guest Name / Handle
        </label>
        <input
          type="text"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="e.g. Alex"
          maxLength={32}
          autoFocus
          autoComplete="off"
          className="w-full px-4 py-3.5 rounded-xl bg-white/5 backdrop-blur-md border border-neutral-800 text-white placeholder:text-neutral-600 text-sm focus:outline-none focus:border-white focus:bg-white/10 transition-all shadow-inner"
        />
      </div>

      {/* Field 2: Table Selection */}
      <div>
        <label className="block text-[9px] font-medium tracking-[0.3em] text-neutral-400 uppercase mb-2 text-left w-full font-mono">
          Table Selection
        </label>
        <input
          type="text"
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
          placeholder="Table No. (e.g. T-02)"
          maxLength={16}
          autoComplete="off"
          className="w-full px-4 py-3.5 rounded-xl bg-white/5 backdrop-blur-md border border-neutral-800 text-white placeholder:text-neutral-600 text-sm focus:outline-none focus:border-white focus:bg-white/10 transition-all shadow-inner mb-3"
        />

        {/* Table Quick-Select Micro-Chips */}
        <div className="flex flex-wrap gap-1.5">
          {availableTables.map((tbl) => {
            const isSelected = tableNumber.trim().toUpperCase() === tbl.toUpperCase();
            return (
              <button
                key={tbl}
                type="button"
                onClick={() => setTableNumber(tbl)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white text-neutral-950 font-semibold border-white shadow-md'
                    : 'bg-white/5 hover:bg-white/15 border-neutral-800 text-neutral-300'
                }`}
              >
                {tbl}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {errorMessage && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-rose-400 font-normal pt-1 text-center"
          >
            {errorMessage}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Primary CTA Button */}
      <button
        type="submit"
        disabled={!isFormValid || isLoading}
        className="w-full py-4 mt-5 bg-white text-neutral-950 hover:bg-neutral-200 font-medium text-xs tracking-[0.25em] uppercase rounded-xl shadow-[0_12px_30px_rgba(0,0,0,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <div className="h-4 w-4 border-2 border-neutral-950/30 border-t-neutral-950 animate-spin rounded-full" />
            <span>Preparing Experience...</span>
          </>
        ) : (
          <>
            <span>Proceed to Menu</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}
