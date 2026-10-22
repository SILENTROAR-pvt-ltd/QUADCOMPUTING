'use client';

import React from 'react';
import { Plus, RefreshCw } from 'lucide-react';

interface LiveOffersHeaderProps {
  totalOffers: number;
  activeOffers: number;
  isRefreshing: boolean;
  showCreateForm: boolean;
  onRefresh: () => void;
  onToggleForm: () => void;
}

export function LiveOffersHeader({
  totalOffers,
  activeOffers,
  isRefreshing,
  showCreateForm,
  onRefresh,
  onToggleForm,
}: LiveOffersHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-neutral-100 bg-neutral-50/70 px-4 py-3 sm:px-6">
      <div className="flex items-center gap-2 text-xs text-neutral-600">
        <span className="font-semibold text-neutral-900">{totalOffers}</span> Total Offers
        <span>·</span>
        <span className="text-emerald-700 font-semibold">{activeOffers} Active Live</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          title="Refresh offers"
          aria-label="Refresh offers"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>

        <button
          type="button"
          onClick={onToggleForm}
          className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-neutral-900 px-3.5 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-black active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{showCreateForm ? 'Cancel Form' : 'Publish Offer'}</span>
        </button>
      </div>
    </div>
  );
}
