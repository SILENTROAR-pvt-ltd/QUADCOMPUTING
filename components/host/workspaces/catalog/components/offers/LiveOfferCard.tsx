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
      className={`flex flex-col justify-between overflow-hidden rounded-2xl border shadow-sm transition-all duration-200 ${
        offer.is_active
          ? 'bg-white border-neutral-200/90 hover:border-neutral-300'
          : 'bg-neutral-50/70 border-neutral-200/60 opacity-60'
      }`}
    >
      {offer.image_url && (
        // eslint-disable-next-line @next/next/no-img-element -- the offer's stored photo
        <img src={offer.image_url} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />
      )}
      <div className="space-y-2 px-4 pt-4">
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
            className={`inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold transition-all cursor-pointer ${
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

      <div className="mx-4 mb-3 mt-3 flex items-center justify-between border-t border-neutral-100 pt-2 text-[11px] text-neutral-400">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {offer.valid_until
            ? `Expires ${new Date(offer.valid_until).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`
            : 'No Expiry'}
        </span>
        <button
          type="button"
          onClick={() => onDelete(offer.id, offer.title)}
          className="grid h-10 w-10 cursor-pointer place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
          title="Delete offer"
          aria-label={`Delete offer ${offer.title}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
