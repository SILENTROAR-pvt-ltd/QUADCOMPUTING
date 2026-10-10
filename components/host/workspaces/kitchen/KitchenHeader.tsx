'use client';

import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import type { KitchenHeaderProps } from './types';

export function KitchenHeader({ soundEnabled, onToggleSound }: KitchenHeaderProps) {
  return (
    <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-zinc-950">
            Kitchen Operations (KOT)
          </h1>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync
          </div>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Live order dispatch, chef preparation queue, and delivery turnaround tracking.
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onToggleSound}
          className={`h-10 px-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
            soundEnabled
              ? 'border-neutral-900 bg-neutral-900 text-white'
              : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
          }`}
        >
          {soundEnabled ? (
            <>
              <Volume2 className="h-4 w-4 text-white" />
              <span>Sound On</span>
            </>
          ) : (
            <>
              <VolumeX className="h-4 w-4 text-zinc-400" />
              <span>Sound Off</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
