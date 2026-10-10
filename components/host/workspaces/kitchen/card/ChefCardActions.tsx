'use client';

import React from 'react';
import { Play, CheckCircle2, Bell, RotateCcw } from 'lucide-react';
import type { KitchenTicket } from '@/lib/utils/kitchen';

export function ChefCardActions({
  status,
  onStatusChange,
}: {
  status: KitchenTicket['status'];
  onStatusChange: (status: KitchenTicket['status']) => void;
}) {
  return (
    <div className="p-3 border-t border-neutral-100 bg-white shrink-0">
      {status === 'PENDING' && (
        <button type="button" onClick={() => onStatusChange('PREPARING')} className="w-full h-9 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:scale-[0.99] text-white text-xs font-semibold tracking-wide transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer">
          <Play className="h-3.5 w-3.5 fill-white shrink-0" />
          <span>Start Preparing</span>
        </button>
      )}
      {status === 'PREPARING' && (
        <button type="button" onClick={() => onStatusChange('READY')} className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-semibold tracking-wide transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Mark Plated & Ready</span>
        </button>
      )}
      {status === 'READY' && (
        <button type="button" onClick={() => onStatusChange('SERVED')} className="w-full h-9 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:scale-[0.99] text-white text-xs font-semibold tracking-wide transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer">
          <Bell className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>Mark Delivered / Served</span>
        </button>
      )}

      {status === 'SERVED' && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1.5 rounded-xl flex-1 min-w-0">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Delivered to Guest</span>
          </div>
          <button
            type="button"
            onClick={() => onStatusChange('READY')}
            className="h-8 px-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer shrink-0"
          >
            <RotateCcw className="h-3 w-3 shrink-0" />
            <span>Re-open</span>
          </button>
        </div>
      )}
    </div>
  );
}
