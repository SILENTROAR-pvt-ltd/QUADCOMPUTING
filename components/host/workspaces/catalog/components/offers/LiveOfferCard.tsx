'use client';

import React from 'react';
import { Sparkles, Trash2, Clock, Utensils, Bed, Layers } from 'lucide-react';
import type { VenueLiveOffer } from '@/types/offers';

interface LiveOfferCardProps {
  offer: VenueLiveOffer;
  onToggleActive: (offer: VenueLiveOffer) => void;
  onDelete: (id: string, title: string) => void;
}

export function LiveOfferCard({ offer, onToggleActive, onDelete }: LiveOfferCardProps) {
  const isRoom = offer.category === 'room';
  const isFood = offer.category === 'food';

  return (
    <div
      className={`rounded-2xl border p-4 transition-all duration-200 flex flex-col justify-between shadow-2xs ${
        offer.is_active
          ? 'bg-white border-neutral-200/90 hover:border-neutral-300'
          : 'bg-neutral-50/70 border-neutral-200/60 opacity-60'
      }`}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200/70">
              {isRoom ? <Bed className="w-3 h-3 text-indigo-600" /> : isFood ? <Utensils className="w-3 h-3 text-emerald-600" /> : <Layers className="w-3 h-3 text-neutral-600" />}
              <span className="capitalize">{offer.category}</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/70">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>{offer.discount_badge}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => onToggleActive(offer)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
              offer.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70' : 'bg-neutral-200 text-neutral-500'
            }`}
            title={offer.is_active ? 'Click to deactivate' : 'Click to activate'}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${offer.is_active ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
            <span>{offer.is_active ? 'Active' : 'Paused'}</span>
          </button>
        </div>

        <div>
          <h4 className="font-serif text-base font-medium text-neutral-900 tracking-tight leading-snug">
            {offer.title}
          </h4>
          {offer.description && (
            <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{offer.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 mt-3 border-t border-neutral-100 text-[11px] text-neutral-400">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {offer.valid_until
            ? `Expires ${new Date(offer.valid_until).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`
            : 'No Expiry'}
        </span>
        <button
          type="button"
          onClick={() => onDelete(offer.id, offer.title)}
          className="p-1 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          title="Delete Offer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
