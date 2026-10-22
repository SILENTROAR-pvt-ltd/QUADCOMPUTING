'use client';

import React from 'react';
import { CalendarHeart, Tag, X } from 'lucide-react';

interface PhotoVaultModalHeaderProps {
  activeTab: 'moments' | 'offers';
  onTabChange: (tab: 'moments' | 'offers') => void;
  onClose: () => void;
}

export function PhotoVaultModalHeader({
  activeTab,
  onTabChange,
  onClose,
}: PhotoVaultModalHeaderProps) {
  const isMoments = activeTab === 'moments';

  return (
    <div className="flex flex-col justify-between gap-3 border-b border-neutral-100 bg-neutral-50/50 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
      <div className="flex items-center gap-3">
        <div className="shrink-0 rounded-xl bg-neutral-900 p-2.5 text-white shadow-sm">
          {isMoments ? <CalendarHeart className="w-4 h-4" /> : <Tag className="w-4 h-4" />}
        </div>
        <div>
          <h3 className="font-serif text-lg font-medium text-neutral-900">
            {isMoments ? 'Live Events & Guest Lists' : 'Live Offers & Special Discounts'}
          </h3>
          <p className="text-xs text-neutral-500 font-light">
            {isMoments
              ? 'Publish an event once: guests see it in the lounge and join its guest list. Manage it under My Guests too.'
              : 'Manage active discounts, happy hours & room deals visible in real-time to visiting guests.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 p-1 bg-neutral-200/60 rounded-xl border border-neutral-200/80">
          <button
            type="button"
            onClick={() => onTabChange('moments')}
            className={`flex h-10 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition-all cursor-pointer ${
              isMoments ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <CalendarHeart className="w-4 h-4" />
            <span>Live Events</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange('offers')}
            className={`flex h-10 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition-all cursor-pointer ${
              !isMoments ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Live Offers</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
