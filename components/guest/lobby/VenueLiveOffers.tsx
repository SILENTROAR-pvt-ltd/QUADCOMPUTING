'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sparkles, Tag, Utensils, Bed, Layers, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { VenueLiveOffer } from '@/types/offers';
import { createClient } from '@/lib/supabase/client';
import { OfferActionSheet } from '@/components/guest/offers/OfferActionSheet';

interface VenueLiveOffersProps {
  venueId?: string;
  tableNumber?: string;
  /** Rendered when the venue has no live offers (default: nothing). */
  emptyState?: React.ReactNode;
}

export function VenueLiveOffers({
  venueId = '',
  tableNumber = 'T-01',
  emptyState = null,
}: VenueLiveOffersProps) {
  const [offers, setOffers] = useState<VenueLiveOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [openOffer, setOpenOffer] = useState<VenueLiveOffer | null>(null);

  const fetchActiveOffers = useCallback(async () => {
    try {
      const res = await fetch(`/api/venue/offers?venue_id=${encodeURIComponent(venueId)}&active_only=true`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.offers)) {
          setOffers(json.offers);
        }
      }
    } catch (err) {
      console.warn('[VenueLiveOffers] Fetch note:', err);
    } finally {
      setIsLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    fetchActiveOffers();

    // Realtime Postgres sync
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`venue_live_offers_${venueId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'venue_live_offers',
          filter: `venue_id=eq.${venueId}`,
        },
        () => {
          fetchActiveOffers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId, fetchActiveOffers]);

  const filteredOffers = useMemo(() => {
    if (activeCategory === 'all') return offers;
    return offers.filter((o) => o.category === activeCategory);
  }, [offers, activeCategory]);

  if (!isLoading && offers.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <section className="space-y-4 animate-in fade-in duration-300">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-300/80 shadow-2xs">
              <Sparkles className="w-3 h-3 text-amber-600 fill-amber-500 animate-pulse" />
              Live Venue Specials
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-neutral-900 mt-1">
            Exclusive Offers & Deals
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 font-light mt-0.5">
            Active happy hours, complimentary perks & discounts for dining and staying guests.
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {[
            { key: 'all', label: 'All Specials' },
            { key: 'food', label: 'Food & Drinks' },
            { key: 'room', label: 'Room Deals' },
          ].map((cat) => {
            const isSelected = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCategory(cat.key)}
                className={`h-8 px-3 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                    : 'bg-white border-neutral-200/90 text-neutral-600 hover:text-neutral-900 hover:border-neutral-300 shadow-2xs'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Offers Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-3xl border border-neutral-200/80 bg-neutral-100/60 p-6 h-48 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOffers.map((offer) => {
            const isRoom = offer.category === 'room';
            const isFood = offer.category === 'food';

            return (
              <div
                key={offer.id}
                className="group relative rounded-3xl border border-neutral-200/90 bg-white p-5 sm:p-6 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden"
              >
                {/* Background ambient gradient flare */}
                <div className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br from-amber-200/30 to-rose-200/20 blur-2xl group-hover:scale-125 transition-transform duration-500" />

                <div className="relative space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Category */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200/70">
                      {isRoom ? (
                        <Bed className="w-3 h-3 text-indigo-600" />
                      ) : isFood ? (
                        <Utensils className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Layers className="w-3 h-3 text-neutral-600" />
                      )}
                      <span className="capitalize">{isFood ? 'Food & Drink' : isRoom ? 'Stay & Suite' : 'General'}</span>
                    </span>

                    {/* Striking Discount Badge */}
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-900 border border-amber-500/30 shadow-2xs">
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      <span>{offer.discount_badge}</span>
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-serif text-lg sm:text-xl font-medium tracking-tight text-neutral-900 leading-snug">
                      {offer.title}
                    </h3>
                    {offer.description && (
                      <p className="text-xs sm:text-[13px] text-neutral-600 font-light leading-relaxed mt-1.5 line-clamp-3">
                        {offer.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Action Row */}
                <div className="relative pt-4 mt-4 border-t border-neutral-100 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400 font-mono">
                    <Clock className="w-3 h-3" />
                    <span>
                      {offer.valid_until
                        ? `Valid till ${new Date(offer.valid_until).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`
                        : 'Active Today'}
                    </span>
                  </span>

                  {isFood ? (
                    <Link
                      href={`/menu?table=${encodeURIComponent(tableNumber)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-black text-white font-semibold text-xs shadow-xs transition-all active:scale-95"
                    >
                      <span>Order on Menu</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOpenOffer(offer)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-black text-white font-semibold text-xs shadow-xs transition-all cursor-pointer active:scale-95"
                    >
                      <span>Claim Deal</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {openOffer && (
        <OfferActionSheet venueId={venueId} tableNumber={tableNumber} offer={openOffer} onClose={() => setOpenOffer(null)} />
      )}
    </section>
  );
}
