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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-3.5 bg-neutral-50/70 border-b border-neutral-100">
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
          className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
          title="Refresh offers"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>

        <button
          type="button"
          onClick={onToggleForm}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-neutral-900 hover:bg-black transition-all cursor-pointer shadow-xs active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{showCreateForm ? 'Cancel Form' : 'Publish Offer'}</span>
        </button>
      </div>
    </div>
  );
}
