'use client';

import React from 'react';
import { Tag, Plus } from 'lucide-react';
import type { VenueLiveOffer } from '@/types/offers';
import { LiveOfferCard } from './LiveOfferCard';

interface LiveOffersListProps {
  offers: VenueLiveOffer[];
  isLoading: boolean;
  onToggleActive: (offer: VenueLiveOffer) => void;
  onDelete: (id: string, title: string) => void;
  onCreateFirstOffer: () => void;
}

export function LiveOffersList({
  offers,
  isLoading,
  onToggleActive,
  onDelete,
  onCreateFirstOffer,
}: LiveOffersListProps) {
  if (isLoading) {
    return (
      <div className="py-12 text-center text-xs text-neutral-400 flex flex-col items-center justify-center gap-2">
        <div className="w-5 h-5 rounded-full border-2 border-neutral-300 border-t-neutral-900 animate-spin" />
        <span>Loading venue offers...</span>
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 p-12 text-center space-y-3 bg-neutral-50/40">
        <div className="w-10 h-10 mx-auto rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-400">
          <Tag className="w-5 h-5" />
        </div>
        <div>
          <p className="font-serif text-base font-medium text-neutral-900">No Live Offers Configured</p>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-0.5">
            Publish your first deal or perk to display on the Guest Social Lobby.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateFirstOffer}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-semibold shadow-xs hover:bg-black transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create First Offer</span>
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      {offers.map((offer) => (
        <LiveOfferCard
          key={offer.id}
          offer={offer}
          onToggleActive={onToggleActive}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
