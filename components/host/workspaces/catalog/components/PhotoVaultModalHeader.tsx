'use client';

import React from 'react';
import { Camera, Tag, X } from 'lucide-react';

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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-neutral-900 text-white shadow-xs">
          {isMoments ? <Camera className="w-4 h-4" /> : <Tag className="w-4 h-4" />}
        </div>
        <div>
          <h3 className="font-serif text-lg font-medium text-neutral-900">
            {isMoments ? 'Photo Vault & Events Ingestion' : 'Live Offers & Special Discounts'}
          </h3>
          <p className="text-xs text-neutral-500 font-light">
            {isMoments
              ? 'Sync live event highlights, cocktail rituals & moments to Guest Social Lobby.'
              : 'Manage active discounts, happy hours & room deals visible in real-time to visiting guests.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 p-1 bg-neutral-200/60 rounded-xl border border-neutral-200/80">
          <button
            type="button"
            onClick={() => onTabChange('moments')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isMoments ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Moments</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange('offers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              !isMoments ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Live Offers</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
